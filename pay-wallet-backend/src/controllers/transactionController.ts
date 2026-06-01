import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as transactionService from '../services/transactionService';

export const transfer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { toEmail, amount, description } = req.body;
    const result = await transactionService.transfer(req.user.id, toEmail, amount, description);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};
