import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * GET /api/analytics/dashboard
 * Returns aggregate data for the admin dashboard:
 *  - revenueByEvent: last 10 events with payment totals broken down by type
 *  - participationByEvent: last 10 events with inscription counts per category
 *  - topStandings: top 5 pilots per category for the current championship year
 */
export async function getDashboardAnalytics(_req: Request, res: Response): Promise<void> {
  const currentYear = new Date().getFullYear();

  const [events, payments, inscriptions, standings, totalTeams, constructorStandings, teamResultRows] = await prisma.$transaction([
    // Last 10 events ordered by date descending
    prisma.event.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      select: { id: true, name: true, date: true, status: true, slug: true },
    }),

    // All payments for those events (we filter below)
    prisma.payment.findMany({
      where: {
        inscription: {
          event: {
            date: { gte: new Date(new Date().getFullYear() - 2, 0, 1) },
          },
        },
      },
      select: {
        amount: true,
        type: true,
        inscription: { select: { eventId: true } },
      },
    }),

    // Inscription counts per event + category
    prisma.inscription.findMany({
      where: {
        event: {
          date: { gte: new Date(new Date().getFullYear() - 2, 0, 1) },
        },
      },
      select: { eventId: true, category: true },
    }),

    // Championship standings for current year — top 5 per category
    prisma.championshipStanding.findMany({
      where: { year: currentYear },
      orderBy: [{ category: 'asc' }, { totalPoints: 'desc' }],
      include: {
        pilot: { select: { name: true, alias: true } },
      },
    }),

    // Total registered teams
    prisma.team.count({ where: { active: true } }),

    // Constructor standings for current year — top 5 per category
    prisma.constructorStanding.findMany({
      where: { year: currentYear },
      orderBy: [{ category: 'asc' }, { totalPoints: 'desc' }],
      include: { team: { select: { name: true } } },
    }),

    // Teams per event (via race results — dedup done in JS with Set)
    prisma.raceResult.findMany({
      where: { teamId: { not: null }, race: { status: 'FINISHED' } },
      select: { teamId: true, race: { select: { eventId: true } } },
    }),
  ]);

  const eventIds = new Set(events.map((e) => e.id));

  // Build revenue per event map
  const revenueMap: Record<string, { serviceFee: number; foodFee: number; other: number }> = {};
  for (const p of payments) {
    const eid = p.inscription.eventId;
    if (!eventIds.has(eid)) continue;
    if (!revenueMap[eid]) revenueMap[eid] = { serviceFee: 0, foodFee: 0, other: 0 };
    const amount = Number(p.amount);
    if (p.type === 'SERVICE_FEE') revenueMap[eid].serviceFee += amount;
    else if (p.type === 'FOOD_FEE') revenueMap[eid].foodFee += amount;
    else revenueMap[eid].other += amount;
  }

  // Build participation per event map
  const participationMap: Record<string, Record<string, number>> = {};
  for (const ins of inscriptions) {
    if (!eventIds.has(ins.eventId)) continue;
    if (!participationMap[ins.eventId]) participationMap[ins.eventId] = {};
    participationMap[ins.eventId][ins.category] = (participationMap[ins.eventId][ins.category] ?? 0) + 1;
  }

  const revenueByEvent = events.map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    status: e.status,
    serviceFee: revenueMap[e.id]?.serviceFee ?? 0,
    foodFee: revenueMap[e.id]?.foodFee ?? 0,
    other: revenueMap[e.id]?.other ?? 0,
    total: (revenueMap[e.id]?.serviceFee ?? 0) + (revenueMap[e.id]?.foodFee ?? 0) + (revenueMap[e.id]?.other ?? 0),
  }));

  const participationByEvent = events.map((e) => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    categories: participationMap[e.id] ?? {},
    total: Object.values(participationMap[e.id] ?? {}).reduce((s, n) => s + n, 0),
  }));

  // Group pilot standings by category — top 5
  const standingsByCategory: Record<string, Array<{
    position: number | null;
    pilotName: string;
    alias: string | null;
    totalPoints: number;
    eventsCount: number;
  }>> = {};
  for (const s of standings) {
    if (!standingsByCategory[s.category]) standingsByCategory[s.category] = [];
    if (standingsByCategory[s.category].length < 5) {
      standingsByCategory[s.category].push({
        position: s.position,
        pilotName: s.pilot.name,
        alias: s.pilot.alias,
        totalPoints: s.totalPoints,
        eventsCount: s.eventsCount,
      });
    }
  }

  // Group constructor standings by category — top 5
  const constructorsByCategory: Record<string, Array<{
    position: number | null;
    teamName: string;
    totalPoints: number;
    eventsCount: number;
  }>> = {};
  for (const s of constructorStandings) {
    if (!constructorsByCategory[s.category]) constructorsByCategory[s.category] = [];
    if (constructorsByCategory[s.category].length < 5) {
      constructorsByCategory[s.category].push({
        position: s.position,
        teamName: s.team.name,
        totalPoints: s.totalPoints,
        eventsCount: s.eventsCount,
      });
    }
  }

  // Teams per event: count distinct teamIds in race results per event
  const teamsPerEventMap: Record<string, Set<string>> = {};
  for (const r of teamResultRows) {
    if (!r.teamId) continue;
    const eid = r.race.eventId;
    if (!teamsPerEventMap[eid]) teamsPerEventMap[eid] = new Set();
    teamsPerEventMap[eid].add(r.teamId);
  }
  const teamsPerEventCounts = Object.values(teamsPerEventMap).map((s) => s.size);
  const avgTeamsPerEvent = teamsPerEventCounts.length > 0
    ? Math.round(teamsPerEventCounts.reduce((a, b) => a + b, 0) / teamsPerEventCounts.length)
    : 0;

  // Build teams-per-event array aligned with events list (oldest first)
  const teamsPerEvent = events
    .slice()
    .reverse()
    .map((e) => ({
      name: e.name,
      slug: e.slug,
      equipos: teamsPerEventMap[e.id]?.size ?? 0,
    }))
    .filter((e) => e.equipos > 0);

  res.json({
    revenueByEvent: revenueByEvent.slice().reverse(),
    participationByEvent: participationByEvent.slice().reverse(),
    standingsByCategory,
    constructorsByCategory,
    totalTeams,
    avgTeamsPerEvent,
    teamsPerEvent,
    year: currentYear,
  });
}
