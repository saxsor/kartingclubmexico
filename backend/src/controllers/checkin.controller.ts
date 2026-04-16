import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function listCheckIns(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const inscriptions = await prisma.inscription.findMany({
    where: { eventId: event.id },
    include: {
      pilot: true,
      payments: true,
      checkIn: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(inscriptions);
}

export async function doCheckIn(req: Request, res: Response): Promise<void> {
  const { kartNumber, kartNotes } = req.body;
  const confirmedBy = req.user?.name ?? 'Sistema';

  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: { event: true, payments: true, checkIn: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }

  // Check debt block
  if (inscription.event.blockCheckInOnDebt && inscription.status === 'PENDING_PAYMENT') {
    res.status(400).json({ error: 'El piloto tiene deuda pendiente. Check-in bloqueado.' });
    return;
  }

  if (inscription.checkIn) {
    res.status(409).json({ error: 'El piloto ya hizo check-in' });
    return;
  }

  const checkIn = await prisma.$transaction(async (tx) => {
    const checkIn = await tx.checkIn.create({
      data: { inscriptionId: inscription.id, kartNumber, confirmedBy },
    });

    await tx.inscription.update({
      where: { id: inscription.id },
      data: { kartNumber, ...(kartNotes !== undefined && { kartNotes: kartNotes || null }) },
    });

    return checkIn;
  });

  res.status(201).json(checkIn);
}

export async function undoCheckIn(req: Request, res: Response): Promise<void> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: { checkIn: true },
  });
  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada' }); return; }
  if (!inscription.checkIn) { res.status(404).json({ error: 'No existe check-in' }); return; }

  await prisma.checkIn.delete({ where: { inscriptionId: inscription.id } });
  res.status(204).send();
}
