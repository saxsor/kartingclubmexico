import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listAuditLog, recalculateConstructors } from '../controllers/audit.controller.js';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN'), listAuditLog);
router.post('/recalculate-constructors', authenticate, requireRole('ADMIN'), recalculateConstructors);

export default router;
