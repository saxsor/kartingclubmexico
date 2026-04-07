import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Category } from '@prisma/client';

export async function listChampionships(_req: Request, res: Response): Promise<void> {
  const championships = await prisma.championship.findMany({
    orderBy: [{ year: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { events: true } },
    },
  });
  res.json(championships);
}

export async function createChampionship(req: Request, res: Response): Promise<void> {
  const { name, year } = req.body;
  const championship = await prisma.championship.create({
    data: {
      name,
      year: year ?? new Date().getFullYear(),
    },
    include: { _count: { select: { events: true } } },
  });
  res.status(201).json(championship);
}

export async function getChampionshipById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const championship = await prisma.championship.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { date: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          date: true,
          status: true,
          year: true,
          eventCategories: { where: { active: true }, select: { category: true } },
        },
      },
    },
  });
  if (!championship) {
    res.status(404).json({ error: 'Campeonato no encontrado' });
    return;
  }
  res.json(championship);
}

export async function updateChampionship(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, year } = req.body;
  const championship = await prisma.championship.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(year !== undefined && { year }),
    },
    include: { _count: { select: { events: true } } },
  });
  res.json(championship);
}

export async function deleteChampionship(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.event.updateMany({ where: { championshipId: id }, data: { championshipId: null } });
  await prisma.championship.delete({ where: { id } });
  res.status(204).send();
}

export async function getChampionshipStandings(req: Request, res: Response): Promise<void> {
  const { id, category } = req.params;

  const championship = await prisma.championship.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { date: 'asc' },
        select: { id: true, name: true, slug: true, date: true, status: true },
      },
    },
  });
  if (!championship) {
    res.status(404).json({ error: 'Campeonato no encontrado' });
    return;
  }

  const eventIds = championship.events.map((e) => e.id);
  if (eventIds.length === 0) {
    res.json({ championship: { id: championship.id, name: championship.name, year: championship.year }, category, events: [], standings: [] });
    return;
  }

  const races = await prisma.race.findMany({
    where: {
      eventId: { in: eventIds },
      category: category as Category,
      status: 'FINISHED',
    },
    include: {
      results: {
        include: {
          inscription: {
            select: {
              pilotId: true,
              pilot: {
                select: { id: true, name: true, alias: true, kartNumber: true, photoUrl: true },
              },
            },
          },
        },
      },
    },
  });

  // Aggregate points per pilot per event
  const pilotMap = new Map<string, {
    pilot: { id: string; name: string; alias: string | null; kartNumber: number | null; photoUrl: string | null };
    eventPoints: Map<string, number>;
    totalPoints: number;
  }>();

  for (const race of races) {
    for (const result of race.results) {
      const { pilotId, pilot } = result.inscription;
      if (!pilotMap.has(pilotId)) {
        pilotMap.set(pilotId, { pilot, eventPoints: new Map(), totalPoints: 0 });
      }
      const data = pilotMap.get(pilotId)!;
      const current = data.eventPoints.get(race.eventId) ?? 0;
      data.eventPoints.set(race.eventId, current + result.finalPoints);
      data.totalPoints += result.finalPoints;
    }
  }

  const sorted = Array.from(pilotMap.entries()).sort(([, a], [, b]) => b.totalPoints - a.totalPoints);
  const leaderPoints = sorted[0]?.[1].totalPoints ?? 0;

  const standings = sorted.map(([, data], idx) => ({
    position: idx + 1,
    pilotId: data.pilot.id,
    pilotName: data.pilot.name,
    alias: data.pilot.alias,
    kartNumber: data.pilot.kartNumber,
    photoUrl: data.pilot.photoUrl,
    eventPoints: Object.fromEntries(data.eventPoints),
    totalPoints: data.totalPoints,
    gap: leaderPoints - data.totalPoints,
  }));

  // Only include events that have finished races in this category
  const eventsWithRaces = championship.events.filter((e) =>
    races.some((r) => r.eventId === e.id),
  );

  res.json({
    championship: { id: championship.id, name: championship.name, year: championship.year },
    category: category as Category,
    events: eventsWithRaces,
    allEvents: championship.events,
    standings,
  });
}

// List all events not yet in any championship (for assignment UI)
export async function getUnassignedEvents(_req: Request, res: Response): Promise<void> {
  const events = await prisma.event.findMany({
    where: { championshipId: null },
    orderBy: { date: 'desc' },
    select: { id: true, name: true, slug: true, date: true, status: true, year: true },
  });
  res.json(events);
}
