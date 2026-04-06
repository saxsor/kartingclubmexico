import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { Category } from '@prisma/client';

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
  const categorySearch = search.toUpperCase();
  const categoryMatch = (Object.values(Category) as string[]).includes(categorySearch)
    ? categorySearch as Category
    : null;

  const where = {
    eventId: event.id,
    ...(search
      ? {
          OR: [
            { pilot: { name: { contains: search, mode: 'insensitive' as const } } },
            { pilot: { alias: { contains: search, mode: 'insensitive' as const } } },
            ...(categoryMatch ? [{ category: categoryMatch }] : []),
          ],
        }
      : {}),
  };

  const [inscriptions, total] = await prisma.$transaction([
    prisma.inscription.findMany({
      where,
      include: {
        pilot: true,
        payments: true,
        checkIn: true,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.inscription.count({ where }),
  ]);

  res.json({
    items: inscriptions,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function createInscription(req: Request, res: Response): Promise<void> {
  const event = await getEventOrFail(req.params.slug, res);
  if (!event) return;

  const { pilotId, category, kartNumber, notes } = req.body;

  const inscription = await prisma.inscription.create({
    data: { eventId: event.id, pilotId, category, kartNumber, notes },
    include: { pilot: true, payments: true, checkIn: true },
  });
  res.status(201).json(inscription);
}

export async function getInscription(req: Request, res: Response): Promise<void> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: { pilot: true, payments: true, checkIn: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }
  res.json(inscription);
}

export async function updateInscription(req: Request, res: Response): Promise<void> {
  const { category, kartNumber, notes, status } = req.body;
  const inscription = await prisma.inscription.update({
    where: { id: req.params.id },
    data: {
      ...(category !== undefined && { category }),
      ...(kartNumber !== undefined && { kartNumber }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
    include: { pilot: true, payments: true, checkIn: true },
  });
  res.json(inscription);
}

export async function deleteInscription(req: Request, res: Response): Promise<void> {
  await prisma.inscription.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
