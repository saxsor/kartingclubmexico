import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import { config } from '../config/index.js';

export const FOLDER_IDS = {
  posters:  '1ENaBUFRPAVPVL18leMP3_JuTVoXOkZPB',
  pilots:   '1OmeK8vzkG8klZLahzwFEpPrAkLEZC6bt',
  teams:    config.GOOGLE_DRIVE_TEAMS_FOLDER_ID || config.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || '1OmeK8vzkG8klZLahzwFEpPrAkLEZC6bt',
  receipts: '1VvwJxUTdUooAz5d8Knxl0gt8PoAOB1eL',
  diplomas: config.GOOGLE_DRIVE_DIPLOMAS_FOLDER_ID || '1ENaBUFRPAVPVL18leMP3_JuTVoXOkZPB',
  photos:   config.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || '1ENaBUFRPAVPVL18leMP3_JuTVoXOkZPB',
} as const;

export type DriveFolder = keyof typeof FOLDER_IDS;

export const DRIVE_PREFIX = 'drive:';

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2;
}

/**
 * Finds or creates a folder with the given name inside a parent folder
 */
export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  
  // Search for existing folder
  const search = await drive.files.list({
    q: `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!;
  }

  // Create if not found
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return folder.data.id!;
}

export async function uploadToDrive(
  folder: DriveFolder | string,
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  isPublic = true,
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  const ext = path.extname(originalName) || '';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  // If folder matches a key in FOLDER_IDS use that, otherwise assume it's a raw folder ID
  const parentId = (FOLDER_IDS as any)[folder] || folder;

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [parentId] },
    media: { mimeType: mimetype, body: Readable.from(buffer) },
    fields: 'id',
  });

  const fileId = res.data.id!;

  if (isPublic) {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  }

  return `${DRIVE_PREFIX}${fileId}`;
}

export async function deleteFromDrive(storedValue: string): Promise<void> {
  try {
    if (!storedValue.startsWith(DRIVE_PREFIX)) return;
    const fileId = storedValue.slice(DRIVE_PREFIX.length);
    const drive = google.drive({ version: 'v3', auth: getAuth() });
    await drive.files.delete({ fileId });
  } catch {
    // Ignore
  }
}

export async function streamFromDrive(storedValue: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
  const fileId = storedValue.startsWith(DRIVE_PREFIX)
    ? storedValue.slice(DRIVE_PREFIX.length)
    : storedValue;

  const drive = google.drive({ version: 'v3', auth: getAuth() });
  const meta = await drive.files.get({ fileId, fields: 'mimeType' });
  const mimeType = meta.data.mimeType ?? 'application/octet-stream';
  const fileRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

  return { stream: fileRes.data as NodeJS.ReadableStream, mimeType };
}

export function isDriveValue(value: string | null | undefined): boolean {
  return !!value?.startsWith(DRIVE_PREFIX);
}
