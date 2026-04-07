import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { Category, InscriptionStatus } from '@prisma/client';

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

export async function exportInscriptions(req: Request, res: Response): Promise<void> {
  const event = await getEventOrFail(req.params.slug, res);
  if (!event) return;

  const inscriptions = await prisma.inscription.findMany({
    where: { eventId: event.id },
    include: { pilot: true, payments: true, checkIn: true },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
  });

  const rows = [
    '"Nombre","Alias","Email","Teléfono","Categoría","Kart","Estado","Pago Total","Check-in","Auto-registro","Fecha inscripción"',
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
