import { Request, Response } from 'express';
import archiver from 'archiver';
import slugify from 'slugify';
import { prisma } from '../lib/prisma.js';
import { uploadToDrive, deleteFromDrive, isDriveValue, streamFromDrive, getOrCreateFolder, FOLDER_IDS } from '../lib/drive.service.js';
import { applyWatermark } from '../lib/watermark.service.js';

async function getPhotoBinary(fileUrl: string): Promise<Buffer> {
  const { stream } = await streamFromDrive(fileUrl);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function getWatermarkedPhoto(fileUrl: string): Promise<Buffer> {
  const original = await getPhotoBinary(fileUrl);
  return applyWatermark(original);
}

function buildPhotoFilename(index: number, photoId: string): string {
  return `foto-${String(index + 1).padStart(2, '0')}-${photoId.slice(0, 8)}.jpg`;
}

export async function getAlbumByEvent(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const album = await prisma.photoAlbum.findUnique({
    where: { eventId: event.id },
    include: { photos: { orderBy: { order: 'asc' } } },
  });

  if (!album) { res.json(null); return; }
  res.json(album);
}

export async function createAlbum(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const existing = await prisma.photoAlbum.findUnique({ where: { eventId: event.id } });
  if (existing) { res.status(409).json({ error: 'Ya existe un album para este evento' }); return; }

  const { title, description } = req.body as { title: string; description?: string };
  const album = await prisma.photoAlbum.create({
    data: { eventId: event.id, title, description },
    include: { photos: true },
  });
  res.status(201).json(album);
}

export async function updateAlbum(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const album = await prisma.photoAlbum.findUnique({ where: { eventId: event.id } });
  if (!album) { res.status(404).json({ error: 'Album no encontrado' }); return; }

  const { title, description, isPublished, coverUrl } = req.body as {
    title?: string;
    description?: string;
    isPublished?: boolean;
    coverUrl?: string;
  };

  const updated = await prisma.photoAlbum.update({
    where: { id: album.id },
    data: { title, description, isPublished, coverUrl },
    include: { photos: { orderBy: { order: 'asc' } } },
  });
  res.json(updated);
}

export async function deleteAlbum(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const album = await prisma.photoAlbum.findUnique({
    where: { eventId: event.id },
    include: { photos: true },
  });
  if (!album) { res.status(404).json({ error: 'Album no encontrado' }); return; }

  await Promise.allSettled(album.photos.map((p) => deleteFromDrive(p.fileUrl)));
  await prisma.photoAlbum.delete({ where: { id: album.id } });
  res.status(204).send();
}

export async function uploadPhotosHandler(req: Request, res: Response): Promise<void> {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  let album = await prisma.photoAlbum.findUnique({ where: { eventId: event.id } });
  if (!album) {
    album = await prisma.photoAlbum.create({
      data: { eventId: event.id, title: event.name },
    });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No se recibieron archivos' });
    return;
  }

  // Create or get subfolder for the event
  const parentFolderId = FOLDER_IDS.photos;
  const eventFolderId = await getOrCreateFolder(event.name, parentFolderId);

  const maxOrder = await prisma.photo.aggregate({
    where: { albumId: album.id },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  const created: { id: string; albumId: string; fileUrl: string; order: number; createdAt: Date }[] = [];
  for (const file of files) {
    const fileUrl = await uploadToDrive(eventFolderId, file.buffer, file.originalname, file.mimetype, true);
    const photo = await prisma.photo.create({
      data: { albumId: album.id, fileUrl, order: nextOrder++ },
    });
    created.push(photo);
  }

  if (!album.coverUrl && created.length > 0) {
    await prisma.photoAlbum.update({
      where: { id: album.id },
      data: { coverUrl: created[0].fileUrl },
    });
  }

  res.status(201).json(created);
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
  if (!photo) { res.status(404).json({ error: 'Foto no encontrada' }); return; }

  if (isDriveValue(photo.fileUrl)) await deleteFromDrive(photo.fileUrl);

  const album = await prisma.photoAlbum.findUnique({ where: { id: photo.albumId } });
  if (album?.coverUrl === photo.fileUrl) {
    const next = await prisma.photo.findFirst({
      where: { albumId: photo.albumId, id: { not: photo.id } },
      orderBy: { order: 'asc' },
    });
    await prisma.photoAlbum.update({
      where: { id: photo.albumId },
      data: { coverUrl: next?.fileUrl ?? null },
    });
  }

  await prisma.photo.delete({ where: { id: photo.id } });
  res.status(204).send();
}

export async function reorderPhotos(req: Request, res: Response): Promise<void> {
  const { order } = req.body as { order: { id: string; order: number }[] };
  if (!Array.isArray(order)) { res.status(400).json({ error: 'order debe ser un array' }); return; }

  await prisma.$transaction(
    order.map(({ id, order: o }) => prisma.photo.update({ where: { id }, data: { order: o } }))
  );
  res.status(204).send();
}

export async function downloadPhoto(req: Request, res: Response): Promise<void> {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
  if (!photo) { res.status(404).json({ error: 'Foto no encontrada' }); return; }

  const watermarked = await getWatermarkedPhoto(photo.fileUrl);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="kcm-foto-${photo.id.slice(0, 8)}.jpg"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(watermarked);
}

export async function downloadBulkPhotos(req: Request, res: Response): Promise<void> {
  const rawPhotoIds = Array.isArray(req.query.photoId)
    ? req.query.photoId
    : req.query.photoId !== undefined
      ? [req.query.photoId]
      : [];

  const photoIds = rawPhotoIds.filter((value): value is string => typeof value === 'string');

  const uniquePhotoIds = [...new Set(photoIds.map((value) => value.trim()).filter(Boolean))];
  if (uniquePhotoIds.length === 0) {
    res.status(400).json({ error: 'Selecciona al menos una foto' });
    return;
  }
  if (uniquePhotoIds.length > 20) {
    res.status(400).json({ error: 'Solo puedes descargar hasta 20 fotos por vez' });
    return;
  }

  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) { res.status(404).json({ error: 'Evento no encontrado' }); return; }

  const album = await prisma.photoAlbum.findUnique({
    where: { eventId: event.id },
    include: { photos: { orderBy: { order: 'asc' } } },
  });
  if (!album || !album.isPublished) {
    res.status(404).json({ error: 'Galería no disponible' });
    return;
  }

  const selectedPhotos = album.photos.filter((photo) => uniquePhotoIds.includes(photo.id));
  if (selectedPhotos.length !== uniquePhotoIds.length) {
    res.status(400).json({ error: 'Una o más fotos no pertenecen a esta galería' });
    return;
  }

  const orderedPhotos = uniquePhotoIds
    .map((photoId) => selectedPhotos.find((photo) => photo.id === photoId))
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo));

  const zipName = `${slugify(event.name, { lower: true, strict: true }) || 'galeria'}-fotos.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  res.setHeader('Cache-Control', 'no-store');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    throw error;
  });
  archive.pipe(res);

  for (const [index, photo] of orderedPhotos.entries()) {
    const watermarked = await getWatermarkedPhoto(photo.fileUrl);
    archive.append(watermarked, { name: buildPhotoFilename(index, photo.id) });
  }

  await archive.finalize();
}
