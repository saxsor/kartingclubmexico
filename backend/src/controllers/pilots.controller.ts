import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';

export async function listPilots(req: Request, res: Response): Promise<void> {
  const { page, pageSize, skip } = getPaginationParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const parsedKartNumber = search && /^\d+$/.test(search) ? Number(search) : undefined;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { alias: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          ...(parsedKartNumber !== undefined ? [{ kartNumber: parsedKartNumber }] : []),
        ],
      }
    : undefined;

  const [pilots, total] = await prisma.$transaction([
    prisma.pilot.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.pilot.count({ where }),
  ]);

  res.json({
    items: pilots,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function createPilot(req: Request, res: Response): Promise<void> {
  const { name, alias, kartNumber, phone, email } = req.body;
  const pilot = await prisma.pilot.create({
    data: { name, alias, kartNumber, phone, email },
  });
  res.status(201).json(pilot);
}

export async function getPilot(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({
    where: { id: req.params.id },
  });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }
  res.json(pilot);
}

export async function updatePilot(req: Request, res: Response): Promise<void> {
  const { name, alias, kartNumber, phone, email, active } = req.body;
  const pilot = await prisma.pilot.update({
    where: { id: req.params.id },
    data: { name, alias, kartNumber, phone, email, active },
  });
  res.json(pilot);
}

export async function deletePilot(req: Request, res: Response): Promise<void> {
  const count = await prisma.inscription.count({ where: { pilotId: req.params.id } });
  if (count > 0) {
    res.status(409).json({ error: `No se puede eliminar: el piloto tiene ${count} inscripción(es) en eventos. Elimina primero sus inscripciones.` });
    return;
  }
  await prisma.pilot.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

export async function uploadPilotPhoto(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({ where: { id: req.params.id } });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }

  if (pilot.photoUrl) {
    const oldPath = `/app${pilot.photoUrl}`;
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const photoUrl = `/uploads/pilots/${req.file.filename}`;
  const updated = await prisma.pilot.update({
    where: { id: req.params.id },
    data: { photoUrl },
  });
  res.json(updated);
}

export async function deletePilotPhoto(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({ where: { id: req.params.id } });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }

  if (pilot.photoUrl) {
    const filePath = `/app${pilot.photoUrl}`;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const updated = await prisma.pilot.update({
    where: { id: req.params.id },
    data: { photoUrl: null },
  });
  res.json(updated);
}

export async function getPilotHistory(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({ where: { id: req.params.id } });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }

  const inscriptions = await prisma.inscription.findMany({
    where: { pilotId: req.params.id },
    include: {
      event: { select: { id: true, name: true, slug: true, date: true, year: true } },
      raceResults: {
        include: { race: { select: { number: true, category: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const standings = await prisma.championshipStanding.findMany({
    where: { pilotId: req.params.id },
    orderBy: [{ year: 'desc' }, { category: 'asc' }],
  });

  res.json({ pilot, inscriptions, standings });
}
