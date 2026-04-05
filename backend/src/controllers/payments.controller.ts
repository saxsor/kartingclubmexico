import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getCashBox(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const payments = await prisma.payment.findMany({
    where: { inscription: { eventId: event.id } },
    include: {
      inscription: {
        include: { pilot: { select: { name: true, alias: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = payments.reduce(
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

  res.json({ payments, totals });
}

export async function addPayment(req: Request, res: Response): Promise<void> {
  const { type, amount, notes } = req.body;
  const createdBy = req.user?.name ?? 'Sistema';

  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: { payments: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  const payment = await prisma.payment.create({
    data: { inscriptionId: req.params.id, type, amount, notes, createdBy },
  });

  // Check if inscription should be marked as PAID
  const allPayments = [...inscription.payments, payment];
  const event = await prisma.event.findUnique({ where: { id: inscription.eventId } });
  if (event) {
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const required = Number(event.serviceFee) + Number(event.foodFee);
    if (totalPaid >= required) {
      await prisma.inscription.update({
        where: { id: inscription.id },
        data: { status: 'PAID' },
      });
    }
  }

  res.status(201).json(payment);
}

export async function deletePayment(req: Request, res: Response): Promise<void> {
  await prisma.payment.delete({ where: { id: req.params.paymentId } });
  res.status(204).send();
}
