import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import * as userRepo from '../repositories/userRepository';
import { AppError } from '../utils/appError';
import { prisma } from '../lib/prisma'; // 

const SALT_ROUNDS = 10;

export const register = async (name: string, email: string, password: string) => {
  const existing = await userRepo.findUserByEmail(email);
  if (existing) throw new AppError('E-mail já cadastrado', 409);

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepo.createUser({ name, email, password: hash });
  await userRepo.findOrCreateWallet(user.id); // Cria wallet automaticamente

  return { id: user.id, name: user.name, email: user.email };
};

export const login = async (email: string, password: string) => {
  const user = await userRepo.findUserByEmail(email);
  if (!user) throw new AppError('Credenciais inválidas', 401);
  if (!user.isActive) throw new AppError('Conta bloqueada', 403);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Credenciais inválidas', 401);

  const token = jwt.sign(
    { id: user.id, role: user.role, entityType: 'user' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return { token };
};

export const changePassword = async (userId: string, currentPass: string, newPass: string) => {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new AppError('Usuário não encontrado', 404);

  const valid = await bcrypt.compare(currentPass, user.password);
  if (!valid) throw new AppError('Senha atual incorreta', 400);

  const hash = await bcrypt.hash(newPass, SALT_ROUNDS);
  await userRepo.updateUser(userId, { password: hash, updatedAt: new Date() });
  return { message: 'Senha atualizada com sucesso' };
};

export const requestPasswordReset = async (email: string) => {
  const user = await userRepo.findUserByEmail(email);
  if (!user) return { message: 'Se o e-mail existir, um token será enviado' };

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1h
  await userRepo.updateUser(user.id, { resetPasswordToken: token, resetPasswordExpires: expires });

  return { resetToken: token, message: 'Token de recuperação gerado (enviar por e-mail em produção)' };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: { resetPasswordToken: token, resetPasswordExpires: { gt: new Date() } },
  });
  if (!user) throw new AppError('Token inválido ou expirado', 400);

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userRepo.updateUser(user.id, {
    password: hash,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  return { message: 'Senha redefinida com sucesso' };
};
