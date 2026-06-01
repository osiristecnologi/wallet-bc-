import { prisma } from '../config/db';
import * as walletRepo from '../repositories/walletRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import { AppError } from '../utils/appError';
import { Decimal } from '@prisma/client/runtime/library';

export const transfer = async (fromUserId: string, toEmail: string, amount: string, description?: string) => {
  if (parseFloat(amount) <= 0) throw new AppError('Valor deve ser positivo', 400);

  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId }, include: { wallet: true } });
  const toUser = await prisma.user.findUnique({ where: { email: toEmail }, include: { wallet: true } });

  if (!fromUser?.wallet) throw new AppError('Wallet de origem não encontrada', 404);
  if (!toUser?.wallet) throw new AppError('Usuário destinatário não encontrado', 404);
  if (fromUser.id === toUser.id) throw new AppError('Transferência para si mesmo não permitida', 400);

  const currentBalance = fromUser.wallet.balance;
  const transferAmount = new Decimal(amount);

  if (currentBalance.lt(transferAmount)) throw new AppError('Saldo insuficiente', 400);

  const result = await prisma.$transaction(async (tx) => {
    const newFromBalance = currentBalance.minus(transferAmount);
    const newToBalance = toUser.wallet.balance.plus(transferAmount);

    await tx.wallet.update({ where: { id: fromUser.wallet!.id }, data: { balance: newFromBalance } });
    await tx.wallet.update({ where: { id: toUser.wallet!.id }, data: { balance: newToBalance } });

    return tx.transaction.create({
      data: {
        type: 'TRANSFER',
        amount: transferAmount,
        description: description || `Transferência para ${toEmail}`,
        status: 'COMPLETED',
        fromId: fromUser.wallet.id,
        toId: toUser.wallet.id,
      },
    });
  });

  return { transactionId: result.id, status: result.status };
};

export const adminAdjustBalance = async (adminId: string, userEmail: string, amount: string, type: 'CREDIT' | 'DEBIT', description?: string) => {
  const targetUser = await prisma.user.findUnique({ where: { email: userEmail }, include: { wallet: true } });
  if (!targetUser?.wallet) throw new AppError('Usuário alvo não encontrado', 404);

  if (parseFloat(amount) <= 0) throw new AppError('Valor deve ser positivo', 400);

  const adjustAmount = new Decimal(amount);

  const result = await prisma.$transaction(async (tx) => {
    let newBalance = targetUser.wallet!.balance;
    if (type === 'CREDIT') newBalance = newBalance.plus(adjustAmount);
    else newBalance = newBalance.minus(adjustAmount);

    if (newBalance.lt(0)) throw new AppError('Saldo não pode ficar negativo após débito', 400);

    await tx.wallet.update({ where: { id: targetUser.wallet!.id }, data: { balance: newBalance } });

    return tx.transaction.create({
      data: {
        type,
        amount: adjustAmount,
        description: description || `Ajuste administrativo por ${adminId}`,
        status: 'COMPLETED',
        toId: type === 'CREDIT' ? targetUser.wallet!.id : undefined,
        fromId: type === 'DEBIT' ? targetUser.wallet!.id : undefined,
      },
    });
  });

  return { transactionId: result.id, newBalance: result.amount.toString() };
};
