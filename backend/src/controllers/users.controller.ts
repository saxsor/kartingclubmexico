import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

export async function listUsers(req: Request, res: Response): Promise<void> {
  const { page, pageSize, skip } = getPaginationParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const role = typeof req.query.role === 'string' ? req.query.role : '';
  const activeParam = req.query.active;
  const activeFilter = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (activeFilter !== undefined) where.active = activeFilter;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    items: users,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { email, password, name, role } = req.body;
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role },
    select: userSelect,
  });
  res.status(201).json(user);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: userSelect,
  });
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
  res.json(user);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const { email, name, role, password } = req.body;
  const data: Record<string, unknown> = {};
  if (email) data.email = email;
  if (name) data.name = name;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: userSelect,
  });
  res.json(user);
}

export async function setUserActive(req: Request, res: Response): Promise<void> {
  const { active } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { active },
    select: userSelect,
  });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
