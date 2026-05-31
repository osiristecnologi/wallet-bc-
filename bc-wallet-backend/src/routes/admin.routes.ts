import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { sensitiveOperationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/users', adminController.getUsers);
router.get('/treasury', adminController.getTreasury);
router.post('/issue', sensitiveOperationLimiter, adminController.issueBC);
router.post('/redeem', sensitiveOperationLimiter, adminController.redeemBCFromUser);
router.patch('/users/:userId/status', adminController.toggleUserStatus);

export default router;
