import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { login, logout, me, refresh } from '../controllers/auth.controller.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/refresh', validate(refreshSchema), refresh);

export default router;
