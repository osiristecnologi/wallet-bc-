import { Response } from 'express';
import { transactionService } from '../services/transactionService';
import { transactionRepository } from '../repositories/transactionRepository';
import { AuthRequest } from '../types';

export const transactionController = {
  issue: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { toUserId, amount, reason } = req.body;
      // AdminUserId garantido pelo middleware requireAdmin + authenticate
      const adminUserId = req.user!.userId; 
      
      const result = await transactionService.issueBC({ toUserId, amount, adminUserId });
      res.status(201).json({ success: true, message: 'BC issued successfully', data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  redeem: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { amount, reason } = req.body;
      const fromUserId = req.user!.userId;
      
      const result = await transactionService.redeemBC({ fromUserId, amount, reason });
      res.json({ success: true, message: 'BC redeemed successfully', data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  getHistory: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO: String() explícito
      const page = String(req.query.page || '1');
      const limit = String(req.query.limit || '20');
      
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const userId = req.user!.userId;

      const transactions = await transactionRepository.findByUserId(userId, parseInt(limit, 10), offset);
      res.json({ success: true, data: transactions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const transaction = await transactionRepository.findById(req.params.id, userId);
      
      if (!transaction) {
        res.status(404).json({ success: false, error: 'Transaction not found' });
        return;
      }
      res.json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getStats: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const stats = await transactionRepository.getUserStats(userId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getAllTransactions: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO: Conversão explícita de todas as query strings
      const page = String(req.query.page || '1');
      const limit = String(req.query.limit || '50');
      const type = req.query.type ? String(req.query.type) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      
      const filters = { type, status, startDate, endDate, search };
      const result = await transactionRepository.findAll(filters, parseInt(limit, 10), offset);
      
      res.json({ 
        success: true, 
        data: { 
          transactions: result.transactions, 
          pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total: result.total } 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
