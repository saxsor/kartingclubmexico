import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listPilots, createPilot, getPilot, updatePilot, deletePilot, getPilotHistory,
  uploadPilotPhoto, deletePilotPhoto, importPilots,
} from '../controllers/pilots.controller.js';
import { uploadPilotPhoto as multerPilotPhoto, uploadCsv } from '../lib/upload.js';

const router = Router();

const pilotSchema = z.object({
  name: z.string().min(2),
  alias: z.string().optional(),
  kartNumber: z.number().int().positive().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  engine: z.string().optional(),
  active: z.boolean().optional(),
});

router.post('/import', authenticate, requireRole('ADMIN', 'ORGANIZER'), uploadCsv.single('file'), importPilots);
router.get('/', listPilots);
router.get('/:id', getPilot);
router.get('/:id/history', getPilotHistory);
router.post('/', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(pilotSchema), createPilot);
router.put('/:id', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(pilotSchema.partial()), updatePilot);
router.delete('/:id', authenticate, requireRole('ADMIN'), deletePilot);
router.post('/:id/photo', authenticate, requireRole('ADMIN', 'ORGANIZER'), multerPilotPhoto.single('photo'), uploadPilotPhoto);
router.delete('/:id/photo', authenticate, requireRole('ADMIN', 'ORGANIZER'), deletePilotPhoto);

export default router;
