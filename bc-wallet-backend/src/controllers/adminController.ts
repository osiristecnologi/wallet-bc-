import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';
import { transactionService } from '../services/transactionService';

export const adminController = {
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT u.id, u.nome, u.email, u.telefone, u.created_at, u.is_active, u.last_login_at,
               w.balance
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
      `;
      const params: any[] = [];
      
      if (search) {
        query += ` WHERE u.email ILIKE $1 OR u.nome ILIKE $1`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), offset);

      const result = await db.query(query, params);

      const countResult = await db.query(
        `SELECT COUNT(*) FROM users ${search ? `WHERE email ILIKE $1 OR nome ILIKE $1` : ''}`,
        search ? [`%${search}%`] : []
      );

      res.json({
        success: true,
        data: {
          users: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].count),
          },
        },
      });
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch users',
      });
    }
  },

  async getTreasury(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await db.query('SELECT * FROM treasury WHERE id = 1');
      
      // Calcular total em circulação
      const walletsResult = await db.query('SELECT COALESCE(SUM(balance), 0) as total FROM wallets');
      
      res.json({
        success: true,
        data: {
          ...result.rows[0],
          totalInCirculation: walletsResult.rows[0].total,
        },
      });
    } catch (error: any) {
      console.error('Get treasury error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch treasury',
      });
    }
  },

  async issueBC(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { toUserId, amount, reason } = req.body;
      const adminUserId = req.user?.userId;

      if (!toUserId || !amount || parseFloat(amount) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid input: toUserId and positive amount are required',
        });
        return;
      }

      const result = await transactionService.issueBC({
        toUserId,
        amount,
        adminUserId,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Issue BC error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to issue BC',
      });
    }
  },

  async redeemBCFromUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { fromUserId, amount, reason } = req.body;

      if (!fromUserId || !amount || parseFloat(amount) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid input: fromUserId and positive amount are required',
        });
        return;
      }

      const result = await transactionService.redeemBC({
        fromUserId,
        amount,
        reason: reason || 'Admin redemption',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Admin redeem BC error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to redeem BC',
      });
    }
  },

  async toggleUserStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const result = await db.query(
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, nome, email, is_active',
        [isActive, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Audit log
      await db.query(
        `INSERT INTO audit_logs (actor, actor_type, action, resource_type, resource_id, metadata)
         VALUES ($1, 'admin', 'USER_STATUS_CHANGED', 'user', $2, $3)`,
        [req.user?.userId, userId, JSON.stringify({ isActive, changedBy: req.user?.userId })]
      );

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update user status',
      });
    }
  },
};
