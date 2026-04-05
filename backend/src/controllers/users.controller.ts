import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { name: 'asc' } });
  res.json(users);
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
