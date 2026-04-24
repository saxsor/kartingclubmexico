import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { Category, InscriptionStatus } from '@prisma/client';
import { recalculateChampionship, recalculateConstructorStandings } from '../services/championship.service.js';
import { calculateInscriptionFees, calculateMultipleInscriptionsFees, syncPilotEventInscriptions } from '../lib/fees.js';

async function getEventOrFail(slug: string, res: Response) {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return null; }
  return event;
}

export async function listInscriptions(req: Request, res: Response): Promise<void> {
  const event = await getEventOrFail(req.params.slug, res);
  if (!event) return;

  const { page, pageSize, skip } = getPaginationParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  // Explicit category filter
  const categoryParam = typeof req.query.category === 'string' ? req.query.category.toUpperCase() : '';
  const categoryFilter = (Object.values(Category) as string[]).includes(categoryParam)
    ? categoryParam as Category
    : null;

  // Explicit status filter
  const statusParam = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
  const statusFilter = (Object.values(InscriptionStatus) as string[]).includes(statusParam)
    ? statusParam as InscriptionStatus
    : null;

  const where = {
    eventId: event.id,
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search
      ? {
          OR: [
            { pilot: { name: { contains: search, mode: 'insensitive' as const } } },
            { pilot: { alias: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'createdAt';
  const sortDir = req.query.sortDir === 'desc' ? 'desc' : 'asc';
  const orderBy: Record<string, unknown> =
    sortBy === 'name' ? { pilot: { name: sortDir } } :
    sortBy === 'category' ? { category: sortDir } :
    sortBy === 'kart' ? { kartNumber: sortDir } :
    sortBy === 'status' ? { status: sortDir } :
    { createdAt: 'asc' };

  const [inscriptions, total] = await prisma.$transaction([
    prisma.inscription.findMany({
      where,
      include: {
        pilot: true,
        payments: true,
        checkIn: true,
        event: true,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: orderBy as any,
      skip,
      take: pageSize,
    }),
    prisma.inscription.count({ where }),
  ]);

  const feesMap = await calculateMultipleInscriptionsFees(inscriptions as any);
  const items = inscriptions.map((i) => ({
    ...i,
    ...feesMap[i.id],
  }));

  res.json({
    items,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function createInscription(req: Request, res: Response): Promise<void> {
  const event = await getEventOrFail(req.params.slug, res);
  if (!event) return;

  const { pilotId, category, kartNumber, notes, companions, engine } = req.body;

  const inscription = await prisma.$transaction(async (tx) => {
    const insc = await tx.inscription.create({
      data: { eventId: event.id, pilotId, category, kartNumber, notes, companions: companions ?? 0, engine },
      include: { pilot: true, payments: true, checkIn: true, event: true },
    });
    await syncPilotEventInscriptions(pilotId, event.id, tx);
    return insc;
  });

  const fees = await calculateInscriptionFees(inscription.id);
  res.status(201).json({ ...inscription, ...fees });
}

export async function getInscription(req: Request, res: Response): Promise<void> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: { pilot: true, payments: true, checkIn: true, event: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  const fees = await calculateInscriptionFees(inscription.id);
  res.json({ ...inscription, ...fees });
}

export async function updateInscription(req: Request, res: Response): Promise<void> {
  const { category, kartNumber, kartNotes, notes, status, companions, engine, exentoCarrera, exentoComida } = req.body;
  const existing = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: {
      event: true,
      checkIn: true,
      raceResults: {
        include: {
          race: {
            include: { event: true },
          },
        },
      },
    },
  });
  if (!existing) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  const categoryChanged = category !== undefined && category !== existing.category;
  const affected = new Set<string>();
  for (const result of existing.raceResults) {
    affected.add(`${result.race.event.year}:${result.race.category}`);
  }
  if (categoryChanged) {
    affected.add(`${existing.event.year}:${existing.category}`);
    affected.add(`${existing.event.year}:${category}`);
  }

  const inscription = await prisma.$transaction(async (tx) => {
    if (categoryChanged) {
      await tx.startGridPosition.deleteMany({ where: { inscriptionId: existing.id } });
      await tx.raceResult.deleteMany({ where: { inscriptionId: existing.id } });
    }

    const updated = await tx.inscription.update({
      where: { id: existing.id },
      data: {
        ...(category !== undefined && { category }),
        ...(kartNumber !== undefined && { kartNumber }),
        ...(kartNotes !== undefined && { kartNotes: kartNotes || null }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(companions !== undefined && { companions }),
        ...(engine !== undefined && { engine }),
        ...(exentoCarrera !== undefined && { exentoCarrera }),
        ...(exentoComida !== undefined && { exentoComida }),
      },
      include: { pilot: true, payments: true, checkIn: true, event: true },
    });

    // Recalculate status when exemptions or companions change
    if (exentoCarrera !== undefined || exentoComida !== undefined || companions !== undefined) {
      await syncPilotEventInscriptions(updated.pilotId, updated.eventId, tx);
      // Refresh updated object with new status
      const refreshed = await tx.inscription.findUnique({
        where: { id: updated.id },
        include: { pilot: true, payments: true, checkIn: true, event: true },
      });
      return refreshed!;
    }

    if (status !== undefined && updated.checkIn) {
      await tx.checkIn.update({
        where: { inscriptionId: updated.id },
        data: { hasDebt: status !== 'PAID' },
      });
    }

    if (categoryChanged && updated.checkIn) {
      const newEventCategory = await tx.eventCategory.findUnique({
        where: {
          eventId_category: {
            eventId: updated.eventId,
            category: updated.category,
          },
        },
      });

      if (newEventCategory) {
        const newGrid = await tx.startGrid.findUnique({
          where: { eventCategoryId: newEventCategory.id },
          include: { positions: { orderBy: { position: 'desc' }, take: 1 } },
        });

        if (newGrid) {
          const nextPosition = (newGrid.positions[0]?.position ?? 0) + 1;
          await tx.startGridPosition.create({
            data: {
              startGridId: newGrid.id,
              inscriptionId: updated.id,
              position: nextPosition,
            },
          });
        }
      }
    }

    return updated;
  });

  for (const key of affected) {
    const [year, affectedCategory] = key.split(':');
    await recalculateChampionship(parseInt(year, 10), affectedCategory as Category);
    await recalculateConstructorStandings(parseInt(year, 10), affectedCategory as Category);
  }

  const fees = await calculateInscriptionFees(inscription.id);
  const { event: _event, ...rest } = inscription;
  res.json({ ...rest, ...fees });
}

export async function deleteInscription(req: Request, res: Response): Promise<void> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: {
      raceResults: { include: { race: { include: { event: true } } } },
    },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  // Collect affected category/year pairs for championship recalculation
  const affected = new Set<string>();
  for (const r of inscription.raceResults) {
    affected.add(`${r.race.event.year}:${r.race.category}`);
  }

  await prisma.$transaction(async (tx) => {
    // Delete grid positions (no cascade in schema)
    await tx.startGridPosition.deleteMany({ where: { inscriptionId: inscription.id } });
    // Delete race results and their penalties (penalties cascade from RaceResult)
    await tx.raceResult.deleteMany({ where: { inscriptionId: inscription.id } });
    // Delete the inscription (check-in and payments cascade automatically)
    await tx.inscription.delete({ where: { id: inscription.id } });

    // Sync remaining inscriptions because the "first" one might have changed
    await syncPilotEventInscriptions(inscription.pilotId, inscription.eventId, tx);
  });

  // Recalculate championship for any affected category/year
  for (const key of affected) {
    const [year, category] = key.split(':');
    await recalculateChampionship(parseInt(year), category as Category);
  }

  res.status(204).send();
}

export async function exportInscriptions(req: Request, res: Response): Promise<void> {
  const event = await getEventOrFail(req.params.slug, res);
  if (!event) return;

  const inscriptions = await prisma.inscription.findMany({
    where: { eventId: event.id },
    include: { pilot: true, payments: true, checkIn: true },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  });

  const rows = [
    '"Nombre","Alias","Email","Teléfono","Categoría","Kart","Motor","Estado","Pago Total","Check-in","Auto-registro","Fecha inscripción"',
    ...inscriptions.map((i) => {
      const totalPaid = i.payments.reduce((s, p) => s + Number(p.amount), 0);
      const fmtMXN = (n: number) => n.toFixed(2);
      return [
        `"${i.pilot.name}"`,
        `"${i.pilot.alias ?? ''}"`,
        `"${i.pilot.email ?? ''}"`,
        `"${i.pilot.phone ?? ''}"`,
        `"${i.category}"`,
        `"${i.kartNumber ?? ''}"`,
        `"${i.engine ?? ''}"`,
        `"${i.status}"`,
        `"${fmtMXN(totalPaid)}"`,
        `"${i.checkIn ? 'Sí' : 'No'}"`,
        `"${i.selfRegistered ? 'Sí' : 'No'}"`,
        `"${new Date(i.createdAt).toLocaleString('es-MX')}"`,
      ].join(',');
    }),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.slug}-inscripciones.csv"`);
  res.send('\uFEFF' + rows); // BOM for Excel UTF-8
}
