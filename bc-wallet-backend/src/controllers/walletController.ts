import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { walletService } from '../services/walletService';
import { db } from '../config/database';

export const walletController = {
  async getWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      const wallet = await walletService.getWalletByUserId(userId);

      res.json({
        success: true,
        data: wallet,
      });
    } catch (error: any) {
      console.error('Get wallet error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Wallet not found',
      });
    }
  },

  async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const balance = await walletService.getBalance(userId);

      res.json({
        success: true,
        data: {
          balance,
          formatted: parseFloat(balance).toFixed(2),
        },
      });
    } catch (error: any) {
      console.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch balance',
      });
    }
  },

  async getTransactionHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { limit = '20', offset = '0' } = req.query;

      const transactions = await walletService.getTransactionHistory(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transaction history',
      });
    }
  },

  async getRecentTransactions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const limit = 10; // Últimas 10 transações

      const transactions = await walletService.getTransactionHistory(userId, limit, 0);

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
        },
      });
    } catch (error: any) {
      console.error('Get recent transactions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch recent transactions',
      });
    }
  },

  async validateBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const isValid = await walletService.validateBalanceConsistency();

      res.json({
        success: true,
        data: {
          isValid,
          message: isValid 
            ? 'Balance consistency validated' 
            : 'Balance inconsistency detected',
        },
      });
    } catch (error: any) {
      console.error('Validate balance error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to validate balance',
      });
    }
  },

  // Admin: Ver carteira de um usuário específico
  async getWalletByUserId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const result = await db.query(
        `SELECT w.*, u.nome, u.email, u.telefone, u.created_at as user_created_at
         FROM wallets w
         JOIN users u ON w.user_id = u.id
         WHERE w.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
        return;
      }

      // Contar transações do usuário
      const txCount = await db.query(
        `SELECT COUNT(*) as total 
         FROM transactions t
         WHERE t.from_wallet = $1 OR t.to_wallet = $1`,
        [result.rows[0].id]
      );

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          transactionCount: parseInt(txCount.rows[0].total),
        },
      });
    } catch (error: any) {
      console.error('Get wallet by user ID error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch wallet',
      });
    }
  },

  // Admin: Listar todas as carteiras
  async getAllWallets(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '50', search } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT w.*, u.nome, u.email, u.telefone, u.created_at as user_created_at,
               (SELECT COUNT(*) FROM transactions t WHERE t.from_wallet = w.id OR t.to_wallet = w.id) as tx_count
        FROM wallets w
        JOIN users u ON w.user_id = u.id
      `;

      const params: any[] = [];
      
      if (search) {
        query += ` WHERE u.email ILIKE $1 OR u.nome ILIKE $1 OR u.telefone ILIKE $1`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY w.balance DESC, u.nome ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), offset);

      const result = await db.query(query, params);

      // Count total
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        ${search ? `WHERE u.email ILIKE $1 OR u.nome ILIKE $1 OR u.telefone ILIKE $1` : ''}
      `;
      
      const countResult = await db.query(countQuery, search ? [`%${search}%`] : []);

      res.json({
        success: true,
        data: {
          wallets: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
          },
        },
      });
    } catch (error: any) {
      console.error('Get all wallets error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch wallets',
      });
    }
  },

  // Admin: Estatísticas gerais das carteiras
  async getWalletStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Total de carteiras
      const totalWallets = await db.query('SELECT COUNT(*) as total FROM wallets');

      // Saldo total em circulação
      const totalBalance = await db.query('SELECT COALESCE(SUM(balance), 0) as total FROM wallets');

      // Maior saldo
      const maxBalance = await db.query(
        `SELECT w.balance, u.nome, u.email 
         FROM wallets w 
         JOIN users u ON w.user_id = u.id 
         ORDER BY w.balance DESC 
         LIMIT 1`
      );

      // Média de saldo
      const avgBalance = await db.query('SELECT AVG(balance) as average FROM wallets');

      // Carteiras com saldo zero
      const zeroBalance = await db.query(
        `SELECT COUNT(*) as total FROM wallets WHERE balance = 0`
      );

      // Carteiras com saldo > 0
      const activeWallets = await db.query(
        `SELECT COUNT(*) as total FROM wallets WHERE balance > 0`
      );

      // Top 10 maiores saldos
      const top10 = await db.query(
        `SELECT w.balance, u.nome, u.email, u.created_at
         FROM wallets w
         JOIN users u ON w.user_id = u.id
         WHERE w.balance > 0
         ORDER BY w.balance DESC
         LIMIT 10`
      );

      res.json({
        success: true,
        data: {
          totalWallets: parseInt(totalWallets.rows[0].total),
          totalBalance: totalBalance.rows[0].total,
          averageBalance: avgBalance.rows[0].average || 0,
          maxBalance: maxBalance.rows[0] || null,
          zeroBalance: parseInt(zeroBalance.rows[0].total),
          activeWallets: parseInt(activeWallets.rows[0].total),
          top10: top10.rows,
        },
      });
    } catch (error: any) {
      console.error('Get wallet stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch wallet stats',
      });
    }
  },
};
