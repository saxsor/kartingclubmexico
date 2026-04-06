import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function selfRegister(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { name, alias, email, phone, kartNumber, category, notes } = req.body;

  // Find event
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  if (event.status !== 'OPEN') { res.status(400).json({ error: 'El evento no está abierto para inscripciones' }); return; }

  // Check category is active
  const eventCategory = await prisma.eventCategory.findUnique({
    where: { eventId_category: { eventId: event.id, category } },
  });
  if (!eventCategory || !eventCategory.active) { res.status(400).json({ error: 'Categoría no disponible' }); return; }

  // Find or create pilot by email
  let pilot = email ? await prisma.pilot.findFirst({ where: { email } }) : null;
  if (!pilot) {
    pilot = await prisma.pilot.create({
      data: {
        name,
        alias: alias || null,
        email: email || null,
        phone: phone || null,
        kartNumber: kartNumber ? parseInt(kartNumber) : null,
      },
    });
  } else {
    // Update pilot info
    pilot = await prisma.pilot.update({
      where: { id: pilot.id },
      data: {
        name,
        alias: alias || pilot.alias,
        phone: phone || pilot.phone,
        kartNumber: kartNumber ? parseInt(kartNumber) : pilot.kartNumber,
      },
    });
  }

  // Check duplicate inscription
  const existing = await prisma.inscription.findUnique({
    where: { eventId_pilotId_category: { eventId: event.id, pilotId: pilot.id, category } },
  });
  if (existing) { res.status(409).json({ error: 'Ya estás inscrito en esta categoría para este evento' }); return; }

  const inscription = await prisma.inscription.create({
    data: {
      eventId: event.id,
      pilotId: pilot.id,
      category,
      kartNumber: kartNumber ? parseInt(kartNumber) : null,
      notes: notes || null,
      selfRegistered: true,
      status: 'PENDING_PAYMENT',
    },
    include: { pilot: true },
  });

  res.status(201).json({
    inscription,
    transferInfo: event.transferInfo,
    serviceFee: event.serviceFee,
    foodFee: event.foodFee,
  });
}

export async function uploadReceipt(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const inscription = await prisma.inscription.findUnique({
    where: { id },
    include: { pilot: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }
  if (inscription.status === 'PAID') { res.status(400).json({ error: 'Esta inscripción ya fue pagada' }); return; }

  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }

  const receiptPath = `/uploads/receipts/${req.file.filename}`;

  const updated = await prisma.inscription.update({
    where: { id },
    data: { receiptPath, status: 'RECEIPT_SUBMITTED' },
    include: { pilot: true },
  });

  res.json(updated);
}

export async function approveReceipt(req: Request, res: Response): Promise<void> {
  const { slug, id } = req.params;
  const user = req.user!;

  const inscription = await prisma.inscription.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }
  if (inscription.event.slug !== slug) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }
  if (inscription.status !== 'RECEIPT_SUBMITTED') { res.status(400).json({ error: 'No hay recibo pendiente de aprobación' }); return; }

  const [updated] = await prisma.$transaction([
    prisma.inscription.update({
      where: { id },
      data: { status: 'PAID' },
      include: { pilot: true, payments: true, checkIn: true },
    }),
    prisma.payment.create({
      data: {
        inscriptionId: id,
        type: 'SERVICE_FEE',
        amount: inscription.event.serviceFee,
        notes: 'Pago aprobado via recibo',
        createdBy: user.name,
      },
    }),
  ]);

  res.json(updated);
}

export async function rejectReceipt(req: Request, res: Response): Promise<void> {
  const { slug, id } = req.params;

  const inscription = await prisma.inscription.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }
  if (inscription.event.slug !== slug) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  const updated = await prisma.inscription.update({
    where: { id },
    data: { status: 'PENDING_PAYMENT', receiptPath: null },
    include: { pilot: true, payments: true, checkIn: true },
  });

  res.json(updated);
}
