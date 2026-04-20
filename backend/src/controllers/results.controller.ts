import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sseManager } from '../lib/sse.js';
import { calculatePoints } from '../services/points.service.js';
import { recalculateChampionship, recalculateConstructorStandings } from '../services/championship.service.js';
import { generateResultsPdf, generateCsvResults, generateParticipationDiplomaPdf } from '../services/pdf.service.js';
import { deleteFromDrive, isDriveValue, streamFromDrive, uploadToDrive } from '../lib/drive.service.js';
import { Category, ResultStatus } from '@prisma/client';

interface ResultInput {
  inscriptionId: string;
  position: number | null;
  lapsCompleted: number;
  status: ResultStatus;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function saveRaceResults(req: Request, res: Response): Promise<void> {
  const { results }: { results: ResultInput[] } = req.body;
  const user = req.user!;

  const race = await prisma.race.findUnique({
    where: { id: req.params.raceId },
    include: { event: true },
  });
  if (!race) { res.status(404).json({ error: 'Carrera no encontrada' }); return; }

  const isFinishedEvent = race.event.status === 'FINISHED';
  if (isFinishedEvent && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Solo el ADMIN puede editar resultados de un evento finalizado' });
    return;
  }

  // Pre-load team snapshots for all inscriptions in this batch
  const inscriptionIds = results.map((r) => r.inscriptionId);
  const inscriptions = await prisma.inscription.findMany({
    where: { id: { in: inscriptionIds } },
    select: { id: true, pilot: { select: { teamId: true } } },
  });
  const teamByInscription = new Map(inscriptions.map((i) => [i.id, i.pilot.teamId ?? null]));

  await prisma.$transaction(async (tx) => {
    for (const r of results) {
      const basePoints = calculatePoints(r.position, r.status);

      const existing = await tx.raceResult.findUnique({
        where: { raceId_inscriptionId: { raceId: race.id, inscriptionId: r.inscriptionId } },
        include: { penalties: true },
      });

      const penaltyPoints = existing
        ? existing.penalties.filter((p) => p.type === 'POINTS').reduce((s, p) => s + p.amount, 0)
        : 0;

      const finalPoints = Math.max(0, basePoints - penaltyPoints);
      const teamId = teamByInscription.get(r.inscriptionId) ?? null;

      const upserted = await tx.raceResult.upsert({
        where: { raceId_inscriptionId: { raceId: race.id, inscriptionId: r.inscriptionId } },
        update: {
          position: r.position,
          lapsCompleted: r.lapsCompleted,
          status: r.status,
          basePoints,
          penaltyPoints,
          finalPoints,
          teamId,
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
          teamId,
        },
      });

      if (isFinishedEvent && existing) {
        const before = {
          position: existing.position, status: existing.status,
          basePoints: existing.basePoints, finalPoints: existing.finalPoints,
        };
        const after = {
          position: upserted.position, status: upserted.status,
          basePoints: upserted.basePoints, finalPoints: upserted.finalPoints,
        };
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          await tx.auditLog.create({
            data: {
              userId: user.sub,
              userEmail: user.email,
              action: 'UPDATE_RACE_RESULT',
              entityType: 'RaceResult',
              entityId: upserted.id,
              before,
              after,
              eventId: race.eventId,
            },
          });
        }
      }
    }
  });

  // Recalculate championship standings
  await recalculateChampionship(race.event.year, race.category);
  await recalculateConstructorStandings(race.event.year, race.category);

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

  const { penalty, raceResult } = await prisma.$transaction(async (tx) => {
    const penalty = await tx.penalty.create({
      data: { raceResultId: req.params.resultId, type, amount, reason },
    });

    const raceResult = await tx.raceResult.findUnique({
      where: { id: req.params.resultId },
      include: { penalties: true, race: { include: { event: true } } },
    });

    if (raceResult) {
      if (type === 'POINTS') {
        const penaltyPoints = raceResult.penalties
          .filter((p) => p.type === 'POINTS')
          .reduce((s, p) => s + p.amount, 0);
        const finalPoints = Math.max(0, raceResult.basePoints - penaltyPoints);
        await tx.raceResult.update({
          where: { id: raceResult.id },
          data: { penaltyPoints, finalPoints },
        });
      } else if (type === 'POSITIONS' && raceResult.position !== null) {
        // Get all FINISHED results for this race ordered by current position
        const raceResults = await tx.raceResult.findMany({
          where: { raceId: raceResult.raceId, status: 'FINISHED', position: { not: null } },
          orderBy: { position: 'asc' },
        });

        const currentPos = raceResult.position;
        const maxPos = raceResults.length;
        const newPos = Math.min(currentPos + amount, maxPos);

        if (newPos !== currentPos) {
          // Shift pilots in range (currentPos+1 .. newPos) up by 1 position
          for (const r of raceResults) {
            if (r.position === null) continue;
            if (r.id === raceResult.id) {
              const newBase = calculatePoints(newPos, r.status);
              await tx.raceResult.update({
                where: { id: r.id },
                data: { position: newPos, basePoints: newBase, finalPoints: newBase },
              });
            } else if (r.position > currentPos && r.position <= newPos) {
              const shiftedPos = r.position - 1;
              const newBase = calculatePoints(shiftedPos, r.status);
              await tx.raceResult.update({
                where: { id: r.id },
                data: {
                  position: shiftedPos,
                  basePoints: newBase,
                  finalPoints: Math.max(0, newBase - r.penaltyPoints),
                },
              });
            }
          }
        }
      }
    }

    return { penalty, raceResult };
  });

  if (raceResult) {
    await recalculateChampionship(raceResult.race.event.year, raceResult.race.category);
  }

  res.status(201).json(penalty);
}

export async function deletePenalty(req: Request, res: Response): Promise<void> {
  const penalty = await prisma.penalty.findUnique({ where: { id: req.params.penaltyId } });
  if (!penalty) { res.status(404).json({ error: 'Penalización no encontrada' }); return; }

  const raceResult = await prisma.$transaction(async (tx) => {
    const raceResult = await tx.raceResult.findUnique({
      where: { id: penalty.raceResultId },
      include: { penalties: true, race: { include: { event: true } } },
    });

    await tx.penalty.delete({ where: { id: penalty.id } });

    if (raceResult) {
      if (penalty.type === 'POINTS') {
        const remainingPenaltyPoints = raceResult.penalties
          .filter((p) => p.id !== penalty.id && p.type === 'POINTS')
          .reduce((s, p) => s + p.amount, 0);
        const finalPoints = Math.max(0, raceResult.basePoints - remainingPenaltyPoints);
        await tx.raceResult.update({
          where: { id: raceResult.id },
          data: { penaltyPoints: remainingPenaltyPoints, finalPoints },
        });
      } else if (penalty.type === 'POSITIONS' && raceResult.position !== null) {
        // Reverse the position penalty: move the pilot back up by `amount` positions
        const raceResults = await tx.raceResult.findMany({
          where: { raceId: raceResult.raceId, status: 'FINISHED', position: { not: null } },
          orderBy: { position: 'asc' },
        });

        const currentPos = raceResult.position;
        const originalPos = Math.max(1, currentPos - penalty.amount);

        if (originalPos !== currentPos) {
          // Shift pilots in range (originalPos .. currentPos-1) down by 1 position
          for (const r of raceResults) {
            if (r.position === null) continue;
            if (r.id === raceResult.id) {
              const restoredBase = calculatePoints(originalPos, r.status);
              await tx.raceResult.update({
                where: { id: r.id },
                data: { position: originalPos, basePoints: restoredBase, finalPoints: restoredBase },
              });
            } else if (r.position >= originalPos && r.position < currentPos) {
              const shiftedPos = r.position + 1;
              const newBase = calculatePoints(shiftedPos, r.status);
              await tx.raceResult.update({
                where: { id: r.id },
                data: {
                  position: shiftedPos,
                  basePoints: newBase,
                  finalPoints: Math.max(0, newBase - r.penaltyPoints),
                },
              });
            }
          }
        }
      }
    }

    return raceResult;
  });

  if (raceResult) {
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

export async function downloadParticipationDiploma(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  if (event.status !== 'FINISHED') { res.status(403).json({ error: 'Los diplomas se habilitan al finalizar el evento' }); return; }
  if (!event.diplomaTemplateUrl) { res.status(404).json({ error: 'Este evento no tiene diploma configurado' }); return; }

  const inscription = await prisma.inscription.findFirst({
    where: {
      eventId: event.id,
      pilotId: req.params.pilotId,
      checkIn: { isNot: null },
    },
    include: {
      pilot: { select: { id: true, name: true } },
      checkIn: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!inscription) {
    res.status(404).json({ error: 'No hay diploma disponible para este piloto' });
    return;
  }

  const existing = await prisma.participationDiploma.findUnique({
    where: { eventId_pilotId: { eventId: event.id, pilotId: inscription.pilotId } },
  });

  const filename = `${event.slug}-${inscription.pilot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-diploma.pdf`;

  if (existing && isDriveValue(existing.fileUrl)) {
    const { stream } = await streamFromDrive(existing.fileUrl);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
    return;
  }

  const { stream: templateStream, mimeType } = await streamFromDrive(event.diplomaTemplateUrl);
  const templateBuffer = await streamToBuffer(templateStream);
  const pdfBuffer = await generateParticipationDiplomaPdf({
    pilotName: inscription.pilot.name,
    templateBuffer,
    templateMimeType: mimeType,
    nameYRatio: event.diplomaNameY,
    fontSize: event.diplomaFontSize,
    textColor: event.diplomaTextColor,
  });

  const fileUrl = await uploadToDrive('diplomas', pdfBuffer, filename, 'application/pdf', false);

  if (existing && isDriveValue(existing.fileUrl)) {
    await deleteFromDrive(existing.fileUrl);
  }

  await prisma.participationDiploma.upsert({
    where: { eventId_pilotId: { eventId: event.id, pilotId: inscription.pilotId } },
    update: { inscriptionId: inscription.id, fileUrl },
    create: {
      eventId: event.id,
      pilotId: inscription.pilotId,
      inscriptionId: inscription.id,
      fileUrl,
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
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
