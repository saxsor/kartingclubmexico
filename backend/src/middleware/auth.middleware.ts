import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  tokenType?: 'access' | 'refresh';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    if (payload.tokenType !== 'access') {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    next();
  };
}
