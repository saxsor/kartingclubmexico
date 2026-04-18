import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPaginationMeta, getPaginationParams } from '../lib/pagination.js';
import { backfillPilotTeamSnapshots, recalculateConstructorStandings } from '../services/championship.service.js';
import { uploadToDrive, deleteFromDrive, isDriveValue } from '../lib/drive.service.js';

export async function listPilots(req: Request, res: Response): Promise<void> {
  const { page, pageSize, skip } = getPaginationParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const parsedKartNumber = search && /^\d+$/.test(search) ? Number(search) : undefined;

  const activeParam = req.query.active;
  const activeFilter = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined;

  const searchClause = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { alias: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          ...(parsedKartNumber !== undefined ? [{ kartNumber: parsedKartNumber }] : []),
        ],
      }
    : {};
  const where = {
    ...searchClause,
    ...(activeFilter !== undefined ? { active: activeFilter } : {}),
  };
  const finalWhere = Object.keys(where).length > 0 ? where : undefined;

  const [pilots, total] = await prisma.$transaction([
    prisma.pilot.findMany({
      where: finalWhere,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
      include: { team: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.pilot.count({ where: finalWhere }),
  ]);

  res.json({
    items: pilots,
    pagination: getPaginationMeta(page, pageSize, total),
  });
}

export async function createPilot(req: Request, res: Response): Promise<void> {
  const { name, alias, kartNumber, phone, email, engine } = req.body;
  const pilot = await prisma.pilot.create({
    data: { name, alias, kartNumber, phone, email, engine },
  });
  res.status(201).json(pilot);
}

export async function getPilot(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({
    where: { id: req.params.id },
    include: { team: { select: { id: true, name: true, slug: true } } },
  });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }
  res.json(pilot);
}

export async function updatePilot(req: Request, res: Response): Promise<void> {
  const { name, alias, kartNumber, phone, email, active, engine, teamId } = req.body;

  const before = await prisma.pilot.findUnique({ where: { id: req.params.id }, select: { teamId: true } });

  const pilot = await prisma.pilot.update({
    where: { id: req.params.id },
    data: { name, alias, kartNumber, phone, email, active, engine, teamId },
    include: { team: { select: { id: true, name: true, slug: true } } },
  });

  // If teamId was assigned or changed, backfill NULL snapshots and recalculate
  const teamChanged = teamId !== undefined && teamId !== before?.teamId;
  if (teamChanged && teamId) {
    backfillPilotTeamSnapshots(req.params.id, teamId)
      .then((combos) => Promise.all(combos.map((c) => recalculateConstructorStandings(c.year, c.category))))
      .catch((err) => console.error('[TEAM BACKFILL]', err));
  }

  res.json(pilot);
}

export async function deletePilot(req: Request, res: Response): Promise<void> {
  const count = await prisma.inscription.count({ where: { pilotId: req.params.id } });
  if (count > 0) {
    res.status(409).json({ error: `No se puede eliminar: el piloto tiene ${count} inscripción(es) en eventos. Elimina primero sus inscripciones.` });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.championshipStanding.deleteMany({ where: { pilotId: req.params.id } });
    await tx.pilot.delete({ where: { id: req.params.id } });
  });
  res.status(204).send();
}

export async function uploadPilotPhoto(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({ where: { id: req.params.id } });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }

  if (pilot.photoUrl && isDriveValue(pilot.photoUrl)) {
    await deleteFromDrive(pilot.photoUrl);
  }

  const photoUrl = await uploadToDrive('pilots', req.file.buffer, req.file.originalname, req.file.mimetype, true);
  const updated = await prisma.pilot.update({ where: { id: req.params.id }, data: { photoUrl } });
  res.json(updated);
}

export async function deletePilotPhoto(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({ where: { id: req.params.id } });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }

  if (pilot.photoUrl && isDriveValue(pilot.photoUrl)) {
    await deleteFromDrive(pilot.photoUrl);
  }

  const updated = await prisma.pilot.update({ where: { id: req.params.id }, data: { photoUrl: null } });
  res.json(updated);
}

export async function getPilotHistory(req: Request, res: Response): Promise<void> {
  const pilot = await prisma.pilot.findUnique({ where: { id: req.params.id } });
  if (!pilot) { res.status(404).json({ error: 'Piloto no encontrado' }); return; }

  const inscriptions = await prisma.inscription.findMany({
    where: { pilotId: req.params.id },
    include: {
      event: { select: { id: true, name: true, slug: true, date: true, year: true } },
      raceResults: {
        include: { race: { select: { number: true, category: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const standings = await prisma.championshipStanding.findMany({
    where: { pilotId: req.params.id },
    orderBy: [{ year: 'desc' }, { category: 'asc' }],
  });

  res.json({ pilot, inscriptions, standings });
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function importPilots(req: Request, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo CSV' }); return; }

  const text = req.file.buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((l) => l.trim());

  if (lines.length < 2) { res.status(400).json({ error: 'El CSV debe tener encabezado y al menos una fila' }); return; }

  // Detect header (first row), map columns by name
  const header = parseCsvRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const colIdx = {
    name: header.findIndex((h) => ['nombre', 'name'].includes(h)),
    alias: header.findIndex((h) => ['alias', 'apodo'].includes(h)),
    email: header.findIndex((h) => h === 'email' || h === 'correo'),
    phone: header.findIndex((h) => ['telefono', 'phone', 'tel'].includes(h)),
    kartNumber: header.findIndex((h) => ['kart', 'kartnumber', 'numero'].includes(h)),
  };

  if (colIdx.name === -1) {
    res.status(400).json({ error: 'El CSV debe tener una columna "nombre" o "name"' });
    return;
  }

  const dataRows = lines.slice(1);
  const preview: { name: string; alias: string; email: string; phone: string; kartNumber: string; action: 'create' | 'update' }[] = [];

  for (const line of dataRows) {
    if (!line.trim()) continue;
    const cols = parseCsvRow(line);
    const name = cols[colIdx.name] ?? '';
    if (!name) continue;
    const alias = colIdx.alias >= 0 ? (cols[colIdx.alias] ?? '') : '';
    const email = colIdx.email >= 0 ? (cols[colIdx.email] ?? '') : '';
    const phone = colIdx.phone >= 0 ? (cols[colIdx.phone] ?? '') : '';
    const kartNumber = colIdx.kartNumber >= 0 ? (cols[colIdx.kartNumber] ?? '') : '';

    const existing = email ? await prisma.pilot.findFirst({ where: { email } }) : null;
    preview.push({ name, alias, email, phone, kartNumber, action: existing ? 'update' : 'create' });
  }

  // If query param confirm=true, actually execute
  if (req.query.confirm === 'true') {
    let created = 0, updated = 0, errors = 0;
    for (const row of preview) {
      try {
        const kart = row.kartNumber ? parseInt(row.kartNumber) : undefined;
        const existing = row.email ? await prisma.pilot.findFirst({ where: { email: row.email } }) : null;
        if (existing) {
          await prisma.pilot.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              alias: row.alias || existing.alias,
              phone: row.phone || existing.phone,
              kartNumber: kart ?? existing.kartNumber,
            },
          });
          updated++;
        } else {
          await prisma.pilot.create({
            data: {
              name: row.name,
              alias: row.alias || null,
              email: row.email || null,
              phone: row.phone || null,
              kartNumber: kart ?? null,
            },
          });
          created++;
        }
      } catch { errors++; }
    }
    res.json({ created, updated, errors, total: preview.length });
    return;
  }

  res.json({ preview, total: preview.length });
}
