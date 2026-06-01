import * as walletRepo from '../repositories/walletRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import { AppError } from '../utils/appError';
import { Decimal } from '@prisma/client/runtime/library';

export const getBalance = async (userId: string) => {
  const wallet = await walletRepo.getWalletBalance(userId);
  if (!wallet) throw new AppError('Wallet não encontrada', 404);
  return { balance: wallet.balance.toNumber() };
};

export const getHistory = async (userId: string, limit = 50, offset = 0) => {
  const wallet = await walletRepo.findOrCreateWallet(userId);
  const transactions = await transactionRepo.getTransactionsByWallet(wallet.id, limit, offset);
  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount.toNumber(),
    status: t.status,
    direction: t.toId === wallet.id ? 'INCOMING' : 'OUTGOING',
    description: t.description,
    createdAt: t.createdAt,
  }));
};

export const getStatement = async (userId: string, startDate: Date, endDate: Date) => {
  const wallet = await walletRepo.findOrCreateWallet(userId);
  const statement = await transactionRepo.getStatement(wallet.id, startDate, endDate);
  return statement.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount.toNumber(),
    direction: t.toId === wallet.id ? 'INCOMING' : 'OUTGOING',
    createdAt: t.createdAt,
  }));
};
