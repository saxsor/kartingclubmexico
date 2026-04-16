import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';

export async function getCashBox(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const { page, pageSize, skip } = getPaginationParams(req);
  const paymentsWhere = { inscription: { eventId: event.id } };

  const [payments, total, allPayments, companionsAggregate, inscriptionCount] = await prisma.$transaction([
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
    prisma.inscription.aggregate({
      where: { eventId: event.id },
      _sum: { companions: true },
    }),
    prisma.inscription.count({ where: { eventId: event.id } }),
  ]);

  const totalPilotosComensales = companionsAggregate._sum.companions ?? 0;

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

  const requiredServiceFee = Number(event.serviceFee) * inscriptionCount;
  const requiredFoodFee = Number(event.foodFee) * totalPilotosComensales;

  res.json({
    payments,
    totals,
    required: {
      serviceFee: requiredServiceFee,
      foodFee: requiredFoodFee,
      total: requiredServiceFee + requiredFoodFee,
    },
    totalPilotosComensales,
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

    const totalPaid = [...inscription.payments, payment].reduce((s, p) => s + Number(p.amount), 0);
    const required = Number(inscription.event.serviceFee) + Number(inscription.event.foodFee) * inscription.companions;

    if (totalPaid >= required) {
      await tx.inscription.update({
        where: { id: inscription.id },
        data: { status: 'PAID' },
      });
    }

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
          select: { id: true, status: true, companions: true, payments: true, event: { select: { serviceFee: true, foodFee: true } } },
        },
      },
    });
    if (!payment) return;

    await tx.payment.delete({ where: { id: req.params.paymentId } });

    // Recalculate total after deletion; if now below required, revert status to PENDING_PAYMENT
    const remainingTotal = payment.inscription.payments
      .filter((p) => p.id !== req.params.paymentId)
      .reduce((s, p) => s + Number(p.amount), 0);
    const required = Number(payment.inscription.event.serviceFee)
      + Number(payment.inscription.event.foodFee) * payment.inscription.companions;

    if (remainingTotal < required && payment.inscription.status === 'PAID') {
      await tx.inscription.update({
        where: { id: payment.inscription.id },
        data: { status: 'PENDING_PAYMENT' },
      });
    }
  });

  res.status(204).send();
}

export async function exportCashBox(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const payments = await prisma.payment.findMany({
    where: { inscription: { eventId: event.id } },
    include: {
      inscription: {
        include: { pilot: { select: { name: true, alias: true, email: true } } },
      },
    },
    orderBy: { paidAt: 'asc' },
  });

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
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.slug}-caja.csv"`);
  res.send('\uFEFF' + rows);
}
