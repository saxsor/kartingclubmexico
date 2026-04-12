import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { uploadToDrive } from '../lib/drive.service.js';
import { config } from '../config/index.js';
import { sendInscriptionConfirmation, sendPaymentApprovedEmail } from '../services/email.service.js';
import { CATEGORY_LABELS } from '../lib/category-labels.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function selfRegister(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { pilotId, name, alias, email, phone, kartNumber, category, notes, companions, teamName } = req.body;

  // Find event
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }
  if (event.status !== 'OPEN') { res.status(400).json({ error: 'El evento no está abierto para inscripciones' }); return; }

  // Check category is active
  const eventCategory = await prisma.eventCategory.findUnique({
    where: { eventId_category: { eventId: event.id, category } },
  });
  if (!eventCategory || !eventCategory.active) { res.status(400).json({ error: 'Categoría no disponible' }); return; }

  const parsedKartNumber = kartNumber ? parseInt(kartNumber) : null;

  // If pilotId provided, verify it exists before transaction
  if (pilotId) {
    const exists = await prisma.pilot.findUnique({ where: { id: pilotId } });
    if (!exists) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }
  }

  const registration = await prisma.$transaction(async (tx) => {
    // Resolve team: find or create by name
    let resolvedTeamId: string | null = null;
    if (teamName && teamName.trim()) {
      const trimmedTeamName = teamName.trim();
      let team = await tx.team.findFirst({
        where: { name: { equals: trimmedTeamName, mode: 'insensitive' } },
      });
      if (!team) {
        let slug = slugify(trimmedTeamName);
        const slugExists = await tx.team.findUnique({ where: { slug } });
        if (slugExists) slug = `${slug}-${Date.now()}`;
        team = await tx.team.create({ data: { name: trimmedTeamName, slug } });
      }
      resolvedTeamId = team.id;
    }

    let pilot;

    if (pilotId) {
      pilot = await tx.pilot.findUnique({ where: { id: pilotId } });
      if (!pilot) return null;
      // Update team if provided
      if (resolvedTeamId !== null) {
        pilot = await tx.pilot.update({
          where: { id: pilot.id },
          data: { teamId: resolvedTeamId },
        });
      }
    } else {
      // New registration — find by email or create
      pilot = email ? await tx.pilot.findFirst({ where: { email } }) : null;
      if (!pilot) {
        pilot = await tx.pilot.create({
          data: {
            name,
            alias: alias || null,
            email: email || null,
            phone: phone || null,
            kartNumber: parsedKartNumber,
            teamId: resolvedTeamId,
          },
        });
      } else {
        pilot = await tx.pilot.update({
          where: { id: pilot.id },
          data: {
            name,
            alias: alias || pilot.alias,
            phone: phone || pilot.phone,
            kartNumber: parsedKartNumber ?? pilot.kartNumber,
            ...(resolvedTeamId !== null && { teamId: resolvedTeamId }),
          },
        });
      }
    }

    const existing = await tx.inscription.findUnique({
      where: { eventId_pilotId_category: { eventId: event.id, pilotId: pilot.id, category } },
    });
    if (existing) return null;

    const parsedCompanions = companions ? parseInt(companions) : 0;

    const inscription = await tx.inscription.create({
      data: {
        eventId: event.id,
        pilotId: pilot.id,
        category,
        kartNumber: parsedKartNumber,
        companions: isNaN(parsedCompanions) ? 0 : parsedCompanions,
        notes: notes || null,
        selfRegistered: true,
        status: 'PENDING_PAYMENT',
      },
      include: { pilot: true },
    });

    return inscription;
  });

  if (!registration) {
    res.status(409).json({ error: 'Ya estás inscrito en esta categoría para este evento' }); return;
  }

  // Send confirmation email (fire-and-forget)
  if (registration.pilot.email) {
    sendInscriptionConfirmation(registration.pilot.email, {
      pilotName: registration.pilot.name,
      eventName: event.name,
      category: CATEGORY_LABELS[category] ?? category,
      serviceFee: Number(event.serviceFee),
      foodFee: Number(event.foodFee),
      transferInfo: event.transferInfo,
      eventUrl: `${config.APP_URL}/eventos/${event.slug}/inscribirse`,
    }).catch((err) => console.error('[EMAIL] inscription confirmation failed:', err));
  }

  res.status(201).json({
    inscription: registration,
    transferInfo: event.transferInfo,
    serviceFee: event.serviceFee,
    foodFee: event.foodFee,
    companions: registration.companions,
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

  const receiptPath = await uploadToDrive('receipts', req.file.buffer, req.file.originalname, req.file.mimetype, false);

  const updated = await prisma.inscription.update({
    where: { id },
    data: { receiptPath, status: 'RECEIPT_SUBMITTED' },
    include: { pilot: true },
  });

  res.json(updated);
}

export async function viewReceipt(req: Request, res: Response): Promise<void> {
  const inscription = await prisma.inscription.findUnique({ where: { id: req.params.id } });
  if (!inscription?.receiptPath) { res.status(404).json({ error: 'No hay recibo' }); return; }

  const { streamFromDrive } = await import('../lib/drive.service.js');
  const { stream, mimeType } = await streamFromDrive(inscription.receiptPath);
  res.setHeader('Content-Type', mimeType);
  (stream as NodeJS.ReadableStream).pipe(res);
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

  const totalFoodFee = Number(inscription.event.foodFee) * (inscription.companions + 1);

  const updated = await prisma.$transaction(async (tx) => {
    const insc = await tx.inscription.update({
      where: { id },
      data: { status: 'PAID' },
      include: { pilot: true, payments: true, checkIn: true },
    });
    if (Number(inscription.event.serviceFee) > 0) {
      await tx.payment.create({
        data: { inscriptionId: id, type: 'SERVICE_FEE', amount: inscription.event.serviceFee, notes: 'Pago aprobado via recibo', createdBy: user.name },
      });
    }
    if (totalFoodFee > 0) {
      await tx.payment.create({
        data: { inscriptionId: id, type: 'FOOD_FEE', amount: totalFoodFee, notes: `Comida ${inscription.companions + 1} persona(s)`, createdBy: user.name },
      });
    }
    return insc;
  });

  // Send payment approved email (fire-and-forget)
  if (updated.pilot.email) {
    sendPaymentApprovedEmail(
      updated.pilot.email,
      updated.pilot.name,
      inscription.event.name,
      `${config.APP_URL}/eventos/${slug}/parrilla`,
    ).catch((err) => console.error('[EMAIL] payment approved failed:', err));
  }

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
