import { PrismaClient, Category, EventStatus, ResultStatus, PaymentType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const F1_POINTS: Record<number, number> = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2 };
function calcPoints(pos: number | null, status: ResultStatus): number {
  if (status !== 'FINISHED' || pos === null) return 0;
  return F1_POINTS[pos] ?? 1;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const PILOTS = [
  { name: 'Carlos Herrera Morales', alias: 'El Toro', kartNumber: 5 },
  { name: 'Andrés López Gutiérrez', alias: 'Flecha', kartNumber: 12 },
  { name: 'Miguel Ángel Ramírez', alias: 'El Cobra', kartNumber: 7 },
  { name: 'Diego Fernández Cruz', alias: 'Turbo', kartNumber: 23 },
  { name: 'José Luis Martínez', alias: 'Marti', kartNumber: 31 },
  { name: 'Roberto Sánchez Vega', alias: 'Bobby', kartNumber: 44 },
  { name: 'Fernando Jiménez Paz', alias: 'Nando', kartNumber: 3 },
  { name: 'Alejandro Torres Ríos', alias: 'El Rayo', kartNumber: 18 },
  { name: 'Iván Moreno Castillo', alias: 'Memo', kartNumber: 9 },
  { name: 'Eduardo Vargas Soto', alias: 'Edu', kartNumber: 55 },
  { name: 'Rafael Delgado Luna', alias: 'Rafa', kartNumber: 16 },
  { name: 'Héctor Mendoza Reyes', alias: 'Hect', kartNumber: 27 },
  { name: 'Sergio Álvarez Noriega', alias: 'Che', kartNumber: 8 },
  { name: 'Pablo Rojas Medina', alias: 'Pablito', kartNumber: 33 },
  { name: 'Luis Antonio García', alias: 'Lucho', kartNumber: 11 },
  { name: 'Marco Ruiz Espinoza', alias: 'El Marco', kartNumber: 2 },
  { name: 'Ernesto Villanueva', alias: 'Neto', kartNumber: 77 },
  { name: 'Oscar Peña Solís', alias: 'Osito', kartNumber: 20 },
  { name: 'Gabriel Fuentes Lima', alias: 'Gabi', kartNumber: 14 },
  { name: 'Antonio Guerrero Paz', alias: 'Toño', kartNumber: 6 },
];

const FINISHED_EVENTS = [
  { name: 'Gran Premio Apertura 2025', date: new Date('2025-03-15'), categories: ['SHIFTER', 'DOS_TIEMPOS', 'ROOKIES'] as Category[] },
  { name: 'Copa Karting Club Verano 2025', date: new Date('2025-06-21'), categories: ['SHIFTER', 'FORMULA_MUNDIAL', 'NUEVE_HP'] as Category[] },
  { name: 'Gran Premio Clausura 2025', date: new Date('2025-11-08'), categories: ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'ROOKIES'] as Category[] },
];

const OPEN_EVENT = {
  name: 'Gran Premio Apertura 2026',
  date: new Date('2026-04-20'),
  categories: ['SHIFTER', 'DOS_TIEMPOS', 'FORMULA_MUNDIAL', 'NUEVE_HP', 'ROOKIES'] as Category[],
};

async function main() {
  console.log('Seeding database...');

  // Clean up
  await prisma.penalty.deleteMany();
  await prisma.raceResult.deleteMany();
  await prisma.race.deleteMany();
  await prisma.startGridPosition.deleteMany();
  await prisma.startGrid.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.inscription.deleteMany();
  await prisma.eventCategory.deleteMany();
  await prisma.event.deleteMany();
  await prisma.championshipStanding.deleteMany();
  await prisma.pilot.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing data.');

  // Create users
  const adminPass = await bcrypt.hash('password123', 12);
  const orgPass = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.create({
    data: { email: 'admin@edelracing.mx', password: adminPass, name: 'Administrador', role: 'ADMIN' },
  });
  const organizer = await prisma.user.create({
    data: { email: 'organizador@edelracing.mx', password: orgPass, name: 'Organizador', role: 'ORGANIZER' },
  });
  console.log(`Created users: ${admin.email}, ${organizer.email}`);

  // Create pilots
  const pilots = await Promise.all(
    PILOTS.map((p) => prisma.pilot.create({ data: p })),
  );
  console.log(`Created ${pilots.length} pilots.`);

  // Create finished events with full data
  for (const evData of FINISHED_EVENTS) {
    const slug = slugify(evData.name, { lower: true, strict: true });
    const year = evData.date.getFullYear();

    const event = await prisma.event.create({
      data: {
        name: evData.name,
        slug,
        date: evData.date,
        year,
        status: 'FINISHED',
        serviceFee: 450,
        foodFee: 150,
        blockCheckInOnDebt: false,
        eventCategories: {
          create: evData.categories.map((c) => ({ category: c })),
        },
      },
      include: { eventCategories: true },
    });
    console.log(`Event: ${event.name}`);

    for (const ec of event.eventCategories) {
      // Pick 6-8 random pilots for this category
      const selected = shuffle(pilots).slice(0, 6 + Math.floor(Math.random() * 3));

      // Inscriptions
      const inscriptions = await Promise.all(
        selected.map((pilot) =>
          prisma.inscription.create({
            data: {
              eventId: event.id,
              pilotId: pilot.id,
              category: ec.category,
              kartNumber: pilot.kartNumber,
              status: 'PAID',
            },
          }),
        ),
      );

      // Payments
      for (const insc of inscriptions) {
        await prisma.payment.create({
          data: {
            inscriptionId: insc.id,
            type: 'SERVICE_FEE',
            amount: 450,
            createdBy: organizer.name,
          },
        });
        await prisma.payment.create({
          data: {
            inscriptionId: insc.id,
            type: 'FOOD_FEE',
            amount: 150,
            createdBy: organizer.name,
          },
        });
      }

      // Check-ins
      const checkIns = await Promise.all(
        inscriptions.map((insc) =>
          prisma.checkIn.create({
            data: {
              inscriptionId: insc.id,
              kartNumber: insc.kartNumber ?? Math.floor(Math.random() * 99) + 1,
              confirmedBy: organizer.name,
            },
          }),
        ),
      );

      // Start grid
      const gridOrder = shuffle(inscriptions);
      const eventCat = await prisma.eventCategory.findUnique({
        where: { eventId_category: { eventId: event.id, category: ec.category } },
      });
      if (eventCat) {
        const grid = await prisma.startGrid.create({
          data: {
            eventCategoryId: eventCat.id,
            drawnBy: organizer.name,
          },
        });
        await Promise.all(
          gridOrder.map((insc, idx) =>
            prisma.startGridPosition.create({
              data: { startGridId: grid.id, inscriptionId: insc.id, position: idx + 1 },
            }),
          ),
        );
      }

      // 3 Races per category
      for (let raceNum = 1; raceNum <= 3; raceNum++) {
        const race = await prisma.race.create({
          data: {
            eventId: event.id,
            category: ec.category,
            number: raceNum,
            laps: 15,
            status: 'FINISHED',
            startedAt: new Date(evData.date.getTime() + raceNum * 60 * 60 * 1000),
            finishedAt: new Date(evData.date.getTime() + raceNum * 60 * 60 * 1000 + 20 * 60 * 1000),
          },
        });

        // Random finish order for each race
        const finishOrder = shuffle(inscriptions);
        await Promise.all(
          finishOrder.map((insc, idx) => {
            const position = idx + 1;
            const status: ResultStatus = 'FINISHED';
            const basePoints = calcPoints(position, status);
            return prisma.raceResult.create({
              data: {
                raceId: race.id,
                inscriptionId: insc.id,
                position,
                lapsCompleted: 15,
                status,
                basePoints,
                penaltyPoints: 0,
                finalPoints: basePoints,
              },
            });
          }),
        );
      }

      // Recalculate championship standings for this category
      const races = await prisma.race.findMany({
        where: { status: 'FINISHED', category: ec.category, event: { year } },
        include: { results: { include: { inscription: { select: { pilotId: true } } } } },
      });

      const pilotPoints = new Map<string, { points: number; events: Set<string> }>();
      for (const r of races) {
        for (const res of r.results) {
          const pid = res.inscription.pilotId;
          if (!pilotPoints.has(pid)) pilotPoints.set(pid, { points: 0, events: new Set() });
          pilotPoints.get(pid)!.points += res.finalPoints;
          pilotPoints.get(pid)!.events.add(r.eventId);
        }
      }

      const sorted = Array.from(pilotPoints.entries()).sort((a, b) => b[1].points - a[1].points);
      for (let i = 0; i < sorted.length; i++) {
        const [pilotId, data] = sorted[i];
        await prisma.championshipStanding.upsert({
          where: { year_pilotId_category: { year, pilotId, category: ec.category } },
          update: { totalPoints: data.points, position: i + 1, eventsCount: data.events.size },
          create: { year, pilotId, category: ec.category, totalPoints: data.points, position: i + 1, eventsCount: data.events.size },
        });
      }
    }
  }

  // Create open event for 2026
  const openSlug = slugify(OPEN_EVENT.name, { lower: true, strict: true });
  const openEvent = await prisma.event.create({
    data: {
      name: OPEN_EVENT.name,
      slug: openSlug,
      date: OPEN_EVENT.date,
      year: 2026,
      status: 'OPEN',
      serviceFee: 500,
      foodFee: 150,
      blockCheckInOnDebt: true,
      description: 'Primer evento de la temporada 2026. Inscripciones abiertas.',
      eventCategories: {
        create: OPEN_EVENT.categories.map((c) => ({ category: c })),
      },
    },
  });
  console.log(`Open event: ${openEvent.name}`);

  // Add some inscriptions to the open event
  const openInscPilots = shuffle(pilots).slice(0, 10);
  for (const pilot of openInscPilots) {
    const category = OPEN_EVENT.categories[Math.floor(Math.random() * OPEN_EVENT.categories.length)];
    const existing = await prisma.inscription.findUnique({
      where: { eventId_pilotId_category: { eventId: openEvent.id, pilotId: pilot.id, category } },
    });
    if (!existing) {
      await prisma.inscription.create({
        data: {
          eventId: openEvent.id,
          pilotId: pilot.id,
          category,
          kartNumber: pilot.kartNumber,
          status: Math.random() > 0.5 ? 'PAID' : 'PENDING_PAYMENT',
        },
      });
    }
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Users:');
  console.log('  admin@edelracing.mx / password123  (ADMIN)');
  console.log('  organizador@edelracing.mx / password123  (ORGANIZER)');
  console.log(`Pilots: ${pilots.length}`);
  console.log(`Finished events: ${FINISHED_EVENTS.length}`);
  console.log(`Open event: ${OPEN_EVENT.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
