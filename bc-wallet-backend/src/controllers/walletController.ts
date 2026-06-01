import { Response } from 'express';
import { walletService } from '../services/walletService';
import { walletRepository } from '../repositories/walletRepository';
import { AuthRequest } from '../types'; // Certifique-se que AuthRequest está importado

export const walletController = {
  getWallet: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO: Uso de '!' para garantir que userId é string
      const userId = req.user!.userId; 
      
      const wallet = await walletService.getWalletByUserId(userId);
      res.json({ success: true, data: wallet });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  getBalance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO: Uso de '!'
      const userId = req.user!.userId;
      
      const balance = await walletService.getBalance(userId);
      res.json({ success: true, data: { balance, formatted: parseFloat(balance).toFixed(2) } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getTransactionHistory: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO: Conversão explícita para String
      const limit = String(req.query.limit || '20');
      const offset = String(req.query.offset || '0');

      const userId = req.user!.userId;

      const transactions = await walletService.getTransactionHistory(
        userId, 
        parseInt(limit, 10), 
        parseInt(offset, 10)
      );
      res.json({ success: true, data: transactions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getRecentTransactions: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const transactions = await walletService.getTransactionHistory(userId, 10, 0);
      res.json({ success: true, data: { transactions, count: transactions.length } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  validateBalance: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const isValid = await walletService.validateBalanceConsistency();
      res.json({ 
        success: true, 
        data: { isValid, message: isValid ? 'Balance consistent' : 'Inconsistency detected' } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // --- Rotas Admin ---

  getWalletByUserId: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params; // params geralmente são strings
      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        res.status(404).json({ success: false, error: 'Wallet not found' });
        return;
      }
      res.json({ success: true, data: wallet });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getAllWallets: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO: Conversão explícita
      const page = String(req.query.page || '1');
      const limit = String(req.query.limit || '50');
      const search = req.query.search ? String(req.query.search) : undefined;
      
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      
      const result = await walletRepository.findAll(search, parseInt(limit, 10), offset);
      
      res.json({ 
        success: true, 
        data: { 
          wallets: result.wallets, 
          pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total: result.total } 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getWalletStats: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const stats = await walletRepository.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
