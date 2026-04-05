import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listUsers, createUser, getUser, updateUser, setUserActive, deleteUser,
} from '../controllers/users.controller.js';

const router = Router();

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'ORGANIZER']).default('ORGANIZER'),
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'ORGANIZER']).optional(),
}).partial();

const activeSchema = z.object({ active: z.boolean() });

router.use(authenticate, requireRole('ADMIN'));
router.get('/', listUsers);
router.post('/', validate(createSchema), createUser);
router.get('/:id', getUser);
router.put('/:id', validate(updateSchema), updateUser);
router.patch('/:id/active', validate(activeSchema), setUserActive);
router.delete('/:id', deleteUser);

export default router;
