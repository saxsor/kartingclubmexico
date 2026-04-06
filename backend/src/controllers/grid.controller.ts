import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sseManager } from '../lib/sse.js';
import { Category } from '@prisma/client';

export async function getAllGrids(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const grids = await prisma.startGrid.findMany({
    where: { eventCategory: { eventId: event.id } },
    include: {
      eventCategory: true,
      positions: {
        include: {
          inscription: { include: { pilot: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
  });
  res.json(grids);
}

export async function getGridByCategory(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const category = req.params.category as Category;
  const eventCategory = await prisma.eventCategory.findUnique({
    where: { eventId_category: { eventId: event.id, category } },
  });
  if (!eventCategory) { res.status(404).json({ error: 'Categoría no encontrada en este evento' }); return; }

  const grid = await prisma.startGrid.findUnique({
    where: { eventCategoryId: eventCategory.id },
    include: {
      positions: {
        include: {
          inscription: { include: { pilot: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
  });
  res.json(grid ?? null);
}

export async function drawGrid(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const category = req.params.category as Category;
  const drawnBy = req.user?.name ?? 'Sistema';

  const eventCategory = await prisma.eventCategory.findUnique({
    where: { eventId_category: { eventId: event.id, category } },
  });
  if (!eventCategory) { res.status(404).json({ error: 'Categoría no encontrada en este evento' }); return; }

  // Get checked-in inscriptions for this category
  const inscriptions = await prisma.inscription.findMany({
    where: { eventId: event.id, category, checkIn: { isNot: null } },
    include: { pilot: true, checkIn: true },
  });

  if (inscriptions.length === 0) {
    res.status(400).json({ error: 'No hay pilotos con check-in para esta categoría' });
    return;
  }

  // Shuffle
  const shuffled = [...inscriptions].sort(() => Math.random() - 0.5);

  const grid = await prisma.$transaction(async (tx) => {
    const existing = await tx.startGrid.findUnique({
      where: { eventCategoryId: eventCategory.id },
    });
    if (existing) {
      await tx.startGrid.delete({ where: { id: existing.id } });
    }

    return tx.startGrid.create({
      data: {
        eventCategoryId: eventCategory.id,
        drawnBy,
        positions: {
          create: shuffled.map((insc, idx) => ({
            inscriptionId: insc.id,
            position: idx + 1,
          })),
        },
      },
      include: {
        positions: {
          include: { inscription: { include: { pilot: true } } },
          orderBy: { position: 'asc' },
        },
      },
    });
  });

  sseManager.emit(req.params.slug, 'grid:updated', { category, gridId: grid.id });
  res.status(201).json(grid);
}

export async function deleteGrid(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const category = req.params.category as Category;
  const eventCategory = await prisma.eventCategory.findUnique({
    where: { eventId_category: { eventId: event.id, category } },
  });
  if (!eventCategory) { res.status(404).json({ error: 'Categoría no encontrada' }); return; }

  const grid = await prisma.startGrid.findUnique({ where: { eventCategoryId: eventCategory.id } });
  if (!grid) { res.status(404).json({ error: 'Parrilla no encontrada' }); return; }

  await prisma.startGrid.delete({ where: { id: grid.id } });
  res.status(204).send();
}
