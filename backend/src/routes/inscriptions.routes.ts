import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listInscriptions, createInscription, getInscription, updateInscription, deleteInscription, exportInscriptions,
} from '../controllers/inscriptions.controller.js';

const router = Router({ mergeParams: true });

const categoryEnum = z.enum(['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS']);

const createSchema = z.object({
  pilotId: z.string().uuid(),
  category: categoryEnum,
  kartNumber: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  category: categoryEnum.optional(),
  kartNumber: z.number().int().positive().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING_PAYMENT', 'PAID']).optional(),
});

router.use(authenticate, requireRole('ADMIN', 'ORGANIZER'));
router.get('/export', exportInscriptions);
router.get('/', listInscriptions);
router.post('/', validate(createSchema), createInscription);
router.get('/:id', getInscription);
router.put('/:id', validate(updateSchema), updateInscription);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteInscription);

export default router;
