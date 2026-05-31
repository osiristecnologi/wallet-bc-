import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { loginRateLimiter, createRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const rateLimiter = createRateLimiter();

router.post('/register', rateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
