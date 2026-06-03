import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { sendPilotMagicLinkEmail } from '../services/email.service.js';
import { uploadPilotPhoto } from '../lib/upload.js';
import { uploadToDrive, deleteFromDrive, isDriveValue } from '../lib/drive.service.js';
import { JwtPayload } from '../middleware/auth.middleware.js';
import { calculateInscriptionFees, calculateMultipleInscriptionsFees } from '../lib/fees.js';

const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, tokenType: 'access' }, config.JWT_SECRET, { expiresIn: '15m' } as jwt.SignOptions);
}

function setCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = config.NODE_ENV === 'production';
  res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: ACCESS_TOKEN_MAX_AGE, path: '/' });
  res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: REFRESH_TOKEN_MAX_AGE, path: '/api/auth' });
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, { httpOnly: false, sameSite: 'lax', secure: isProduction, maxAge: REFRESH_TOKEN_MAX_AGE, path: '/' });
}

// POST /api/pilot/self-register
export async function selfRegisterPilot(req: Request, res: Response): Promise<void> {
  const { name, alias, email, phone } = req.body;

  // Check for duplicate (same name + email)
  const existing = await prisma.pilot.findFirst({ where: { email, active: true } });
  if (existing) {
    res.status(409).json({ error: 'Ya existe un piloto registrado con ese correo. Usa la opción de acceso con enlace.' });
    return;
  }

  const pilot = await prisma.pilot.create({
    data: { name, alias: alias || null, email, phone: phone || null },
  });

  // Send magic link immediately
  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.pilotMagicToken.create({
    data: {
      pilotId: pilot.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    },
  });
  try {
    await sendPilotMagicLinkEmail(email, name, rawToken);
  } catch (err) {
    console.error('[pilot-portal] email send failed:', err);
    res.status(503).json({ error: 'Tu cuenta fue creada pero no fue posible enviar el correo. Contacta al organizador.' });
    return;
  }

  res.status(201).json({ message: 'Piloto registrado. Revisa tu correo para acceder a tu perfil.', pilotId: pilot.id });
}

// POST /api/pilot/request-access
export async function requestMagicLink(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  const pilot = await prisma.pilot.findFirst({ where: { email, active: true } });

  // Always respond the same to avoid enumeration
  if (!pilot || !pilot.email) {
    res.json({ message: 'Si el correo está registrado, recibirás un enlace de acceso.' });
    return;
  }

  // Invalidate existing active tokens
  await prisma.pilotMagicToken.updateMany({
    where: { pilotId: pilot.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.pilotMagicToken.create({
    data: {
      pilotId: pilot.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    },
  });

  try {
    await sendPilotMagicLinkEmail(pilot.email, pilot.name, rawToken);
  } catch (err) {
    console.error('[pilot-portal] email send failed:', err);
    res.status(503).json({ error: 'No fue posible enviar el correo. Por favor contacta al organizador.' });
    return;
  }

  res.json({ message: 'Si el correo está registrado, recibirás un enlace de acceso.' });
}

// POST /api/pilot/verify-access
export async function verifyMagicLink(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token requerido.' });
    return;
  }

  const stored = await prisma.pilotMagicToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { pilot: true },
  });

  if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
    res.status(400).json({ error: 'El enlace es inválido o ya expiró.' });
    return;
  }

  // Mark token as used
  await prisma.pilotMagicToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });

  // Find or create PILOT User linked to this pilot
  let user = await prisma.user.findFirst({ where: { pilotId: stored.pilotId } });
  if (!user) {
    const fakePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    user = await prisma.user.create({
      data: {
        email: stored.pilot.email!,
        password: fakePassword,
        name: stored.pilot.name,
        role: 'PILOT',
        pilotId: stored.pilotId,
        active: true,
      },
    });
  }

  const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role, pilotId: stored.pilotId };
  const accessToken = signAccessToken(payload);
  const refreshToken = crypto.randomBytes(64).toString('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    },
  });

  setCookies(res, accessToken, refreshToken);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

// GET /api/pilot/me
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const pilotId = req.user!.pilotId;
  if (!pilotId) { res.status(403).json({ error: 'No vinculado a un piloto.' }); return; }

  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    include: {
      team: { select: { id: true, name: true } },
      inscriptions: {
        include: {
          event: { select: { id: true, name: true, slug: true, date: true, status: true, serviceFee: true, foodFee: true } },
          payments: true,
          checkIn: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      standings: {
        orderBy: [{ year: 'desc' }, { category: 'asc' }],
      },
    },
  });

  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado.' }); return; }

  const feesMap = await calculateMultipleInscriptionsFees(pilot.inscriptions as any);
  const inscriptions = pilot.inscriptions.map((i) => ({
    ...i,
    ...feesMap[i.id],
  }));

  res.json({ ...pilot, inscriptions });
}

// PUT /api/pilot/me
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const pilotId = req.user!.pilotId;
  if (!pilotId) { res.status(403).json({ error: 'No vinculado a un piloto.' }); return; }

  const { name, alias, phone, engine, kartNumber, teamId } = req.body;

  const pilot = await prisma.pilot.update({
    where: { id: pilotId },
    data: {
      ...(name !== undefined && { name }),
      ...(alias !== undefined && { alias }),
      ...(phone !== undefined && { phone }),
      ...(engine !== undefined && { engine }),
      ...(kartNumber !== undefined && { kartNumber: kartNumber === null ? null : Number(kartNumber) }),
      ...(teamId !== undefined && { teamId: teamId || null }),
    },
    include: { team: { select: { id: true, name: true } } },
  });

  // Keep User name in sync
  if (name !== undefined) {
    await prisma.user.updateMany({ where: { pilotId }, data: { name } });
  }

  res.json(pilot);
}

// POST /api/pilot/me/photo
export const uploadMyPhotoMiddleware = uploadPilotPhoto.single('photo');

export async function updateMyPhoto(req: Request, res: Response): Promise<void> {
  const pilotId = req.user!.pilotId;
  if (!pilotId) { res.status(403).json({ error: 'No vinculado a un piloto.' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No se recibió ninguna imagen.' }); return; }

  const existing = await prisma.pilot.findUnique({ where: { id: pilotId }, select: { photoUrl: true } });
  if (existing?.photoUrl && isDriveValue(existing.photoUrl)) {
    await deleteFromDrive(existing.photoUrl);
  }

  const photoUrl = await uploadToDrive('pilots', req.file.buffer, req.file.originalname, req.file.mimetype, true);
  const pilot = await prisma.pilot.update({ where: { id: pilotId }, data: { photoUrl } });
  res.json(pilot);
}

// POST /api/pilot/registration-photo/:pilotId — public, only for pilots created in the last 30 min
export const registrationPhotoMiddleware = uploadPilotPhoto.single('photo');

export async function uploadRegistrationPhoto(req: Request, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json({ error: 'No se recibió ninguna imagen.' }); return; }

  const pilot = await prisma.pilot.findUnique({
    where: { id: req.params.pilotId },
    select: { id: true, photoUrl: true, createdAt: true },
  });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado.' }); return; }

  const minutesSinceCreation = (Date.now() - pilot.createdAt.getTime()) / 60000;
  if (minutesSinceCreation > 30) {
    res.status(403).json({ error: 'Este enlace de foto ya expiró. Accede a tu perfil con el magic link para subir tu foto.' });
    return;
  }

  if (pilot.photoUrl && isDriveValue(pilot.photoUrl)) {
    await deleteFromDrive(pilot.photoUrl);
  }

  const photoUrl = await uploadToDrive('pilots', req.file.buffer, req.file.originalname, req.file.mimetype, true);
  await prisma.pilot.update({ where: { id: pilot.id }, data: { photoUrl } });
  res.json({ ok: true });
}

// PUT /api/pilot/inscriptions/:id
export async function updateMyInscription(req: Request, res: Response): Promise<void> {
  const pilotId = req.user!.pilotId;
  if (!pilotId) { res.status(403).json({ error: 'No vinculado a un piloto.' }); return; }

  const inscription = await prisma.inscription.findUnique({
    where: { id: req.params.id },
    include: { event: true },
  });

  if (!inscription) { res.status(404).json({ error: 'Inscripción no encontrada.' }); return; }
  if (inscription.pilotId !== pilotId) { res.status(403).json({ error: 'Acceso denegado.' }); return; }
  if (inscription.event.status !== 'OPEN') {
    res.status(400).json({ error: 'Solo puedes editar tu inscripción mientras el evento esté abierto.' });
    return;
  }

  const { companions, kartNumber, engine } = req.body;

  const updated = await prisma.inscription.update({
    where: { id: req.params.id },
    data: {
      ...(companions !== undefined && { companions }),
      ...(kartNumber !== undefined && { kartNumber }),
      ...(engine !== undefined && { engine }),
    },
    include: { event: { select: { id: true, name: true, slug: true, date: true, status: true, serviceFee: true, foodFee: true } }, payments: true, checkIn: true },
  });

  const fees = await calculateInscriptionFees(updated.id);
  res.json({ ...updated, ...fees });
}
