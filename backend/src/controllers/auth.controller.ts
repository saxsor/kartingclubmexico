import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { JwtPayload } from '../middleware/auth.middleware.js';

function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions);
}

function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
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

  const token = signToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export function logout(_req: Request, res: Response): void {
  // JWT is stateless; client discards token
  res.json({ message: 'Sesión cerrada' });
}

export function me(req: Request, res: Response): void {
  res.json({ user: req.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken requerido' });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, config.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      res.status(401).json({ error: 'Usuario no válido' });
      return;
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.json({ token: signToken(newPayload) });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
}
