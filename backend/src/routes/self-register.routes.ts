import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { uploadReceipt as multerUpload } from '../lib/upload.js';
import {
  selfRegister,
  uploadReceipt,
  approveReceipt,
  rejectReceipt,
} from '../controllers/self-register.controller.js';

const router = Router({ mergeParams: true });

const categoryEnum = z.enum(['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES', 'MINIS']);

const registerSchema = z.object({
  pilotId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  alias: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  kartNumber: z.string().optional(),
  category: categoryEnum,
  notes: z.string().optional(),
}).refine((d) => d.pilotId || (d.name && d.name.length >= 2), {
  message: 'Se requiere pilotId o nombre',
});

router.post('/self-register', validate(registerSchema), selfRegister);
router.post('/inscriptions/:id/receipt', multerUpload.single('receipt'), uploadReceipt);
router.post('/inscriptions/:id/approve', authenticate, requireRole('ADMIN', 'ORGANIZER'), approveReceipt);
router.post('/inscriptions/:id/reject', authenticate, requireRole('ADMIN', 'ORGANIZER'), rejectReceipt);

export default router;
