import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { searchTeams, listTeams, getTeam, createTeam, updateTeam } from '../controllers/teams.controller.js';

const router = Router();

const createSchema = z.object({ name: z.string().min(2).max(80) });
const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  active: z.boolean().optional(),
});

// Public: autocomplete search
router.get('/search', searchTeams);

// Public: list all teams
router.get('/', listTeams);

// Public: get team detail
router.get('/:id', getTeam);

// Public: anyone can create a team (self-register flow)
router.post('/', validate(createSchema), createTeam);

// Admin only: edit team
router.put('/:id', authenticate, requireRole('ADMIN'), validate(updateSchema), updateTeam);

export default router;
