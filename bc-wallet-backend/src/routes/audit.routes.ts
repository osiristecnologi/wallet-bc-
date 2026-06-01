import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { paginationValidation, auditFilterValidation } from '../middleware/validation';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);
router.use(createRateLimiter());

router.get('/', paginationValidation, auditFilterValidation, auditController.getAuditLogs);
router.get('/stats', auditController.getAuditStats);
router.get('/summary', auditController.getAuditSummary);
router.get('/export', auditController.exportAuditLogs);
router.get('/:id', auditController.getAuditLogById);

export default router;
