/**
 * One-time migration: upload existing local files to Google Drive
 * and update DB records with drive: prefixed IDs.
 *
 * Run inside the backend container:
 *   node scripts/migrate-uploads-to-drive.mjs
 */

import { google } from 'googleapis';
import { createReadStream, existsSync } from 'fs';
import { extname } from 'path';
import { PrismaClient } from '@prisma/client';

const FOLDER_IDS = {
  posters:  '1ENaBUFRPAVPVL18leMP3_JuTVoXOkZPB',
  pilots:   '1OmeK8vzkG8klZLahzwFEpPrAkLEZC6bt',
  receipts: '1VvwJxUTdUooAz5d8Knxl0gt8PoAOB1eL',
};

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);
oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2 });
const prisma = new PrismaClient();

async function uploadFile(localPath, folder, isPublic) {
  const ext = extname(localPath).toLowerCase();
  const mimeType = MIME[ext] ?? 'application/octet-stream';
  const filename = localPath.split('/').pop();

  console.log(`  ↑ ${filename} → ${folder}...`);

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [FOLDER_IDS[folder]] },
    media: { mimeType, body: createReadStream(localPath) },
    fields: 'id',
  });

  const fileId = res.data.id;
  if (isPublic) {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  }
  console.log(`  ✓ drive:${fileId}`);
  return `drive:${fileId}`;
}

// ── Pilot photos ──────────────────────────────────────────────────────────────
console.log('\n── Pilot photos ──');
const pilots = await prisma.pilot.findMany({
  where: { photoUrl: { not: null }, AND: [{ photoUrl: { not: { startsWith: 'drive:' } } }] },
  select: { id: true, photoUrl: true },
});

for (const p of pilots) {
  const localPath = `/app${p.photoUrl}`;
  if (!existsSync(localPath)) { console.log(`  ⚠ Not found: ${localPath}`); continue; }
  const driveValue = await uploadFile(localPath, 'pilots', true);
  await prisma.pilot.update({ where: { id: p.id }, data: { photoUrl: driveValue } });
}

// ── Event posters ─────────────────────────────────────────────────────────────
console.log('\n── Event posters ──');
const events = await prisma.event.findMany({
  where: { posterUrl: { not: null }, AND: [{ posterUrl: { not: { startsWith: 'drive:' } } }] },
  select: { slug: true, posterUrl: true },
});

for (const e of events) {
  const localPath = `/app${e.posterUrl}`;
  if (!existsSync(localPath)) { console.log(`  ⚠ Not found: ${localPath}`); continue; }
  const driveValue = await uploadFile(localPath, 'posters', true);
  await prisma.event.update({ where: { slug: e.slug }, data: { posterUrl: driveValue } });
}

// ── Receipts ──────────────────────────────────────────────────────────────────
console.log('\n── Receipts ──');
const inscriptions = await prisma.inscription.findMany({
  where: { receiptPath: { not: null }, AND: [{ receiptPath: { not: { startsWith: 'drive:' } } }] },
  select: { id: true, receiptPath: true },
});

for (const i of inscriptions) {
  const localPath = `/app${i.receiptPath}`;
  if (!existsSync(localPath)) { console.log(`  ⚠ Not found: ${localPath}`); continue; }
  const driveValue = await uploadFile(localPath, 'receipts', false);
  await prisma.inscription.update({ where: { id: i.id }, data: { receiptPath: driveValue } });
}

await prisma.$disconnect();
console.log('\n✅ Migration complete');
