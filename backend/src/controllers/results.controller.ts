import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sseManager } from '../lib/sse.js';
import { calculatePoints } from '../services/points.service.js';
import { recalculateChampionship } from '../services/championship.service.js';
import { generateResultsPdf, generateCsvResults } from '../services/pdf.service.js';
import { Category, ResultStatus } from '@prisma/client';

interface ResultInput {
  inscriptionId: string;
  position: number | null;
  lapsCompleted: number;
  status: ResultStatus;
}

export async function saveRaceResults(req: Request, res: Response): Promise<void> {
  const { results }: { results: ResultInput[] } = req.body;

  const race = await prisma.race.findUnique({
    where: { id: req.params.raceId },
    include: { event: true },
  });
  if (!race) { res.status(404).json({ error: 'Carrera no encontrada' }); return; }

  // Upsert each result
  for (const r of results) {
    const basePoints = calculatePoints(r.position, r.status);

    const existing = await prisma.raceResult.findUnique({
      where: { raceId_inscriptionId: { raceId: race.id, inscriptionId: r.inscriptionId } },
      include: { penalties: true },
    });

    const penaltyPoints = existing
      ? existing.penalties.filter((p) => p.type === 'POINTS').reduce((s, p) => s + p.amount, 0)
      : 0;

    const finalPoints = Math.max(0, basePoints - penaltyPoints);

    await prisma.raceResult.upsert({
      where: { raceId_inscriptionId: { raceId: race.id, inscriptionId: r.inscriptionId } },
      update: {
        position: r.position,
        lapsCompleted: r.lapsCompleted,
        status: r.status,
        basePoints,
        penaltyPoints,
        finalPoints,
      },
      create: {
        raceId: race.id,
        inscriptionId: r.inscriptionId,
        position: r.position,
        lapsCompleted: r.lapsCompleted,
        status: r.status,
        basePoints,
        penaltyPoints,
        finalPoints,
      },
    });
  }

  // Recalculate championship
  await recalculateChampionship(race.event.year, race.category);

  // Emit SSE
  sseManager.emit(race.event.slug, 'race:results', {
    raceId: race.id,
    category: race.category,
    number: race.number,
  });

  const updatedRace = await prisma.race.findUnique({
    where: { id: race.id },
    include: {
      results: {
        include: { inscription: { include: { pilot: true } }, penalties: true },
        orderBy: { position: 'asc' },
      },
    },
  });
  res.json(updatedRace);
}

export async function addPenalty(req: Request, res: Response): Promise<void> {
  const { type, amount, reason } = req.body;

  const penalty = await prisma.penalty.create({
    data: { raceResultId: req.params.resultId, type, amount, reason },
  });

  // Recalculate finalPoints for this result
  const raceResult = await prisma.raceResult.findUnique({
    where: { id: req.params.resultId },
    include: { penalties: true, race: { include: { event: true } } },
  });

  if (raceResult) {
    const penaltyPoints = raceResult.penalties
      .filter((p) => p.type === 'POINTS')
      .reduce((s, p) => s + p.amount, 0);
    const finalPoints = Math.max(0, raceResult.basePoints - penaltyPoints);
    await prisma.raceResult.update({
      where: { id: raceResult.id },
      data: { penaltyPoints, finalPoints },
    });

    await recalculateChampionship(raceResult.race.event.year, raceResult.race.category);
  }

  res.status(201).json(penalty);
}

export async function deletePenalty(req: Request, res: Response): Promise<void> {
  const penalty = await prisma.penalty.findUnique({ where: { id: req.params.penaltyId } });
  if (!penalty) { res.status(404).json({ error: 'Penalización no encontrada' }); return; }

  await prisma.penalty.delete({ where: { id: penalty.id } });

  // Recalculate
  const raceResult = await prisma.raceResult.findUnique({
    where: { id: penalty.raceResultId },
    include: { penalties: true, race: { include: { event: true } } },
  });

  if (raceResult) {
    const remainingPenalties = await prisma.penalty.findMany({
      where: { raceResultId: raceResult.id },
    });
    const penaltyPoints = remainingPenalties
      .filter((p) => p.type === 'POINTS')
      .reduce((s, p) => s + p.amount, 0);
    const finalPoints = Math.max(0, raceResult.basePoints - penaltyPoints);
    await prisma.raceResult.update({
      where: { id: raceResult.id },
      data: { penaltyPoints, finalPoints },
    });
    await recalculateChampionship(raceResult.race.event.year, raceResult.race.category);
  }

  res.status(204).send();
}

export async function getEventResults(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const races = await prisma.race.findMany({
    where: { eventId: event.id, status: 'FINISHED' },
    include: {
      results: {
        include: {
          inscription: { include: { pilot: true } },
          penalties: true,
        },
      },
    },
    orderBy: [{ category: 'asc' }, { number: 'asc' }],
  });

  res.json(races);
}

export async function getEventResultsByCategory(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const category = req.params.category as Category;

  const races = await prisma.race.findMany({
    where: { eventId: event.id, category, status: 'FINISHED' },
    include: {
      results: {
        include: {
          inscription: { include: { pilot: true } },
          penalties: true,
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { number: 'asc' },
  });

  // Build classification
  const pilotMap = new Map<string, {
    pilotId: string;
    pilotName: string;
    alias: string | null;
    kartNumber: number | null;
    photoUrl: string | null;
    races: Record<number, number>;
    total: number;
    race3Best: number;
    race2Best: number;
    race1Best: number;
  }>();

  for (const race of races) {
    for (const result of race.results) {
      const { pilot } = result.inscription;
      if (!pilotMap.has(pilot.id)) {
        pilotMap.set(pilot.id, {
          pilotId: pilot.id,
          pilotName: pilot.name,
          alias: pilot.alias,
          kartNumber: result.inscription.kartNumber,
          photoUrl: pilot.photoUrl ?? null,
          races: {},
          total: 0,
          race3Best: 0,
          race2Best: 0,
          race1Best: 0,
        });
      }
      const entry = pilotMap.get(pilot.id)!;
      entry.races[race.number] = result.finalPoints;
      entry.total += result.finalPoints;
      if (race.number === 3) entry.race3Best = result.finalPoints;
      if (race.number === 2) entry.race2Best = result.finalPoints;
      if (race.number === 1) entry.race1Best = result.finalPoints;
    }
  }

  // Sort: total desc, then race3 desc, race2 desc, race1 desc
  const sorted = Array.from(pilotMap.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.race3Best !== a.race3Best) return b.race3Best - a.race3Best;
    if (b.race2Best !== a.race2Best) return b.race2Best - a.race2Best;
    return b.race1Best - a.race1Best;
  });

  const leaderTotal = sorted[0]?.total ?? 0;
  const classification = sorted.map((p, idx) => ({
    position: idx + 1,
    ...p,
    gap: leaderTotal - p.total,
  }));

  res.json({ category, races: races.map((r) => r.number), classification });
}

export async function exportResults(req: Request, res: Response): Promise<void> {
  const format = (req.query.format as string) ?? 'pdf';
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const categories = await prisma.eventCategory.findMany({ where: { eventId: event.id, active: true } });

  // For simplicity, export all categories combined or we can use query param ?category=
  const categoryFilter = req.query.category as Category | undefined;

  const rows: {
    position: number | null;
    pilotName: string;
    alias: string | null;
    kartNumber: number | null;
    race1: number;
    race2: number;
    race3: number;
    total: number;
  }[] = [];

  const catsToExport = categoryFilter
    ? categories.filter((c) => c.category === categoryFilter)
    : categories;

  for (const ec of catsToExport) {
    const races = await prisma.race.findMany({
      where: { eventId: event.id, category: ec.category, status: 'FINISHED' },
      include: {
        results: {
          include: { inscription: { include: { pilot: true } } },
        },
      },
      orderBy: { number: 'asc' },
    });

    const pilotMap = new Map<string, typeof rows[0]>();
    for (const race of races) {
      for (const result of race.results) {
        const { pilot } = result.inscription;
        if (!pilotMap.has(pilot.id)) {
          pilotMap.set(pilot.id, {
            position: null,
            pilotName: pilot.name,
            alias: pilot.alias,
            kartNumber: result.inscription.kartNumber,
            race1: 0, race2: 0, race3: 0, total: 0,
          });
        }
        const entry = pilotMap.get(pilot.id)!;
        if (race.number === 1) entry.race1 = result.finalPoints;
        if (race.number === 2) entry.race2 = result.finalPoints;
        if (race.number === 3) entry.race3 = result.finalPoints;
        entry.total = entry.race1 + entry.race2 + entry.race3;
      }
    }

    const sorted = Array.from(pilotMap.values())
      .sort((a, b) => b.total - a.total)
      .map((r, idx) => ({ ...r, position: idx + 1 }));
    rows.push(...sorted);
  }

  if (format === 'csv') {
    const csv = generateCsvResults(event.name, categoryFilter ?? 'Todas', rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-results.csv"`);
    res.send(csv);
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-results.pdf"`);
  const pdfStream = generateResultsPdf(event.name, categoryFilter ?? 'Todas las categorías', rows);
  pdfStream.pipe(res);
}
