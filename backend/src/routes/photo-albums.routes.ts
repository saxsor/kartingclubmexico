import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { uploadPhotos } from '../lib/upload.js';
import {
  getAlbumByEvent,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  uploadPhotosHandler,
  deletePhoto,
  reorderPhotos,
  downloadPhoto,
  downloadBulkPhotos,
} from '../controllers/photo-albums.controller.js';

const router = Router();

const downloadLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public
router.get('/events/:slug/photos', getAlbumByEvent);
router.get('/photos/:photoId/download', downloadLimit, downloadPhoto);
router.get('/events/:slug/photos/download-bulk', downloadLimit, downloadBulkPhotos);

// Admin
router.post('/events/:slug/photos/album', authenticate, requireRole('ADMIN', 'ORGANIZER'), createAlbum);
router.patch('/events/:slug/photos/album', authenticate, requireRole('ADMIN', 'ORGANIZER'), updateAlbum);
router.delete('/events/:slug/photos/album', authenticate, requireRole('ADMIN'), deleteAlbum);
router.post('/events/:slug/photos/upload', authenticate, requireRole('ADMIN', 'ORGANIZER'), uploadPhotos.array('photos', 50), uploadPhotosHandler);
router.delete('/events/:slug/photos/:photoId', authenticate, requireRole('ADMIN', 'ORGANIZER'), deletePhoto);
router.patch('/events/:slug/photos/reorder', authenticate, requireRole('ADMIN', 'ORGANIZER'), reorderPhotos);

export default router;
