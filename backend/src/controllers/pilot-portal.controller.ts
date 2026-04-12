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

  await sendPilotMagicLinkEmail(pilot.email, pilot.name, rawToken);

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
  res.json(pilot);
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

  res.json(updated);
}
