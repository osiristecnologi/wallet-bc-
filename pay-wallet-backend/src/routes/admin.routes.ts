import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorization';
import { validate } from '../middleware/validation';
import * as adminCtrl from '../controllers/adminController';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN'));

const toggleSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
});

const adjustSchema = z.object({
  userEmail: z.string().email(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  type: z.enum(['CREDIT', 'DEBIT']),
  description: z.string().optional(),
});

router.get('/users', adminCtrl.listUsers);
router.patch('/users/status', validate(toggleSchema), adminCtrl.toggleUserStatus);
router.post('/balance', validate(adjustSchema), adminCtrl.adjustBalance);
router.get('/transactions', adminCtrl.listAllTransactions);

export default router;
