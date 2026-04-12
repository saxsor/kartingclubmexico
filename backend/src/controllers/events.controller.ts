import { Request, Response } from 'express';
import slugify from 'slugify';
import { prisma } from '../lib/prisma.js';
import { uploadToDrive, deleteFromDrive, isDriveValue } from '../lib/drive.service.js';
import { Category } from '@prisma/client';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { config } from '../config/index.js';
import { sendResultsPublishedEmail } from '../services/email.service.js';
import { CATEGORY_LABELS } from '../lib/category-labels.js';

export async function listEvents(req: Request, res: Response): Promise<void> {
  const { page, pageSize, skip } = getPaginationParams(req);
  const publicOnly = req.query.public === 'true';
  const where = publicOnly ? { status: { not: 'DRAFT' as const } } : undefined;

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: { eventCategories: true, championship: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ]);

  res.json({
    items: events,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const { name, date, description, year, serviceFee, foodFee, blockCheckInOnDebt, transferInfo, track, categories, championshipId } = req.body;

  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const event = await prisma.event.create({
    data: {
      name,
      slug,
      date: new Date(date),
      description,
      year: year ?? new Date(date).getFullYear(),
      serviceFee: serviceFee ?? 0,
      foodFee: foodFee ?? 0,
      blockCheckInOnDebt: blockCheckInOnDebt ?? false,
      transferInfo: transferInfo ?? null,
      track: track ?? null,
      championshipId: championshipId ?? null,
      eventCategories: {
        create: (categories as Category[] ?? []).map((c) => ({ category: c })),
      },
    },
    include: { eventCategories: true },
  });
  res.status(201).json(event);
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: { eventCategories: true, championship: { select: { id: true, name: true } } },
  });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  res.json(event);
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const { name, date, description, year, serviceFee, foodFee, blockCheckInOnDebt, transferInfo, track, championshipId } = req.body;
  const event = await prisma.event.update({
    where: { slug: req.params.slug },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(year && { year }),
      ...(serviceFee !== undefined && { serviceFee }),
      ...(foodFee !== undefined && { foodFee }),
      ...(blockCheckInOnDebt !== undefined && { blockCheckInOnDebt }),
      ...(transferInfo !== undefined && { transferInfo }),
      ...(track !== undefined && { track: track || null }),
      ...('championshipId' in req.body && { championshipId: championshipId || null }),
    },
    include: { eventCategories: true },
  });
  res.json(event);
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  await prisma.event.delete({ where: { slug: req.params.slug } });
  res.status(204).send();
}

export async function uploadEventPoster(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }

  if (event.posterUrl && isDriveValue(event.posterUrl)) {
    await deleteFromDrive(event.posterUrl);
  }

  const posterUrl = await uploadToDrive('posters', req.file.buffer, req.file.originalname, req.file.mimetype, true);
  const updated = await prisma.event.update({
    where: { slug: req.params.slug },
    data: { posterUrl },
    include: { eventCategories: true },
  });
  res.json(updated);
}

export async function deleteEventPoster(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  if (event.posterUrl && isDriveValue(event.posterUrl)) {
    await deleteFromDrive(event.posterUrl);
  }

  const updated = await prisma.event.update({
    where: { slug: req.params.slug },
    data: { posterUrl: null },
    include: { eventCategories: true },
  });
  res.json(updated);
}

export async function patchEventStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body;
  const event = await prisma.event.update({
    where: { slug: req.params.slug },
    data: { status },
  });

  // When an event is marked FINISHED, notify each pilot with their final result
  if (status === 'FINISHED') {
    notifyResultsPublished(event.slug, event.name).catch((err) =>
      console.error('[EMAIL] results notification failed:', err),
    );
  }

  res.json(event);
}

async function notifyResultsPublished(slug: string, eventName: string): Promise<void> {
  // Fetch finished races with results, grouped by pilot
  const races = await prisma.race.findMany({
    where: { event: { slug }, status: 'FINISHED' },
    include: {
      results: {
        include: { inscription: { include: { pilot: true } } },
      },
    },
  });

  // Aggregate total points per pilot per category
  const pilotTotals = new Map<string, { pilot: { name: string; email: string | null }; category: string; totalPoints: number; position: number }>();

  for (const race of races) {
    for (const result of race.results) {
      const key = `${result.inscription.pilotId}-${race.category}`;
      const existing = pilotTotals.get(key);
      if (existing) {
        existing.totalPoints += result.finalPoints;
      } else {
        pilotTotals.set(key, {
          pilot: result.inscription.pilot,
          category: race.category,
          totalPoints: result.finalPoints,
          position: 0,
        });
      }
    }
  }

  // Assign positions per category
  const byCategory = new Map<string, { key: string; totalPoints: number }[]>();
  for (const [key, v] of pilotTotals) {
    const arr = byCategory.get(v.category) ?? [];
    arr.push({ key, totalPoints: v.totalPoints });
    byCategory.set(v.category, arr);
  }

  for (const arr of byCategory.values()) {
    arr.sort((a, b) => b.totalPoints - a.totalPoints);
    arr.forEach((item, idx) => {
      const entry = pilotTotals.get(item.key)!;
      entry.position = idx + 1;
    });
  }

  const resultsUrl = `${config.APP_URL}/eventos/${slug}/resultados`;

  const sends = [...pilotTotals.values()]
    .filter((v) => v.pilot.email)
    .map((v) =>
      sendResultsPublishedEmail(v.pilot.email!, {
        pilotName: v.pilot.name,
        eventName,
        category: CATEGORY_LABELS[v.category] ?? v.category,
        position: v.position,
        totalPoints: v.totalPoints,
        resultsUrl,
      }).catch((err) => console.error(`[EMAIL] results for ${v.pilot.email} failed:`, err)),
    );

  await Promise.all(sends);
}

export async function getEventCategories(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const cats = await prisma.eventCategory.findMany({
    where: { eventId: event.id },
  });
  res.json(cats);
}

export async function updateEventCategories(req: Request, res: Response): Promise<void> {
  const { categories }: { categories: Category[] } = req.body;
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  // Upsert each category
  for (const cat of categories) {
    await prisma.eventCategory.upsert({
      where: { eventId_category: { eventId: event.id, category: cat } },
      update: { active: true },
      create: { eventId: event.id, category: cat },
    });
  }

  // Deactivate removed categories
  await prisma.eventCategory.updateMany({
    where: { eventId: event.id, category: { notIn: categories } },
    data: { active: false },
  });

  const cats = await prisma.eventCategory.findMany({ where: { eventId: event.id } });
  res.json(cats);
}

export async function getPublicPilots(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: { eventCategories: { where: { active: true } } },
  });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const inscriptions = await prisma.inscription.findMany({
    where: { eventId: event.id },
    include: { pilot: { select: { id: true, name: true, alias: true, photoUrl: true } } },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  });

  // Group by category
  const grouped: Record<string, { pilotId: string; name: string; alias: string | null; photoUrl: string | null; kartNumber: number | null }[]> = {};
  for (const insc of inscriptions) {
    if (!grouped[insc.category]) grouped[insc.category] = [];
    grouped[insc.category].push({
      pilotId: insc.pilot.id,
      name: insc.pilot.name,
      alias: insc.pilot.alias,
      photoUrl: insc.pilot.photoUrl,
      kartNumber: insc.kartNumber,
    });
  }

  const activeCategories = event.eventCategories.map((c) => c.category);
  res.json({ eventName: event.name, status: event.status, activeCategories, pilots: grouped });
}
