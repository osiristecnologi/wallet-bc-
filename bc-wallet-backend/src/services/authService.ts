import { db } from '../config/database';
import { hashPassword, verifyPassword, hashPin } from '../utils/password';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt';
import { getRedisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

interface RegisterInput {
  nome: string;
  email: string;
  telefone?: string;
  password: string;
  pin: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async register(input: RegisterInput) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
      }

      const passwordHash = await hashPassword(input.password);
      const pinHash = await hashPin(input.pin);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (nome, email, telefone, password_hash, pin_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email, telefone, created_at`,
        [input.nome, input.email, input.telefone, passwordHash, pinHash]
      );

      const user = userResult.rows[0];

      // Create wallet
      await client.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, 0)',
        [user.id]
      );

      await client.query('COMMIT');

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (actor, actor_type, action, resource_type, resource_id, metadata)
         VALUES ($1, 'system', 'USER_REGISTERED', 'user', $2, $3)`,
        [user.id, user.id, JSON.stringify({ email: input.email })]
      );

      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        created_at: user.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    // Check account lockout
    const userResult = await db.query(
      `SELECT id, nome, email, password_hash, failed_login_attempts, locked_until, is_active
       FROM users WHERE email = $1`,
      [input.email]
    );

    if (userResult.rows.length === 0) {
      await this.recordFailedAttempt(input.email, ipAddress);
      throw new Error('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('Account is temporarily locked. Try again later.');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isValidPassword = await verifyPassword(user.password_hash, input.password);

    if (!isValidPassword) {
      await this.recordFailedAttempt(input.email, ipAddress);
      await this.incrementFailedAttempts(user.id);
      throw new Error('Invalid credentials');
    }

    // Clear failed attempts on successful login
    await db.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshTokenHash, expiresAt, JSON.stringify({ ipAddress, userAgent })]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_type, action, resource_type, resource_id, metadata, ip_address, user_agent)
       VALUES ($1, 'user', 'USER_LOGIN', 'user', $2, $3, $4, $5)`,
      [user.id, user.id, JSON.stringify({ email: input.email }), ipAddress, userAgent]
    );

    return {
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  },

  async refreshToken(refreshToken: string) {
    const payload = await import('../utils/jwt').then(m => m.verifyRefreshToken(refreshToken));
    
    const refreshTokenHash = hashToken(refreshToken);
    
    // Check if token exists and is not revoked
    const tokenResult = await db.query(
      `SELECT id, user_id, expires_at, revoked 
       FROM refresh_tokens 
       WHERE token_hash = $1 AND user_id = $2`,
      [refreshTokenHash, payload.userId]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.revoked) {
      throw new Error('Refresh token has been revoked');
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Generate new tokens
    const userResult = await db.query(
      'SELECT email FROM users WHERE id = $1',
      [payload.userId]
    );

    const newAccessToken = generateAccessToken(payload.userId, userResult.rows[0].email);
    const newRefreshToken = generateRefreshToken(payload.userId, userResult.rows[0].email);

    // Revoke old refresh token and store new one
    await db.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1',
      [tokenRecord.id]
    );

    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [payload.userId, newRefreshTokenHash, expiresAt]
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);
      await db.query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1 AND user_id = $2',
        [refreshTokenHash, userId]
      );
    } else {
      // Revoke all refresh tokens for user
      await db.query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
        [userId]
      );
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (actor, actor_type, action, resource_type, resource_id)
       VALUES ($1, 'user', 'USER_LOGOUT', 'user', $2)`,
      [userId, userId]
    );
  },

  async recordFailedAttempt(email: string, ipAddress?: string) {
    await db.query(
      'INSERT INTO failed_login_attempts (email, ip_address) VALUES ($1, $2)',
      [email, ipAddress]
    );
  },

  async incrementFailedAttempts(userId: string) {
    const result = await db.query(
      `UPDATE users 
       SET failed_login_attempts = failed_login_attempts + 1
       WHERE id = $1
       RETURNING failed_login_attempts`,
      [userId]
    );

    const attempts = result.rows[0].failed_login_attempts;

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await db.query(
        'UPDATE users SET locked_until = $1 WHERE id = $2',
        [lockedUntil, userId]
      );
    }
  },
};
