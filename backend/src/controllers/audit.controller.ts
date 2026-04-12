import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { globalBackfillAndRecalculate } from '../services/championship.service.js';

export async function recalculateConstructors(_req: Request, res: Response): Promise<void> {
  const result = await globalBackfillAndRecalculate();
  res.json({ ok: true, ...result });
}

export async function listAuditLog(req: Request, res: Response): Promise<void> {
  const { page, pageSize, skip } = getPaginationParams(req);
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
  const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;

  const where = {
    ...(eventId && { eventId }),
    ...(entityType && { entityType }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ items: logs, pagination: getPaginationMeta(page, pageSize, total) });
}
