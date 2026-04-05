import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Category } from '@prisma/client';

export async function getChampionship(req: Request, res: Response): Promise<void> {
  const year = new Date().getFullYear();
  const standings = await prisma.championshipStanding.findMany({
    where: { year },
    include: { pilot: true },
    orderBy: [{ category: 'asc' }, { position: 'asc' }],
  });

  // Group by category
  const grouped: Record<string, typeof standings> = {};
  for (const s of standings) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  res.json({ year, standings: grouped });
}

export async function getChampionshipByYearCategory(req: Request, res: Response): Promise<void> {
  const year = parseInt(req.params.year, 10);
  const category = req.params.category as Category;

  const standings = await prisma.championshipStanding.findMany({
    where: { year, category },
    include: { pilot: true },
    orderBy: { position: 'asc' },
  });

  const leaderPoints = standings[0]?.totalPoints ?? 0;
  const result = standings.map((s) => ({
    ...s,
    gap: leaderPoints - s.totalPoints,
  }));

  res.json({ year, category, standings: result });
}
