import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { sensitiveOperationLimiter } from '../middleware/rateLimiter';
import { redeemBCValidation, issueBCValidation, paginationValidation } from '../middleware/validation';

const router = Router();

router.post('/redeem', authenticate, sensitiveOperationLimiter, redeemBCValidation, transactionController.redeem);
router.post('/issue', authenticate, requireAdmin, sensitiveOperationLimiter, issueBCValidation, transactionController.issue);
router.get('/history', authenticate, paginationValidation, transactionController.getHistory);
router.get('/stats', authenticate, transactionController.getStats);
router.get('/all', authenticate, requireAdmin, paginationValidation, transactionController.getAllTransactions);

export default router;
