import { db } from '../config/database';
import { getRedisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export const walletService = {
  async getWalletByUserId(userId: string) {
    const redis = getRedisClient();
    const cacheKey = `wallet:${userId}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await db.query(
      `SELECT w.*, u.nome, u.email
       FROM wallets w
       JOIN users u ON w.user_id = u.id
       WHERE w.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    const wallet = result.rows[0];

    // Cache for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(wallet));

    return wallet;
  },

  async getBalance(userId: string): Promise<string> {
    const wallet = await this.getWalletByUserId(userId);
    return wallet.balance;
  },

  async getTransactionHistory(userId: string, limit: number = 20, offset: number = 0) {
    const result = await db.query(
      `SELECT t.*, 
              fw.user_id as from_user_id,
              tw.user_id as to_user_id,
              fu.nome as from_user_name,
              tu.nome as to_user_name
       FROM transactions t
       LEFT JOIN wallets fw ON t.from_wallet = fw.id
       LEFT JOIN wallets tw ON t.to_wallet = tw.id
       LEFT JOIN users fu ON fw.user_id = fu.id
       LEFT JOIN users tu ON tw.user_id = tu.id
       WHERE fw.user_id = $1 OR tw.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  },

  async validateBalanceConsistency(): Promise<boolean> {
    const result = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_wallets,
        (SELECT balance FROM treasury WHERE id = 1) as treasury_balance
    `);

    const totalWallets = parseFloat(result.rows[0].total_wallets);
    const treasuryBalance = parseFloat(result.rows[0].treasury_balance);

    if (totalWallets > treasuryBalance) {
      console.error(`Balance inconsistency detected: Wallets (${totalWallets}) > Treasury (${treasuryBalance})`);
      return false;
    }

    return true;
  },
};
