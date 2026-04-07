import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { config } from '../config/index.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  // Always respond 200 to avoid user enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' });
    return;
  }

  // Revoke any existing unexpired tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await sendPasswordResetEmail(user.email, user.name, rawToken);

  res.json({ message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;

  if (!token || !password || password.length < 8) {
    res.status(400).json({ error: 'Token y contraseña (mínimo 8 caracteres) son requeridos.' });
    return;
  }

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
    res.status(400).json({ error: 'El enlace es inválido o ya expiró.' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    // Revoke all refresh tokens (force re-login)
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
}

export async function validateResetToken(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  const valid = !!(stored && stored.usedAt === null && stored.expiresAt >= new Date());
  res.json({ valid });
}
