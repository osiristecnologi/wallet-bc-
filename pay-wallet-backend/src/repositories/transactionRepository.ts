import { prisma } from '../config/db';
import { Transaction, TransactionType, TransactionStatus } from '@prisma/client';

interface TransactionCreate {
  type: TransactionType;
  amount: string;
  description?: string;
  status?: TransactionStatus;
  fromId?: string;
  toId?: string;
}

export const createTransaction = (data: TransactionCreate): Promise<Transaction> => {
  return prisma.transaction.create({ data });
};

export const getTransactionsByWallet = async (walletId: string, limit = 50, offset = 0) => {
  return prisma.transaction.findMany({
    where: {
      OR: [{ fromId: walletId }, { toId: walletId }],
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  });
};

export const getStatement = async (
  walletId: string,
  startDate: Date,
  endDate: Date
) => {
  return prisma.transaction.findMany({
    where: {
      OR: [{ fromId: walletId }, { toId: walletId }],
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'asc' },
  });
};

export const findAllTransactions = (limit = 100, offset = 0) => {
  return prisma.transaction.findMany({
    skip: offset,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { from: { select: { id: true } }, to: { select: { id: true } } },
  });
};
