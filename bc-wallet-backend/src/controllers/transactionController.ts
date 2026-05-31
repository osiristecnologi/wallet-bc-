import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { transactionService } from '../services/transactionService';
import { walletService } from '../services/walletService';
import { db } from '../config/database';

interface TransactionQueryParams {
  page?: string;
  limit?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const transactionController = {
  async issue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { toUserId, amount, reason } = req.body;
      const adminUserId = req.user?.userId;

      // Validações
      if (!toUserId) {
        res.status(400).json({
          success: false,
          error: 'toUserId is required',
        });
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than zero',
        });
        return;
      }

      const result = await transactionService.issueBC({
        toUserId,
        amount: amount.toString(),
        adminUserId,
      });

      res.status(201).json({
        success: true,
        message: 'BC issued successfully',
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

  async redeem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { amount, reason } = req.body;
      const fromUserId = req.user?.userId;

      // Validações
      if (!amount || parseFloat(amount) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than zero',
        });
        return;
      }

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Reason is required',
        });
        return;
      }

      // Verificar saldo do usuário
      const userBalance = await walletService.getBalance(fromUserId);
      if (parseFloat(userBalance) < parseFloat(amount)) {
        res.status(400).json({
          success: false,
          error: 'Insufficient balance',
        });
        return;
      }

      const result = await transactionService.redeemBC({
        fromUserId,
        amount: amount.toString(),
        reason: reason.trim(),
      });

      res.json({
        success: true,
        message: 'BC redeemed successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Redeem BC error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to redeem BC',
      });
    }
  },

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const {
        page = '1',
        limit = '20',
        type,
        status,
        startDate,
        endDate,
      } = req.query as TransactionQueryParams;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filtros do usuário (só pode ver suas próprias transações)
      conditions.push(`(fw.user_id = $${paramIndex++} OR tw.user_id = $${paramIndex++})`);
      params.push(userId, userId);

      if (type) {
        conditions.push(`t.type = $${paramIndex++}`);
        params.push(type);
      }

      if (status) {
        conditions.push(`t.status = $${paramIndex++}`);
        params.push(status);
      }

      if (startDate) {
        conditions.push(`t.created_at >= $${paramIndex++}`);
        params.push(new Date(startDate));
      }

      if (endDate) {
        conditions.push(`t.created_at <= $${paramIndex++}`);
        params.push(new Date(endDate));
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countResult = await db.query(
        `SELECT COUNT(DISTINCT t.id) as total 
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get transactions
      const transactionsResult = await db.query(
        `SELECT DISTINCT t.*, 
                fw.user_id as from_user_id,
                tw.user_id as to_user_id,
                fu.nome as from_user_name,
                tu.nome as to_user_name,
                CASE 
                  WHEN fw.user_id = $1 THEN 'debit'
                  WHEN tw.user_id = $1 THEN 'credit'
                END as flow_type
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         LEFT JOIN users fu ON fw.user_id = fu.id
         LEFT JOIN users tu ON tw.user_id = tu.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, userId, parseInt(limit), offset]
      );

      const totalPage = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          transactions: transactionsResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPage,
          },
        },
      });
    } catch (error: any) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transaction history',
      });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const result = await db.query(
        `SELECT t.*, 
                fw.user_id as from_user_id,
                tw.user_id as to_user_id,
                fu.nome as from_user_name,
                fu.email as from_user_email,
                tu.nome as to_user_name,
                tu.email as to_user_email
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         LEFT JOIN users fu ON fw.user_id = fu.id
         LEFT JOIN users tu ON tw.user_id = tu.id
         WHERE t.id = $1 AND (fw.user_id = $2 OR tw.user_id = $2)`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Get transaction by ID error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transaction',
      });
    }
  },

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      // Total de transações
      const totalResult = await db.query(
        `SELECT COUNT(*) as total 
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         WHERE fw.user_id = $1 OR tw.user_id = $1`,
        [userId]
      );

      // Total recebido (créditos)
      const receivedResult = await db.query(
        `SELECT COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         JOIN wallets tw ON t.to_wallet = tw.id
         WHERE tw.user_id = $1 AND t.status = 'completed'`,
        [userId]
      );

      // Total gasto/resgatado (débitos)
      const spentResult = await db.query(
        `SELECT COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         JOIN wallets fw ON t.from_wallet = fw.id
         WHERE fw.user_id = $1 AND t.status = 'completed'`,
        [userId]
      );

      // Transações por tipo
      const byTypeResult = await db.query(
        `SELECT t.type, COUNT(*) as count, COALESCE(SUM(t.amount), 0) as total_amount
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         WHERE (fw.user_id = $1 OR tw.user_id = $1)
         GROUP BY t.type`,
        [userId]
      );

      // Última transação
      const lastTransactionResult = await db.query(
        `SELECT t.*, 
                CASE 
                  WHEN fw.user_id = $1 THEN 'debit'
                  WHEN tw.user_id = $1 THEN 'credit'
                END as flow_type
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         WHERE fw.user_id = $1 OR tw.user_id = $1
         ORDER BY t.created_at DESC
         LIMIT 1`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          total: parseInt(totalResult.rows[0].total),
          received: receivedResult.rows[0].total,
          spent: spentResult.rows[0].total,
          byType: byTypeResult.rows,
          lastTransaction: lastTransactionResult.rows[0] || null,
        },
      });
    } catch (error: any) {
      console.error('Get transaction stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transaction stats',
      });
    }
  },

  // Admin: Listar todas as transações do sistema
  async getAllTransactions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '50',
        type,
        status,
        startDate,
        endDate,
        search,
      } = req.query as TransactionQueryParams & { search?: string };

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (type) {
        conditions.push(`t.type = $${paramIndex++}`);
        params.push(type);
      }

      if (status) {
        conditions.push(`t.status = $${paramIndex++}`);
        params.push(status);
      }

      if (startDate) {
        conditions.push(`t.created_at >= $${paramIndex++}`);
        params.push(new Date(startDate));
      }

      if (endDate) {
        conditions.push(`t.created_at <= $${paramIndex++}`);
        params.push(new Date(endDate));
      }

      if (search) {
        conditions.push(`(t.tx_hash ILIKE $${paramIndex++} OR t.metadata::text ILIKE $${paramIndex})`);
        params.push(`%${search}%`, `%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get transactions
      const transactionsResult = await db.query(
        `SELECT t.*, 
                fw.user_id as from_user_id,
                tw.user_id as to_user_id,
                fu.nome as from_user_name,
                fu.email as from_user_email,
                tu.nome as to_user_name,
                tu.email as to_user_email,
                cb.nome as created_by_name
         FROM transactions t
         LEFT JOIN wallets fw ON t.from_wallet = fw.id
         LEFT JOIN wallets tw ON t.to_wallet = tw.id
         LEFT JOIN users fu ON fw.user_id = fu.id
         LEFT JOIN users tu ON tw.user_id = tu.id
         LEFT JOIN users cb ON t.created_by = cb.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, parseInt(limit), offset]
      );

      const totalPage = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          transactions: transactionsResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPage,
          },
        },
      });
    } catch (error: any) {
      console.error('Get all transactions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch all transactions',
      });
    }
  },
};
