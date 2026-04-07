import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { getDashboardAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/dashboard', authenticate, requireRole('ADMIN', 'ORGANIZER'), getDashboardAnalytics);

export default router;
