import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { getCashBox, addPayment, deletePayment } from '../controllers/payments.controller.js';

const router = Router({ mergeParams: true });

const paymentSchema = z.object({
  type: z.enum(['SERVICE_FEE', 'FOOD_FEE', 'OTHER']),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

router.get('/cashbox', authenticate, requireRole('ADMIN', 'ORGANIZER'), getCashBox);
router.post('/inscriptions/:id/payments', authenticate, requireRole('ADMIN', 'ORGANIZER'), validate(paymentSchema), addPayment);
router.delete('/payments/:paymentId', authenticate, requireRole('ADMIN'), deletePayment);

export default router;
