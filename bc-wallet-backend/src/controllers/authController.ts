import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { nome, email, telefone, password, pin } = req.body;

      // Validate PIN (6 digits)
      if (!/^\d{6}$/.test(pin)) {
        res.status(400).json({ error: 'PIN must be 6 digits' });
        return;
      }

      const user = await authService.register({
        nome,
        email,
        telefone,
        password,
        pin,
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Registration failed',
      });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('user-agent');

      const result = await authService.login(
        { email, password },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Login failed',
      });
    }
  },

  refreshToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token required',
        });
        return;
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: error.message || 'Token refresh failed',
      });
    }
  },

  logout: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const { refreshToken } = req.body;

      await authService.logout(userId, refreshToken);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Logout failed',
      });
    }
  },

  me: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;

      const result = await import('../config/database').then(db =>
        db.db.query(
          `SELECT u.id, u.nome, u.email, u.telefone, u.created_at, u.last_login_at,
                  w.balance
           FROM users u
           JOIN wallets w ON u.id = w.user_id
           WHERE u.id = $1`,
          [userId]
        )
      );

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user data',
      });
    }
  },
};
