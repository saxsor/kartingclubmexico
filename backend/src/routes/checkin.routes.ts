import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listCheckIns, doCheckIn, undoCheckIn } from '../controllers/checkin.controller.js';

const router = Router({ mergeParams: true });

const checkInSchema = z.object({
  kartNumber: z.number().int().positive(),
});

router.use(authenticate, requireRole('ADMIN', 'ORGANIZER'));
router.get('/checkin', listCheckIns);
router.post('/inscriptions/:id/checkin', validate(checkInSchema), doCheckIn);
router.delete('/inscriptions/:id/checkin', undoCheckIn);

export default router;
