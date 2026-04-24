import { Inscription, Event, Payment } from '@prisma/client';
import { prisma } from './prisma.js';

export interface FeeBreakdown {
  requiredServiceFee: number;
  requiredFoodFee: number;
  totalRequired: number;
}

/**
 * Calculates the required fees for a specific inscription,
 * taking into account other inscriptions by the same pilot in the same event.
 *
 * Rules:
 * 1. serviceFee is charged only once per pilot per event.
 * 2. It is assigned to the first non-exempt inscription (by createdAt).
 * 3. foodFee is charged per inscription based on companions.
 */
export async function calculateInscriptionFees(
  inscriptionId: string,
  tx?: any
): Promise<FeeBreakdown> {
  const db = tx || prisma;

  const inscription = await db.inscription.findUnique({
    where: { id: inscriptionId },
    include: { event: true },
  });

  if (!inscription) {
    throw new Error('Inscription not found');
  }

  const { eventId, pilotId, exentoCarrera, exentoComida, companions, event } = inscription;

  // 1. Calculate Food Fee (always per inscription)
  const requiredFoodFee = exentoComida ? 0 : Number(event.foodFee) * companions;

  // 2. Calculate Service Fee (once per pilot per event)
  let requiredServiceFee = 0;

  if (!exentoCarrera) {
    // Find all non-exempt inscriptions for this pilot in this event, ordered by creation
    const pilotInscriptions = await db.inscription.findMany({
      where: {
        eventId,
        pilotId,
        exentoCarrera: false,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    // If this is the first non-exempt inscription, it carries the service fee
    if (pilotInscriptions.length > 0 && pilotInscriptions[0].id === inscription.id) {
      requiredServiceFee = Number(event.serviceFee);
    }
  }

  return {
    requiredServiceFee,
    requiredFoodFee,
    totalRequired: requiredServiceFee + requiredFoodFee,
  };
}

/**
 * Calculates the total required fees for an entire event.
 * Each pilot is charged the service fee only once if they have at least one non-exempt inscription.
 */
export async function calculateEventTotalRequired(eventId: string): Promise<{ serviceFee: number; foodFee: number; total: number }> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const inscriptions = await prisma.inscription.findMany({
    where: { eventId },
    select: {
      pilotId: true,
      exentoCarrera: true,
      exentoComida: true,
      companions: true,
    },
  });

  const serviceFeeUnit = Number(event.serviceFee);
  const foodFeeUnit = Number(event.foodFee);

  // Set of pilots that are NOT exempt from service fee
  const nonExemptPilots = new Set<string>();
  let totalFoodFee = 0;

  for (const ins of inscriptions) {
    if (!ins.exentoCarrera) {
      nonExemptPilots.add(ins.pilotId);
    }
    if (!ins.exentoComida) {
      totalFoodFee += ins.companions * foodFeeUnit;
    }
  }

  const totalServiceFee = nonExemptPilots.size * serviceFeeUnit;

  return {
    serviceFee: totalServiceFee,
    foodFee: totalFoodFee,
    total: totalServiceFee + totalFoodFee,
  };
}

/**
 * Calculates fees for multiple inscriptions at once efficiently.
 */
export async function calculateMultipleInscriptionsFees(
  inscriptions: (Inscription & { event: Event })[]
): Promise<Record<string, FeeBreakdown>> {
  if (inscriptions.length === 0) return {};

  const eventIds = [...new Set(inscriptions.map((i) => i.eventId))];
  const pilotIds = [...new Set(inscriptions.map((i) => i.pilotId))];

  // Fetch ALL inscriptions for these pilots in these events to determine the "first" non-exempt one correctly
  const allPilotInscriptions = await prisma.inscription.findMany({
    where: {
      eventId: { in: eventIds },
      pilotId: { in: pilotIds },
      exentoCarrera: false,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, eventId: true, pilotId: true },
  });

  // Group by eventId-pilotId to find the first for each pair
  const firstInscriptionsMap = new Map<string, string>(); // "eventId-pilotId" -> firstInscriptionId
  for (const ins of allPilotInscriptions) {
    const key = `${ins.eventId}-${ins.pilotId}`;
    if (!firstInscriptionsMap.has(key)) {
      firstInscriptionsMap.set(key, ins.id);
    }
  }

  const results: Record<string, FeeBreakdown> = {};

  for (const ins of inscriptions) {
    const requiredFoodFee = ins.exentoComida ? 0 : Number(ins.event.foodFee) * ins.companions;
    let requiredServiceFee = 0;

    if (!ins.exentoCarrera) {
      const firstId = firstInscriptionsMap.get(`${ins.eventId}-${ins.pilotId}`);
      if (firstId === ins.id) {
        requiredServiceFee = Number(ins.event.serviceFee);
      }
    }

    results[ins.id] = {
      requiredServiceFee,
      requiredFoodFee,
      totalRequired: requiredServiceFee + requiredFoodFee,
    };
  }

  return results;
}

/**
 * Synchronizes the status and check-in debt of an inscription based on its payments and required fees.
 */
export async function syncInscriptionStatus(inscriptionId: string, tx?: any): Promise<void> {
  const db = tx || prisma;
  const inscription = await db.inscription.findUnique({
    where: { id: inscriptionId },
    include: { payments: true, checkIn: true },
  });
  if (!inscription) return;

  const fees = await calculateInscriptionFees(inscriptionId, db);
  const totalPaid = inscription.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  const shouldBePaid = totalPaid >= fees.totalRequired;

  if (shouldBePaid && inscription.status !== 'PAID' && inscription.status !== 'RECEIPT_SUBMITTED') {
    await db.inscription.update({
      where: { id: inscriptionId },
      data: { status: 'PAID' },
    });
    if (inscription.checkIn) {
      await db.checkIn.update({
        where: { inscriptionId },
        data: { hasDebt: false },
      });
    }
  } else if (!shouldBePaid && inscription.status === 'PAID') {
    await db.inscription.update({
      where: { id: inscriptionId },
      data: { status: 'PENDING_PAYMENT' },
    });
    if (inscription.checkIn) {
      await db.checkIn.update({
        where: { inscriptionId },
        data: { hasDebt: true },
      });
    }
  }
}

/**
 * Synchronizes statuses for all inscriptions of a pilot in a specific event.
 * Use this when an inscription is created, updated, or deleted, as the one-time service fee
 * logic might affect other inscriptions.
 */
export async function syncPilotEventInscriptions(pilotId: string, eventId: string, tx?: any): Promise<void> {
  const db = tx || prisma;
  const inscriptions = await db.inscription.findMany({
    where: { pilotId, eventId },
    select: { id: true },
  });

  for (const ins of inscriptions) {
    await syncInscriptionStatus(ins.id, db);
  }
}

/**
 * Synchronizes statuses for all inscriptions in a specific event.
 * Use this when event fees change.
 */
export async function syncEventInscriptions(eventId: string, tx?: any): Promise<void> {
  const db = tx || prisma;
  const inscriptions = await db.inscription.findMany({
    where: { eventId },
    select: { id: true },
  });

  for (const ins of inscriptions) {
    await syncInscriptionStatus(ins.id, db);
  }
}
