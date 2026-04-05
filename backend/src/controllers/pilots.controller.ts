import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function listPilots(req: Request, res: Response): Promise<void> {
  const pilots = await prisma.pilot.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(pilots);
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
  await prisma.pilot.delete({ where: { id: req.params.id } });
  res.status(204).send();
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
