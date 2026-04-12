import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listAuditLog } from '../controllers/audit.controller.js';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN'), listAuditLog);

export default router;
