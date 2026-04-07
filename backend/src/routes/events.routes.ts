import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listEvents, createEvent, getEvent, updateEvent, deleteEvent,
  patchEventStatus, getEventCategories, updateEventCategories,
  uploadEventPoster, deleteEventPoster,
} from '../controllers/events.controller.js';
import { uploadPoster } from '../lib/upload.js';

const router = Router();

const categoryEnum = z.enum(['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS']);

const createSchema = z.object({
  name: z.string().min(2),
  date: z.string(),
  description: z.string().optional(),
  track: z.string().optional(),
  year: z.number().int().optional(),
  serviceFee: z.number().optional(),
  foodFee: z.number().optional(),
  blockCheckInOnDebt: z.boolean().optional(),
  transferInfo: z.string().optional(),
  categories: z.array(categoryEnum).optional(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED']),
});

const categoriesSchema = z.object({
  categories: z.array(categoryEnum),
});

router.get('/', listEvents);
router.get('/:slug', getEvent);
router.get('/:slug/categories', getEventCategories);

router.post('/', authenticate, requireRole('ADMIN'), validate(createSchema), createEvent);
router.put('/:slug', authenticate, requireRole('ADMIN'), validate(updateSchema), updateEvent);
router.delete('/:slug', authenticate, requireRole('ADMIN'), deleteEvent);
router.patch('/:slug/status', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(statusSchema), patchEventStatus);
router.put('/:slug/categories', authenticate, requireRole('ADMIN'), validate(categoriesSchema), updateEventCategories);
router.post('/:slug/poster', authenticate, requireRole('ADMIN'), uploadPoster.single('poster'), uploadEventPoster);
router.delete('/:slug/poster', authenticate, requireRole('ADMIN'), deleteEventPoster);

export default router;
