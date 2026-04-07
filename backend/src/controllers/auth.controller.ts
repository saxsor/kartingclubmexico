import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { JwtPayload } from '../middleware/auth.middleware.js';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, tokenType: 'access' },
    config.JWT_SECRET,
    { expiresIn: '15m' } as jwt.SignOptions,
  );
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = config.NODE_ENV === 'production';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/',
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/auth',
  });

  // Non-httpOnly CSRF token so the frontend can read it and send as X-CSRF-Token header.
  // Lifetime matches the refresh token — the value rotates on every token refresh,
  // so there's no security benefit to expiring it with the short-lived access token.
  // Using ACCESS_TOKEN_MAX_AGE here caused 403s: the csrf cookie expired while the
  // refresh token was still valid, and the CSRF check runs before auth (so no 401 retry).
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  });
}

function clearCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('csrf_token', { path: '/' });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

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

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refresh_token;

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {/* ignore if token not found */});
  }

  clearCookies(res);
  res.json({ message: 'Sesión cerrada' });
}

export function me(req: Request, res: Response): void {
  res.json({ user: req.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !storedToken ||
    storedToken.revokedAt !== null ||
    storedToken.expiresAt < new Date()
  ) {
    clearCookies(res);
    res.status(401).json({ error: 'Sesión expirada' });
    return;
  }

  if (!storedToken.user.active) {
    clearCookies(res);
    res.status(401).json({ error: 'Usuario no válido' });
    return;
  }

  // Rotate: revoke old token, issue new pair
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const newPayload: JwtPayload = {
    sub: storedToken.user.id,
    email: storedToken.user.email,
    name: storedToken.user.name,
    role: storedToken.user.role,
  };

  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = crypto.randomBytes(64).toString('hex');

  await prisma.refreshToken.create({
    data: {
      userId: storedToken.user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
    },
  });

  setCookies(res, newAccessToken, newRefreshToken);
  res.json({ ok: true });
}
