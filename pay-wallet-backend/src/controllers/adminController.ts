import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as adminService from '../services/adminService';
import * as transactionService from '../services/transactionService';

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;
    const result = await adminService.listUsers(skip, take);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, active } = req.body;
    const result = await adminService.toggleUserStatus(userId, active);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const adjustBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userEmail, amount, type, description } = req.body;
    const result = await transactionService.adminAdjustBalance(req.user.id, userEmail, amount, type, description);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const listAllTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await adminService.getAllTransactions(limit, offset);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
