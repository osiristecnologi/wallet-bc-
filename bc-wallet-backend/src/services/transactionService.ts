import { transactionRepository } from '../repositories/transactionRepository';
import { walletRepository } from '../repositories/walletRepository';
import { treasuryRepository } from '../repositories/treasuryRepository';
import { auditLogRepository } from '../repositories/auditLogRepository';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const transactionService = {
  async generateTxHash(data: any): Promise<string> {
    const dataString = JSON.stringify(data) + Date.now() + uuidv4();
    return createHash('sha256').update(dataString).digest('hex');
  },

  async issueBC(input: { toUserId: string; amount: string; adminUserId: string }) {
    const amount = parseFloat(input.amount);
    if (amount <= 0) throw new Error('Amount must be greater than zero');

    const treasury = await treasuryRepository.get();
    if (parseFloat(treasury.balance) < amount) {
      throw new Error('Insufficient treasury balance');
    }

    const wallet = await walletRepository.findByUserId(input.toUserId);
    if (!wallet) throw new Error('User wallet not found');

    const txHash = await this.generateTxHash({
      type: 'ISSUE',
      toUserId: input.toUserId,
      amount,
      timestamp: Date.now(),
    });

    await treasuryRepository.updateBalance(amount, 'issue');
    await walletRepository.updateBalance(wallet.id, amount, 'add');

    await transactionRepository.create({
      tx_hash: txHash,
      type: 'ISSUE',
      to_wallet: wallet.id,
      amount: amount.toString(),
      status: 'completed',
      created_by: input.adminUserId,
      metadata: { reason: 'BC issuance' },
    });

    await auditLogRepository.create({
      actor: input.adminUserId,
      actor_type: 'admin',
      action: 'BC_ISSUED',
      resource_type: 'transaction',
      metadata: { toUserId: input.toUserId, amount, txHash },
    });

    const isValid = await import('./walletService').then(s => s.walletService.validateBalanceConsistency());
    if (!isValid) throw new Error('Balance consistency check failed');

    return { txHash, amount, toUserId: input.toUserId };
  },

  async redeemBC(input: { fromUserId: string; amount: string; reason: string }) {
    const amount = parseFloat(input.amount);
    if (amount <= 0) throw new Error('Amount must be greater than zero');

    const wallet = await walletRepository.findByUserId(input.fromUserId);
    if (!wallet) throw new Error('User wallet not found');
    if (parseFloat(wallet.balance) < amount) throw new Error('Insufficient wallet balance');

    const txHash = await this.generateTxHash({
      type: 'REDEEM',
      fromUserId: input.fromUserId,
      amount,
      timestamp: Date.now(),
    });

    await walletRepository.updateBalance(wallet.id, amount, 'subtract');
    await treasuryRepository.updateBalance(amount, 'redeem');

    await transactionRepository.create({
      tx_hash: txHash,
      type: 'REDEEM',
      from_wallet: wallet.id,
      amount: amount.toString(),
      status: 'completed',
      metadata: { reason: input.reason },
    });

    await auditLogRepository.create({
      actor: input.fromUserId,
      actor_type: 'user',
      action: 'BC_REDEEMED',
      resource_type: 'transaction',
      metadata: { amount, txHash, reason: input.reason },
    });

    const isValid = await import('./walletService').then(s => s.walletService.validateBalanceConsistency());
    if (!isValid) throw new Error('Balance consistency check failed');

    return { txHash, amount, fromUserId: input.fromUserId };
  },
};
