import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listRaces, createRace, getRace, patchRaceStatus } from '../controllers/races.controller.js';

const router = Router({ mergeParams: true });

const categoryEnum = z.enum(['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS']);

const createSchema = z.object({
  category: categoryEnum,
  number: z.number().int().min(1).max(10),
  laps: z.number().int().min(1).optional(),
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'FINISHED']),
});

router.get('/races', listRaces);
router.post('/races', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(createSchema), createRace);
router.get('/races/:raceId', getRace);
router.patch('/races/:raceId/status', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(statusSchema), patchRaceStatus);

export default router;
