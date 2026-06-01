import * as userRepo from '../repositories/userRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import { AppError } from '../utils/appError';

export const listUsers = async (skip: number, take: number) => {
  const total = await userRepo.countUsers();
  const users = await userRepo.findAllUsers(skip, take);
  return { total, users };
};

export const toggleUserStatus = async (userId: string, active: boolean) => {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new AppError('Usuário não encontrado', 404);

  await userRepo.updateUser(userId, { isActive: active, updatedAt: new Date() });
  return { message: `Usuário ${active ? 'desbloqueado' : 'bloqueado'} com sucesso` };
};

export const getAllTransactions = async (limit = 100, offset = 0) => {
  const total = await prisma.transaction.count();
  const txs = await transactionRepo.findAllTransactions(limit, offset);
  return { total, transactions: txs };
};
