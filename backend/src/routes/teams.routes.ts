import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { searchTeams, listTeams, getTeam, createTeam, updateTeam, uploadTeamLogo, deleteTeamLogo } from '../controllers/teams.controller.js';
import { uploadPilotPhoto } from '../lib/upload.js';

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

// Admin only: team logo
router.post('/:id/logo', authenticate, requireRole('ADMIN'), uploadPilotPhoto.single('logo'), uploadTeamLogo);
router.delete('/:id/logo', authenticate, requireRole('ADMIN'), deleteTeamLogo);

export default router;
