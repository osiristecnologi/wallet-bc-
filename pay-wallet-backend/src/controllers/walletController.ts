import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as walletService from '../services/walletService';

export const balance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await walletService.getBalance(req.user.id);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const history = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await walletService.getHistory(req.user.id, limit, offset);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const statement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const start = new Date(req.query.startDate as string);
    const end = new Date(req.query.endDate as string);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Datas inválidas');
    const result = await walletService.getStatement(req.user.id, start, end);
    res.json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
