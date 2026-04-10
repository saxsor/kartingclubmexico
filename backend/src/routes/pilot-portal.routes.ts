import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  requestMagicLink,
  verifyMagicLink,
  getMyProfile,
  updateMyProfile,
  updateMyPhoto,
  uploadMyPhotoMiddleware,
  updateMyInscription,
} from '../controllers/pilot-portal.controller.js';

const router = Router();

const requestSchema = z.object({ email: z.string().email() });
const verifySchema = z.object({ token: z.string().min(1) });
const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  alias: z.string().optional(),
  phone: z.string().optional(),
});
const updateInscriptionSchema = z.object({
  companions: z.number().int().min(0).optional(),
  kartNumber: z.number().int().positive().optional(),
});

// Public — no auth required
router.post('/request-access', validate(requestSchema), requestMagicLink);
router.post('/verify-access', validate(verifySchema), verifyMagicLink);

// Protected — PILOT role required
router.get('/me', authenticate, requireRole('PILOT'), getMyProfile);
router.put('/me', authenticate, requireRole('PILOT'), validate(updateProfileSchema), updateMyProfile);
router.post('/me/photo', authenticate, requireRole('PILOT'), uploadMyPhotoMiddleware, updateMyPhoto);
router.put('/inscriptions/:id', authenticate, requireRole('PILOT'), validate(updateInscriptionSchema), updateMyInscription);

export default router;
