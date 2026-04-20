import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listCheckIns, doCheckIn, undoCheckIn } from '../controllers/checkin.controller.js';

const router = Router({ mergeParams: true });

const checkInSchema = z.object({
  kartNumber: z.number().int().positive().optional(),
  kartNotes: z.string().optional(),
});

router.get('/checkin', authenticate, requireRole('ADMIN', 'ORGANIZER', 'VALIDATOR'), listCheckIns);
router.post('/inscriptions/:id/checkin', authenticate, requireRole('ADMIN', 'ORGANIZER', 'VALIDATOR'), validate(checkInSchema), doCheckIn);
router.delete('/inscriptions/:id/checkin', authenticate, requireRole('ADMIN', 'ORGANIZER', 'VALIDATOR'), undoCheckIn);

export default router;
