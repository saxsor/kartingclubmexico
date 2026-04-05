import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listPilots, createPilot, getPilot, updatePilot, deletePilot, getPilotHistory,
} from '../controllers/pilots.controller.js';

const router = Router();

const pilotSchema = z.object({
  name: z.string().min(2),
  alias: z.string().optional(),
  kartNumber: z.number().int().positive().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
});

router.get('/', listPilots);
router.get('/:id', getPilot);
router.get('/:id/history', getPilotHistory);
router.post('/', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(pilotSchema), createPilot);
router.put('/:id', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(pilotSchema.partial()), updatePilot);
router.delete('/:id', authenticate, requireRole('ADMIN'), deletePilot);

export default router;
