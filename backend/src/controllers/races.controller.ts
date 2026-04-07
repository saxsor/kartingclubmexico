import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sseManager } from '../lib/sse.js';
import { Category } from '@prisma/client';

export async function listRaces(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const races = await prisma.race.findMany({
    where: { eventId: event.id },
    include: {
      results: {
        include: { inscription: { include: { pilot: true } }, penalties: true },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: [{ category: 'asc' }, { number: 'asc' }],
  });
  res.json(races);
}

export async function createRace(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const { category, number, laps } = req.body;

  const race = await prisma.race.create({
    data: { eventId: event.id, category, number, laps: laps ?? 15 },
    include: { results: true },
  });
  res.status(201).json(race);
}

export async function getRace(req: Request, res: Response): Promise<void> {
  const race = await prisma.race.findUnique({
    where: { id: req.params.raceId },
    include: {
      results: {
        include: {
          inscription: { include: { pilot: true } },
          penalties: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  });
  if (!race) { res.status(404).json({ error: 'Carrera no encontrada' }); return; }
  res.json(race);
}

export async function bulkCreateRaces(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: { eventCategories: { where: { active: true } } },
  });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const { racesPerCategory = 3, laps = 15 } = req.body;
  const count = Math.min(Math.max(parseInt(racesPerCategory) || 3, 1), 10);

  const existing = await prisma.race.findMany({ where: { eventId: event.id }, select: { category: true, number: true } });
  const existingSet = new Set(existing.map((r) => `${r.category}-${r.number}`));

  const toCreate = event.eventCategories.flatMap((ec) =>
    Array.from({ length: count }, (_, i) => i + 1)
      .filter((n) => !existingSet.has(`${ec.category}-${n}`))
      .map((n) => ({ eventId: event.id, category: ec.category as Category, number: n, laps })),
  );

  if (toCreate.length > 0) {
    await prisma.race.createMany({ data: toCreate });
  }

  const races = await prisma.race.findMany({
    where: { eventId: event.id },
    include: { results: { include: { inscription: { include: { pilot: true } }, penalties: true }, orderBy: { position: 'asc' } } },
    orderBy: [{ category: 'asc' }, { number: 'asc' }],
  });

  res.status(201).json(races);
}

export async function deleteRace(req: Request, res: Response): Promise<void> {
  const race = await prisma.race.findUnique({ where: { id: req.params.raceId } });
  if (!race) { res.status(404).json({ error: 'Carrera no encontrada' }); return; }
  if (race.status !== 'PENDING') { res.status(400).json({ error: 'Solo se pueden eliminar carreras en estado PENDING' }); return; }

  await prisma.race.delete({ where: { id: req.params.raceId } });
  res.status(204).send();
}

export async function patchRaceStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body;
  const data: Record<string, unknown> = { status };
  if (status === 'IN_PROGRESS') data.startedAt = new Date();
  if (status === 'FINISHED') data.finishedAt = new Date();

  const race = await prisma.race.update({
    where: { id: req.params.raceId },
    data,
  });

  // Emit SSE
  const event = await prisma.event.findUnique({ where: { id: race.eventId } });
  if (event) {
    sseManager.emit(event.slug, 'race:status', { raceId: race.id, status, category: race.category });
  }

  res.json(race);
}
