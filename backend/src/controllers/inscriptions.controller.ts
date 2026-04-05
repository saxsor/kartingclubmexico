import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

async function getEventOrFail(slug: string, res: Response) {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return null; }
  return event;
}

export async function listInscriptions(req: Request, res: Response): Promise<void> {
  const event = await getEventOrFail(req.params.slug, res);
  if (!event) return;

  const inscriptions = await prisma.inscription.findMany({
    where: { eventId: event.id },
    include: {
      pilot: true,
      payments: true,
      checkIn: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(inscriptions);
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
