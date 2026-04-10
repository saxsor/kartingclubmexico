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
import championshipsRoutes from './championships.routes.js';
import selfRegisterRoutes from './self-register.routes.js';
import analyticsRoutes from './analytics.routes.js';
import pilotPortalRoutes from './pilot-portal.routes.js';
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

router.use('/championships', championshipsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/pilot', pilotPortalRoutes);

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

// Sitemap
router.get('/sitemap', async (_req, res) => {
  const { prisma } = await import('../lib/prisma.js');
  const baseUrl = process.env.APP_URL ?? 'https://kartingclubmexico.com';

  const [events, pilots, championships] = await Promise.all([
    prisma.event.findMany({ where: { status: { not: 'DRAFT' } }, select: { slug: true, updatedAt: true }, orderBy: { date: 'desc' } }),
    prisma.pilot.findMany({ where: { active: true }, select: { id: true, updatedAt: true } }),
    prisma.championship.findMany({ select: { id: true, updatedAt: true } }),
  ]);

  const staticUrls: Array<{ loc: string; priority: string; lastmod?: string }> = [
    { loc: baseUrl, priority: '1.0' },
    { loc: `${baseUrl}/eventos`, priority: '0.9' },
    { loc: `${baseUrl}/campeonato`, priority: '0.8' },
  ];

  const eventUrls = events.map((e) => ({
    loc: `${baseUrl}/eventos/${e.slug}`,
    lastmod: e.updatedAt.toISOString().split('T')[0],
    priority: '0.8',
  }));

  const pilotUrls = pilots.map((p) => ({
    loc: `${baseUrl}/pilotos/${p.id}`,
    lastmod: p.updatedAt.toISOString().split('T')[0],
    priority: '0.5',
  }));

  const championshipUrls = championships.map((c) => ({
    loc: `${baseUrl}/campeonato/${c.id}`,
    lastmod: c.updatedAt.toISOString().split('T')[0],
    priority: '0.7',
  }));

  const allUrls = [...staticUrls, ...eventUrls, ...pilotUrls, ...championshipUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

export default router;
