import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function listEventGuests(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const guests = await prisma.eventGuest.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(guests);
}

export async function addEventGuest(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const { name, count, notes } = req.body;
  const guest = await prisma.eventGuest.create({
    data: { eventId: event.id, name: name ?? null, count: count ?? 1, notes: notes ?? null },
  });
  res.status(201).json(guest);
}

export async function updateEventGuest(req: Request, res: Response): Promise<void> {
  const { name, count, isPaid, notes } = req.body;
  const guest = await prisma.eventGuest.update({
    where: { id: req.params.guestId },
    data: {
      ...(name !== undefined && { name: name || null }),
      ...(count !== undefined && { count }),
      ...(isPaid !== undefined && { isPaid }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });
  res.json(guest);
}

export async function deleteEventGuest(req: Request, res: Response): Promise<void> {
  await prisma.eventGuest.delete({ where: { id: req.params.guestId } });
  res.status(204).send();
}
