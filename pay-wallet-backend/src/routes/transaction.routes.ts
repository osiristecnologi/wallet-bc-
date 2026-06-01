import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import * as transactionCtrl from '../controllers/transactionController';

const router = Router();
router.use(authenticate);

const transferSchema = z.object({
  toEmail: z.string().email(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato monetário inválido'),
  description: z.string().optional(),
});

router.post('/transfer', validate(transferSchema), transactionCtrl.transfer);

export default router;
