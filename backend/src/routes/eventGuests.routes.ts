import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listEventGuests, addEventGuest, updateEventGuest, deleteEventGuest } from '../controllers/eventGuests.controller.js';

const router = Router({ mergeParams: true });

const createSchema = z.object({
  name: z.string().optional(),
  count: z.number().int().min(1).max(50).optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  count: z.number().int().min(1).max(50).optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().optional(),
});

router.get('/guests', authenticate, requireRole('ADMIN', 'ORGANIZER', 'VALIDATOR'), listEventGuests);
router.post('/guests', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(createSchema), addEventGuest);
router.put('/guests/:guestId', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(updateSchema), updateEventGuest);
router.delete('/guests/:guestId', authenticate, requireRole('ADMIN', 'ORGANIZER'), deleteEventGuest);

export default router;
