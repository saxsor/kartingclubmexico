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

/**
 * Backfill RaceResult.teamId for a single pilot.
 * Only touches results where teamId IS NULL — never overwrites existing snapshots.
 * Returns the affected year/category combos so the caller can recalculate standings.
 */
export async function backfillPilotTeamSnapshots(
  pilotId: string,
  teamId: string,
): Promise<{ year: number; category: Category }[]> {
  // Find all inscriptions for this pilot
  const inscriptions = await prisma.inscription.findMany({
    where: { pilotId },
    select: { id: true },
  });
  if (inscriptions.length === 0) return [];

  const inscriptionIds = inscriptions.map((i) => i.id);

  // Update NULL teamId snapshots
  await prisma.raceResult.updateMany({
    where: { inscriptionId: { in: inscriptionIds }, teamId: null },
    data: { teamId },
  });

  // Find affected year/category combos
  const affected = await prisma.race.findMany({
    where: {
      status: 'FINISHED',
      results: { some: { inscriptionId: { in: inscriptionIds }, teamId } },
    },
    select: { category: true, event: { select: { year: true } } },
    distinct: ['category', 'eventId'],
  });

  const combos = new Map<string, { year: number; category: Category }>();
  for (const r of affected) {
    const key = `${r.event.year}-${r.category}`;
    combos.set(key, { year: r.event.year, category: r.category as Category });
  }
  return Array.from(combos.values());
}

/**
 * Full global backfill + recalculate for all pilots with a team.
 * Safe to run at any time — only fills NULL snapshots.
 */
export async function globalBackfillAndRecalculate(): Promise<{ updated: number; combos: number }> {
  // Get all pilots with a team
  const pilots = await prisma.pilot.findMany({
    where: { teamId: { not: null } },
    select: { id: true, teamId: true },
  });

  let updated = 0;
  const affectedCombos = new Map<string, { year: number; category: Category }>();

  for (const pilot of pilots) {
    if (!pilot.teamId) continue;
    const combos = await backfillPilotTeamSnapshots(pilot.id, pilot.teamId);
    combos.forEach((c) => affectedCombos.set(`${c.year}-${c.category}`, c));
  }

  // Count updated results
  updated = pilots.length;

  // Recalculate all affected combos
  for (const { year, category } of affectedCombos.values()) {
    await recalculateConstructorStandings(year, category);
  }

  return { updated, combos: affectedCombos.size };
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
