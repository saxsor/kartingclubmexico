import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import pilotsRoutes from './pilots.routes.js';
import eventsRoutes from './events.routes.js';
import inscriptionsRoutes from './inscriptions.routes.js';
import paymentsRoutes from './payments.routes.js';
import checkInRoutes from './checkin.routes.js';
import gridRoutes from './grid.routes.js';
import racesRoutes from './races.routes.js';
import { eventRouter as resultsEventRouter, raceRouter as resultsRaceRouter } from './results.routes.js';
import championshipRoutes from './championship.routes.js';
import selfRegisterRoutes from './self-register.routes.js';
import { sseManager } from '../lib/sse.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/pilots', pilotsRoutes);
router.use('/events', eventsRoutes);

// Event-nested routes
router.use('/events/:slug', selfRegisterRoutes);
router.use('/events/:slug/inscriptions', inscriptionsRoutes);
router.use('/events/:slug', paymentsRoutes);
router.use('/events/:slug', checkInRoutes);
router.use('/events/:slug', gridRoutes);
router.use('/events/:slug', racesRoutes);
router.use('/events/:slug', resultsEventRouter);

// Race-level routes (not nested under event)
router.use('/races', resultsRaceRouter);

router.use('/championship', championshipRoutes);

// SSE stream endpoint
router.get('/events/:slug/stream', (req: Request, res: Response) => {
  const { slug } = req.params;
  const clientId = randomUUID();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, slug })}\n\n`);

  sseManager.addClient(slug, clientId, res);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.removeClient(slug, clientId);
  });
});

// Config (stub)
router.get('/config', (_req, res) => res.json({ version: '1.0.0' }));

export default router;
