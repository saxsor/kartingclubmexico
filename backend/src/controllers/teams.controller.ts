import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { uploadToDrive, deleteFromDrive, isDriveValue } from '../lib/drive.service.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function searchTeams(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const teams = await prisma.team.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
    take: 20,
    select: { id: true, name: true, slug: true, active: true },
  });
  res.json(teams);
}

export async function listTeams(_req: Request, res: Response): Promise<void> {
  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { pilots: true } } },
  });
  res.json(teams);
}

export async function getTeam(req: Request, res: Response): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: {
      pilots: {
        where: { active: true },
        select: { id: true, name: true, alias: true, kartNumber: true, photoUrl: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { pilots: true } },
    },
  });
  if (!team) { res.status(404).json({ error: 'Equipo no encontrado' }); return; }
  res.json(team);
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const { name } = req.body;
  const existing = await prisma.team.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) {
    res.status(409).json({ error: 'Ya existe un equipo con ese nombre', team: existing });
    return;
  }

  let slug = slugify(name);
  // ensure slug uniqueness
  const slugExists = await prisma.team.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${Date.now()}`;

  const team = await prisma.team.create({
    data: { name, slug },
  });
  res.status(201).json(team);
}

export async function uploadTeamLogo(req: Request, res: Response): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) { res.status(404).json({ error: 'Equipo no encontrado' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }

  if (team.logoUrl && isDriveValue(team.logoUrl)) {
    await deleteFromDrive(team.logoUrl);
  }

  const logoUrl = await uploadToDrive('teams', req.file.buffer, req.file.originalname, req.file.mimetype, true);
  const updated = await prisma.team.update({ where: { id: req.params.id }, data: { logoUrl } });
  res.json(updated);
}

export async function deleteTeamLogo(req: Request, res: Response): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) { res.status(404).json({ error: 'Equipo no encontrado' }); return; }

  if (team.logoUrl && isDriveValue(team.logoUrl)) {
    await deleteFromDrive(team.logoUrl);
  }

  const updated = await prisma.team.update({ where: { id: req.params.id }, data: { logoUrl: null } });
  res.json(updated);
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  const { name, active } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    data.name = name;
    let slug = slugify(name);
    const slugExists = await prisma.team.findFirst({ where: { slug, NOT: { id: req.params.id } } });
    if (slugExists) slug = `${slug}-${Date.now()}`;
    data.slug = slug;
  }
  if (active !== undefined) data.active = active;

  const team = await prisma.team.update({
    where: { id: req.params.id },
    data,
    include: { _count: { select: { pilots: true } } },
  });
  res.json(team);
}
