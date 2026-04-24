import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { calculateEventTotalRequired, calculateInscriptionFees, syncInscriptionStatus } from '../lib/fees.js';

export async function getCashBox(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const { page, pageSize, skip } = getPaginationParams(req);
  const paymentsWhere = { inscription: { eventId: event.id } };

  const [payments, total, allPayments, inscriptions, eventGuests] = await prisma.$transaction([
    prisma.payment.findMany({
      where: paymentsWhere,
      include: {
        inscription: {
          include: { pilot: { select: { name: true, alias: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.payment.count({ where: paymentsWhere }),
    prisma.payment.findMany({
      where: paymentsWhere,
      select: { amount: true, type: true },
    }),
    prisma.inscription.findMany({
      where: { eventId: event.id },
      select: { companions: true, exentoCarrera: true, exentoComida: true },
    }),
    prisma.eventGuest.findMany({ where: { eventId: event.id } }),
  ]);

  const totalPilotosComensales = inscriptions.reduce((s, i) => s + i.companions, 0);
  const totalGuestComensales = eventGuests.reduce((s, g) => s + g.count, 0);

  const totals = allPayments.reduce(
    (acc, p) => {
      const amount = Number(p.amount);
      acc.total += amount;
      if (p.type === 'SERVICE_FEE') acc.serviceFee += amount;
      if (p.type === 'FOOD_FEE') acc.foodFee += amount;
      if (p.type === 'OTHER') acc.other += amount;
      return acc;
    },
    { total: 0, serviceFee: 0, foodFee: 0, other: 0 },
  );

  const serviceFeeUnit = Number(event.serviceFee);
  const foodFeeUnit = Number(event.foodFee);
  const staffCount = event.staffCount ?? 0;
  const paidGuestFoodFee = eventGuests
    .filter((guest) => guest.isPaid)
    .reduce((sum, guest) => sum + foodFeeUnit * guest.count, 0);

  const eventFees = await calculateEventTotalRequired(event.id);
  const requiredServiceFee = eventFees.serviceFee;
  const requiredFoodFeeFromPilots = eventFees.foodFee;
  const requiredFoodFeeFromGuests = foodFeeUnit * totalGuestComensales;
  const requiredFoodFee = Math.max(0, requiredFoodFeeFromPilots - staffCount * foodFeeUnit) + requiredFoodFeeFromGuests;

  totals.foodFee += paidGuestFoodFee;
  totals.total += paidGuestFoodFee;

  res.json({
    payments,
    totals,
    required: {
      serviceFee: requiredServiceFee,
      foodFee: requiredFoodFee,
      total: requiredServiceFee + requiredFoodFee,
    },
    totalPilotosComensales,
    totalGuestComensales,
    totalComensales: totalPilotosComensales + totalGuestComensales,
    eventGuests,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function addPayment(req: Request, res: Response): Promise<void> {
  const { type, amount, notes } = req.body;
  const createdBy = req.user?.name ?? 'Sistema';

  const payment = await prisma.$transaction(async (tx) => {
    const inscription = await tx.inscription.findUnique({
      where: { id: req.params.id },
      include: { payments: true, event: true },
    });
    if (!inscription) return null;

    const payment = await tx.payment.create({
      data: { inscriptionId: req.params.id, type, amount, notes, createdBy },
    });

    await syncInscriptionStatus(req.params.id, tx);

    return payment;
  });

  if (!payment) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  res.status(201).json(payment);
}

export async function deletePayment(req: Request, res: Response): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: req.params.paymentId },
      include: {
        inscription: {
          select: { id: true, status: true, companions: true, exentoCarrera: true, exentoComida: true, payments: true, event: { select: { serviceFee: true, foodFee: true } } },
        },
      },
    });
    if (!payment) return;

    await tx.payment.delete({ where: { id: req.params.paymentId } });

    await syncInscriptionStatus(payment.inscription.id, tx);
  });

  res.status(204).send();
}

export async function exportCashBox(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const [payments, eventGuests] = await prisma.$transaction([
    prisma.payment.findMany({
      where: { inscription: { eventId: event.id } },
      include: {
        inscription: {
          include: { pilot: { select: { name: true, alias: true, email: true } } },
        },
      },
      orderBy: { paidAt: 'asc' },
    }),
    prisma.eventGuest.findMany({
      where: { eventId: event.id, isPaid: true },
      orderBy: { updatedAt: 'asc' },
    }),
  ]);

  const rows = [
    '"Piloto","Alias","Email","Tipo","Monto","Notas","Registrado por","Fecha"',
    ...payments.map((p) => [
      `"${p.inscription.pilot.name}"`,
      `"${p.inscription.pilot.alias ?? ''}"`,
      `"${p.inscription.pilot.email ?? ''}"`,
      `"${p.type}"`,
      `"${Number(p.amount).toFixed(2)}"`,
      `"${(p.notes ?? '').replace(/"/g, '""')}"`,
      `"${p.createdBy ?? ''}"`,
      `"${new Date(p.paidAt).toLocaleString('es-MX')}"`,
    ].join(',')),
    ...eventGuests.map((guest) => [
      `"${guest.name ?? `Visitante x${guest.count}`}"`,
      '""',
      '""',
      '"FOOD_FEE_GUEST"',
      `"${(Number(event.foodFee) * guest.count).toFixed(2)}"`,
      `"${(guest.notes ?? '').replace(/"/g, '""')}"`,
      '"Sistema"',
      `"${new Date(guest.updatedAt).toLocaleString('es-MX')}"`,
    ].join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.slug}-caja.csv"`);
  res.send('\uFEFF' + rows);
}
