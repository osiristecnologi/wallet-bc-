import { db } from '../config/database';
import { Transaction } from '../types';

export const transactionRepository = {
  async create(data: {
    tx_hash: string;
    type: string;
    from_wallet?: string;
    to_wallet?: string;
    amount: string;
    status?: string;
    metadata?: any;
    created_by?: string;
  }): Promise<Transaction> {
    const result = await db.query(
      `INSERT INTO transactions (tx_hash, type, from_wallet, to_wallet, amount, status, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.tx_hash, data.type, data.from_wallet || null, data.to_wallet || null, 
       data.amount, data.status || 'completed', JSON.stringify(data.metadata), data.created_by]
    );
    return result.rows[0];
  },

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<Transaction[]> {
    const result = await db.query(
      `SELECT t.*, 
              fw.user_id as from_user_id, tw.user_id as to_user_id,
              fu.nome as from_user_name, tu.nome as to_user_name,
              CASE WHEN fw.user_id = $1 THEN 'debit' WHEN tw.user_id = $1 THEN 'credit' END as flow_type
       FROM transactions t
       LEFT JOIN wallets fw ON t.from_wallet = fw.id
       LEFT JOIN wallets tw ON t.to_wallet = tw.id
       LEFT JOIN users fu ON fw.user_id = fu.id
       LEFT JOIN users tu ON tw.user_id = tu.id
       WHERE fw.user_id = $1 OR tw.user_id = $1
       ORDER BY t.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const result = await db.query(
      `SELECT t.*, fw.user_id as from_user_id, tw.user_id as to_user_id
       FROM transactions t
       LEFT JOIN wallets fw ON t.from_wallet = fw.id
       LEFT JOIN wallets tw ON t.to_wallet = tw.id
       WHERE t.id = $1 AND (fw.user_id = $2 OR tw.user_id = $2)`,
      [id, userId]
    );
    return result.rows[0] || null;
  },

  async findAll(filters?: any, limit: number = 50, offset: number = 0): Promise<{ transactions: any[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      conditions.push(`t.type = $${paramIndex++}`);
      params.push(filters.type);
    }
    if (filters?.status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters?.startDate) {
      conditions.push(`t.created_at >= $${paramIndex++}`);
      params.push(new Date(filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(`t.created_at <= $${paramIndex++}`);
      params.push(new Date(filters.endDate));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const transactionsResult = await db.query(
      `SELECT t.*, fw.user_id as from_user_id, tw.user_id as to_user_id,
              fu.nome as from_user_name, fu.email as from_user_email,
              tu.nome as to_user_name, tu.email as to_user_email,
              cb.nome as created_by_name
       FROM transactions t
       LEFT JOIN wallets fw ON t.from_wallet = fw.id
       LEFT JOIN wallets tw ON t.to_wallet = tw.id
       LEFT JOIN users fu ON fw.user_id = fu.id
       LEFT JOIN users tu ON tw.user_id = tu.id
       LEFT JOIN users cb ON t.created_by = cb.id
       ${whereClause}
       ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      params
    );

    return {
      transactions: transactionsResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  },

  async getUserStats(userId: string): Promise<any> {
    const total = await db.query(
      `SELECT COUNT(*) as total FROM transactions t
       LEFT JOIN wallets fw ON t.from_wallet = fw.id
       LEFT JOIN wallets tw ON t.to_wallet = tw.id
       WHERE fw.user_id = $1 OR tw.user_id = $1`,
      [userId]
    );

    const received = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
       JOIN wallets tw ON t.to_wallet = tw.id WHERE tw.user_id = $1 AND t.status = 'completed'`,
      [userId]
    );

    const spent = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
       JOIN wallets fw ON t.from_wallet = fw.id WHERE fw.user_id = $1 AND t.status = 'completed'`,
      [userId]
    );

    const byType = await db.query(
      `SELECT t.type, COUNT(*) as count, COALESCE(SUM(t.amount), 0) as total_amount
       FROM transactions t
       LEFT JOIN wallets fw ON t.from_wallet = fw.id
       LEFT JOIN wallets tw ON t.to_wallet = tw.id
       WHERE (fw.user_id = $1 OR tw.user_id = $1)
       GROUP BY t.type`,
      [userId]
    );

    return {
      total: parseInt(total.rows[0].total),
      received: received.rows[0].total,
      spent: spent.rows[0].total,
      byType: byType.rows,
    };
  },
};
