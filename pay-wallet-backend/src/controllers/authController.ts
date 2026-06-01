import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as authService from '../services/authService';
import * as userRepo from '../repositories/userRepository';
import { AppError } from '../utils/appError';

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await authService.register(req.body.name, req.body.email, req.body.password);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const requestReset = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.findUserById(req.user.id);
    if (!user) throw new AppError('Usuário não encontrado', 404);
    const { password, ...safeUser } = user;
    res.json({ status: 'success', data: safeUser });
  } catch (error) { next(error); }
};
