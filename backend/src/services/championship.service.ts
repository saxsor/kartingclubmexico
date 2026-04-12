import { Category } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function recalculateConstructorStandings(year: number, category: Category): Promise<void> {
  const races = await prisma.race.findMany({
    where: { status: 'FINISHED', category, event: { year } },
    include: {
      results: {
        where: { teamId: { not: null } },
        include: { inscription: { select: { eventId: true } } },
      },
    },
  });

  const teamData: Map<string, { totalPoints: number; eventsSet: Set<string> }> = new Map();

  for (const race of races) {
    for (const result of race.results) {
      if (!result.teamId) continue;
      if (!teamData.has(result.teamId)) {
        teamData.set(result.teamId, { totalPoints: 0, eventsSet: new Set() });
      }
      const data = teamData.get(result.teamId)!;
      data.totalPoints += result.finalPoints;
      data.eventsSet.add(race.eventId);
    }
  }

  const sorted = Array.from(teamData.entries()).sort(([, a], [, b]) => b.totalPoints - a.totalPoints);

  for (let i = 0; i < sorted.length; i++) {
    const [teamId, data] = sorted[i];
    await prisma.constructorStanding.upsert({
      where: { year_teamId_category: { year, teamId, category } },
      update: {
        totalPoints: data.totalPoints,
        position: i + 1,
        eventsCount: data.eventsSet.size,
        updatedAt: new Date(),
      },
      create: {
        year,
        teamId,
        category,
        totalPoints: data.totalPoints,
        position: i + 1,
        eventsCount: data.eventsSet.size,
      },
    });
  }
}

export async function recalculateChampionship(year: number, category: Category): Promise<void> {
  // Get all finished races for this year/category with their results
  const races = await prisma.race.findMany({
    where: {
      status: 'FINISHED',
      category,
      event: { year },
    },
    include: {
      results: {
        include: {
          inscription: {
            select: { pilotId: true },
          },
        },
      },
    },
  });

  // Aggregate points per pilot
  const pilotData: Map<string, { totalPoints: number; eventsSet: Set<string> }> = new Map();

  for (const race of races) {
    for (const result of race.results) {
      const { pilotId } = result.inscription;
      if (!pilotData.has(pilotId)) {
        pilotData.set(pilotId, { totalPoints: 0, eventsSet: new Set() });
      }
      const data = pilotData.get(pilotId)!;
      data.totalPoints += result.finalPoints;
      data.eventsSet.add(race.eventId);
    }
  }

  // Sort pilots by total points (descending)
  const sorted = Array.from(pilotData.entries()).sort(([, a], [, b]) => b.totalPoints - a.totalPoints);

  // Upsert standings
  for (let i = 0; i < sorted.length; i++) {
    const [pilotId, data] = sorted[i];
    await prisma.championshipStanding.upsert({
      where: { year_pilotId_category: { year, pilotId, category } },
      update: {
        totalPoints: data.totalPoints,
        position: i + 1,
        eventsCount: data.eventsSet.size,
        updatedAt: new Date(),
      },
      create: {
        year,
        pilotId,
        category,
        totalPoints: data.totalPoints,
        position: i + 1,
        eventsCount: data.eventsSet.size,
      },
    });
  }
}
