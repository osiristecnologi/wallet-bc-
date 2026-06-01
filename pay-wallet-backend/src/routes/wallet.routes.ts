import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as walletCtrl from '../controllers/walletController';

const router = Router();

router.use(authenticate);

router.get('/balance', walletCtrl.balance);

/**
 * @swagger
 * /wallet/history:
 *   get:
 *     summary: Histórico de transações do usuário
 *     tags: [Wallet]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 */
router.get('/history', walletCtrl.history);

/**
 * @swagger
 * /wallet/statement:
 *   get:
 *     summary: Extrato por período
 *     tags: [Wallet]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 */
router.get('/statement', walletCtrl.statement);

export default router;
