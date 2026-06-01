import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import * as authCtrl from '../controllers/authController';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const changePassSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

const resetReqSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(6) });

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Cadastro de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 */
router.post('/register', validate(registerSchema), authCtrl.register);

router.post('/login', validate(loginSchema), authCtrl.login);
router.post('/reset-request', validate(resetReqSchema), authCtrl.requestReset);
router.post('/reset-confirm', validate(resetSchema), authCtrl.resetPassword);

router.use(authenticate);

router.patch('/password', validate(changePassSchema), authCtrl.changePassword);
router.get('/profile', authCtrl.getProfile);

export default router;
