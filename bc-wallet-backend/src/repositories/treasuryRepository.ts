import { db } from '../config/database';
import { Treasury } from '../types';

export const treasuryRepository = {
  async get(): Promise<Treasury> {
    const result = await db.query('SELECT * FROM treasury WHERE id = 1');
    return result.rows[0];
  },

  async updateBalance(amount: number, operation: 'issue' | 'redeem'): Promise<Treasury> {
    const sql = operation === 'issue'
      ? `UPDATE treasury SET balance = balance - $1, total_issued = total_issued + $1 WHERE id = 1 RETURNING *`
      : `UPDATE treasury SET balance = balance + $1, total_redeemed = total_redeemed + $1 WHERE id = 1 RETURNING *`;
    
    const result = await db.query(sql, [amount]);
    return result.rows[0];
  },

  async validateBalance(): Promise<boolean> {
    const result = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_wallets,
        (SELECT balance FROM treasury WHERE id = 1) as treasury_balance
    `);

    const totalWallets = parseFloat(result.rows[0].total_wallets);
    const treasuryBalance = parseFloat(result.rows[0].treasury_balance);

    return totalWallets <= treasuryBalance;
  },
};
