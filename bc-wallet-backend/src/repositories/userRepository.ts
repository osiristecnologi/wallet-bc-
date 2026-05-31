import { db } from '../config/database';
import { User } from '../types';

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await db.query(
      'SELECT id, nome, email, telefone, is_active, created_at, last_login_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(data: { nome: string; email: string; telefone?: string; password_hash: string; pin_hash: string }): Promise<User> {
    const result = await db.query(
      `INSERT INTO users (nome, email, telefone, password_hash, pin_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.nome, data.email, data.telefone, data.password_hash, data.pin_hash]
    );
    return result.rows[0];
  },

  async updateFailedAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void> {
    await db.query(
      'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
      [attempts, lockedUntil || null, id]
    );
  },

  async updateLastLogin(id: string): Promise<void> {
    await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [id]
    );
  },

  async toggleStatus(id: string, isActive: boolean): Promise<User> {
    const result = await db.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, id]
    );
    return result.rows[0];
  },

  async findAll(search?: string, limit: number = 20, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const conditions = search ? 'WHERE email ILIKE $1 OR nome ILIKE $1' : '';
    const params = search ? [`%${search}%`] : [];
    
    const usersResult = await db.query(
      `SELECT id, nome, email, telefone, is_active, created_at, last_login_at 
       FROM users ${conditions}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users ${conditions}`,
      params
    );

    return {
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  },
};
