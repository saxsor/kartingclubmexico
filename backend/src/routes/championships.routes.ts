import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listChampionships,
  createChampionship,
  getChampionshipById,
  updateChampionship,
  deleteChampionship,
  getChampionshipStandings,
  getConstructorStandings,
  getUnassignedEvents,
} from '../controllers/championships.controller.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  year: z.number().int().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  year: z.number().int().optional(),
});

const categoryEnum = z.enum(['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS']);

router.get('/', listChampionships);
router.get('/unassigned-events', authenticate, requireRole('ADMIN', 'ORGANIZER'), getUnassignedEvents);
router.get('/:id', getChampionshipById);
router.get('/:id/standings/:category', (req, res, next) => {
  const result = categoryEnum.safeParse(req.params.category);
  if (!result.success) { res.status(400).json({ error: 'Categoría inválida' }); return; }
  next();
}, getChampionshipStandings);

router.get('/:id/constructors/:category', (req, res, next) => {
  const result = categoryEnum.safeParse(req.params.category);
  if (!result.success) { res.status(400).json({ error: 'Categoría inválida' }); return; }
  next();
}, getConstructorStandings);

router.post('/', authenticate, requireRole('ADMIN'), validate(createSchema), createChampionship);
router.put('/:id', authenticate, requireRole('ADMIN'), validate(updateSchema), updateChampionship);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteChampionship);

export default router;
