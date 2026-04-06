import { Request, Response } from 'express';
import slugify from 'slugify';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { Category } from '@prisma/client';

export async function listEvents(req: Request, res: Response): Promise<void> {
  const events = await prisma.event.findMany({
    include: { eventCategories: true },
    orderBy: { date: 'desc' },
  });
  res.json(events);
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const { name, date, description, year, serviceFee, foodFee, blockCheckInOnDebt, transferInfo, categories } = req.body;

  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const event = await prisma.event.create({
    data: {
      name,
      slug,
      date: new Date(date),
      description,
      year: year ?? new Date(date).getFullYear(),
      serviceFee: serviceFee ?? 0,
      foodFee: foodFee ?? 0,
      blockCheckInOnDebt: blockCheckInOnDebt ?? false,
      transferInfo: transferInfo ?? null,
      eventCategories: {
        create: (categories as Category[] ?? []).map((c) => ({ category: c })),
      },
    },
    include: { eventCategories: true },
  });
  res.status(201).json(event);
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: { eventCategories: true },
  });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  res.json(event);
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const { name, date, description, year, serviceFee, foodFee, blockCheckInOnDebt, transferInfo } = req.body;
  const event = await prisma.event.update({
    where: { slug: req.params.slug },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(year && { year }),
      ...(serviceFee !== undefined && { serviceFee }),
      ...(foodFee !== undefined && { foodFee }),
      ...(blockCheckInOnDebt !== undefined && { blockCheckInOnDebt }),
      ...(transferInfo !== undefined && { transferInfo }),
    },
    include: { eventCategories: true },
  });
  res.json(event);
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  await prisma.event.delete({ where: { slug: req.params.slug } });
  res.status(204).send();
}

export async function uploadEventPoster(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }

  // Delete old poster if exists
  if (event.posterUrl) {
    const oldPath = `/app${event.posterUrl}`;
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const posterUrl = `/uploads/posters/${req.file.filename}`;
  const updated = await prisma.event.update({
    where: { slug: req.params.slug },
    data: { posterUrl },
    include: { eventCategories: true },
  });
  res.json(updated);
}

export async function deleteEventPoster(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  if (event.posterUrl) {
    const filePath = `/app${event.posterUrl}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const updated = await prisma.event.update({
    where: { slug: req.params.slug },
    data: { posterUrl: null },
    include: { eventCategories: true },
  });
  res.json(updated);
}

export async function patchEventStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body;
  const event = await prisma.event.update({
    where: { slug: req.params.slug },
    data: { status },
  });
  res.json(event);
}

export async function getEventCategories(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const cats = await prisma.eventCategory.findMany({
    where: { eventId: event.id },
  });
  res.json(cats);
}

export async function updateEventCategories(req: Request, res: Response): Promise<void> {
  const { categories }: { categories: Category[] } = req.body;
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  // Upsert each category
  for (const cat of categories) {
    await prisma.eventCategory.upsert({
      where: { eventId_category: { eventId: event.id, category: cat } },
      update: { active: true },
      create: { eventId: event.id, category: cat },
    });
  }

  // Deactivate removed categories
  await prisma.eventCategory.updateMany({
    where: { eventId: event.id, category: { notIn: categories } },
    data: { active: false },
  });

  const cats = await prisma.eventCategory.findMany({ where: { eventId: event.id } });
  res.json(cats);
}
