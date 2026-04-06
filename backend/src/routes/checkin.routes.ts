import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listCheckIns, doCheckIn, undoCheckIn } from '../controllers/checkin.controller.js';

const router = Router({ mergeParams: true });

const checkInSchema = z.object({
  kartNumber: z.number().int().positive(),
});

router.get('/checkin', authenticate, requireRole('ADMIN', 'ORGANIZER'), listCheckIns);
router.post('/inscriptions/:id/checkin', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(checkInSchema), doCheckIn);
router.delete('/inscriptions/:id/checkin', authenticate, requireRole('ADMIN', 'ORGANIZER'), undoCheckIn);

export default router;
