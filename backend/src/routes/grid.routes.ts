import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { getAllGrids, getGridByCategory, drawGrid, deleteGrid } from '../controllers/grid.controller.js';

const router = Router({ mergeParams: true });

router.get('/grid', getAllGrids);
router.get('/grid/:category', getGridByCategory);
router.post('/grid/:category/draw', authenticate, requireRole('ADMIN', 'ORGANIZER'), drawGrid);
router.delete('/grid/:category', authenticate, requireRole('ADMIN', 'ORGANIZER'), deleteGrid);

export default router;
