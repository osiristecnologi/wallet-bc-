import { prisma } from '../config/db';
import { Wallet } from '@prisma/client';

export const findOrCreateWallet = async (userId: string): Promise<Wallet> => {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.wallet.create({
    data: {
      userId,
      balance: '0.00',
    },
  });
};

export const getWalletBalance = (userId: string) => {
  return prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
};

export const updateWalletBalance = (id: string, amount: string) => {
  return prisma.wallet.update({
    where: { id },
    data: { balance: amount, updatedAt: new Date() },
  });
};
