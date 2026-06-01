import { prisma } from '../config/db';
import { User, Role } from '@prisma/client';

export const createUser = (data: { name: string; email: string; password: string }): Promise<User> => {
  return prisma.user.create({ data });
};

export const findUserByEmail = (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = (id: string) => {
  return prisma.user.findUnique({ where: { id }, include: { wallet: true } });
};

export const updateUser = (id: string, data: Partial<User>) => {
  return prisma.user.update({ where: { id }, data });
};

export const findAllUsers = (skip: number, take: number) => {
  return prisma.user.findMany({ skip, take, orderBy: { createdAt: 'desc' } });
};

export const countUsers = () => prisma.user.count();

export const findAdminByEmail = (email: string) => {
  return prisma.admin.findUnique({ where: { email } });
};
