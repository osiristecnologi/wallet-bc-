import { db } from '../config/database';
import { Wallet } from '../types';

export const walletRepository = {
  async findByUserId(userId: string): Promise<Wallet | null> {
    const result = await db.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<Wallet | null> {
    const result = await db.query(
      'SELECT * FROM wallets WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async create(userId: string): Promise<Wallet> {
    const result = await db.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *',
      [userId]
    );
    return result.rows[0];
  },

  async updateBalance(id: string, amount: number, operation: 'add' | 'subtract'): Promise<Wallet> {
    const sql = operation === 'add' 
      ? 'UPDATE wallets SET balance = balance + $1 WHERE id = $2 RETURNING *'
      : 'UPDATE wallets SET balance = balance - $1 WHERE id = $2 RETURNING *';
    
    const result = await db.query(sql, [amount, id]);
    return result.rows[0];
  },

  async findAll(search?: string, limit: number = 50, offset: number = 0): Promise<{ wallets: any[]; total: number }> {
    const conditions = search ? 'WHERE u.email ILIKE $1 OR u.nome ILIKE $1 OR u.telefone ILIKE $1' : '';
    const params = search ? [`%${search}%`] : [];
    
    const walletsResult = await db.query(
      `SELECT w.*, u.nome, u.email, u.telefone, u.created_at as user_created_at,
              (SELECT COUNT(*) FROM transactions t WHERE t.from_wallet = w.id OR t.to_wallet = w.id) as tx_count
       FROM wallets w
       JOIN users u ON w.user_id = u.id
       ${conditions}
       ORDER BY w.balance DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM wallets w JOIN users u ON w.user_id = u.id ${conditions}`,
      params
    );

    return {
      wallets: walletsResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  },

  async getStats(): Promise<any> {
    const totalWallets = await db.query('SELECT COUNT(*) as total FROM wallets');
    const totalBalance = await db.query('SELECT COALESCE(SUM(balance), 0) as total FROM wallets');
    const maxBalance = await db.query(
      `SELECT w.balance, u.nome, u.email FROM wallets w JOIN users u ON w.user_id = u.id ORDER BY w.balance DESC LIMIT 1`
    );
    const avgBalance = await db.query('SELECT AVG(balance) as average FROM wallets');
    const zeroBalance = await db.query('SELECT COUNT(*) as total FROM wallets WHERE balance = 0');
    const activeWallets = await db.query('SELECT COUNT(*) as total FROM wallets WHERE balance > 0');
    const top10 = await db.query(
      `SELECT w.balance, u.nome, u.email, u.created_at FROM wallets w JOIN users u ON w.user_id = u.id WHERE w.balance > 0 ORDER BY w.balance DESC LIMIT 10`
    );

    return {
      totalWallets: parseInt(totalWallets.rows[0].total),
      totalBalance: totalBalance.rows[0].total,
      averageBalance: avgBalance.rows[0].average || 0,
      maxBalance: maxBalance.rows[0] || null,
      zeroBalance: parseInt(zeroBalance.rows[0].total),
      activeWallets: parseInt(activeWallets.rows[0].total),
      top10: top10.rows,
    };
  },
};
