import { Response } from 'express';
import { userRepository } from '../repositories/userRepository';
import { treasuryService } from '../services/treasuryService';
import { transactionService } from '../services/transactionService';
import { AuthRequest } from '../types';

export const adminController = {
  getUsers: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // CORREÇÃO
      const page = String(req.query.page || '1');
      const limit = String(req.query.limit || '20');
      const search = req.query.search ? String(req.query.search) : undefined;
      
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      
      const result = await userRepository.findAll(search, parseInt(limit, 10), offset);
      
      res.json({ 
        success: true, 
        data: { 
          users: result.users, 
          pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total: result.total } 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getTreasury: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const treasury = await treasuryService.getTreasury();
      // Importação dinâmica para evitar circular dependency se houver
      const { walletRepository } = await import('../repositories/walletRepository');
      const walletsResult = await walletRepository.getStats();
      
      res.json({ success: true, data: { ...treasury, totalInCirculation: walletsResult.totalBalance } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  issueBC: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { toUserId, amount, reason } = req.body;
      const adminUserId = req.user!.userId; // Garantido pelo auth
      const result = await transactionService.issueBC({ toUserId, amount, adminUserId });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  redeemBCFromUser: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fromUserId, amount, reason } = req.body;
      const result = await transactionService.redeemBC({ 
        fromUserId, 
        amount, 
        reason: reason || 'Admin redemption' 
      });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  toggleUserStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      const user = await userRepository.toggleStatus(userId, isActive);
      
      const { auditLogRepository } = await import('../repositories/auditLogRepository');
      await auditLogRepository.create({
        actor: req.user!.userId, // Garantido
        actor_type: 'admin',
        action: 'USER_STATUS_CHANGED',
        resource_type: 'user',
        resource_id: userId,
        metadata: { isActive, changedBy: req.user!.userId },
      });
      
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
