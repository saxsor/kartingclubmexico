import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo es demasiado grande'
      : `Error al subir archivo: ${err.message}`;
    res.status(400).json({ error: msg });
    return;
  }

  // Prisma unique constraint violation
  if ((err as NodeJS.ErrnoException).code === 'P2002') {
    res.status(409).json({ error: 'El registro ya existe (conflicto de unicidad)' });
    return;
  }

  // Prisma not found
  if ((err as NodeJS.ErrnoException).code === 'P2025') {
    res.status(404).json({ error: 'Registro no encontrado' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
