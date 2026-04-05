import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  saveRaceResults, addPenalty, deletePenalty,
  getEventResults, getEventResultsByCategory, exportResults,
} from '../controllers/results.controller.js';

const eventRouter = Router({ mergeParams: true });

eventRouter.get('/results', getEventResults);
eventRouter.get('/results/export', authenticate, requireRole('ADMIN', 'ORGANIZER'), exportResults);
eventRouter.get('/results/:category', getEventResultsByCategory);

// Race-level results (mounted at /api/races)
const raceRouter = Router({ mergeParams: true });

const resultsSchema = z.object({
  results: z.array(z.object({
    inscriptionId: z.string().uuid(),
    position: z.number().int().positive().nullable(),
    lapsCompleted: z.number().int().min(0),
    status: z.enum(['FINISHED', 'DNS', 'DNF', 'DSQ']),
  })),
});

const penaltySchema = z.object({
  type: z.enum(['POSITIONS', 'POINTS']),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
});

raceRouter.put('/:raceId/results', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(resultsSchema), saveRaceResults);
raceRouter.post('/:raceId/results/:resultId/penalties', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(penaltySchema), addPenalty);
raceRouter.delete('/:raceId/penalties/:penaltyId', authenticate, requireRole('ADMIN', 'ORGANIZER'), deletePenalty);

export { eventRouter, raceRouter };
