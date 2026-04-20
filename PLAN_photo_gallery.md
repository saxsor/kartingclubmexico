# Plan: Galería de Fotos — Karting Club México

## Resumen

Galería de fotos pública por evento. El admin sube fotos desde el panel; cualquier visitante puede verlas en un lightbox full-screen, descargarlas (con watermark) y compartirlas en redes (con watermark). Sin login, sin tagging, sin fricción.

## Decisiones de arquitectura

| Decisión | Elección | Razón |
|----------|----------|-------|
| Storage | Google Drive, archivos **públicos** | Las fotos se sirven directo vía `lh3.googleusercontent.com` — sin carga en el backend para cada vista |
| Watermark | Aplicado **server-side con `sharp`** solo en el endpoint `/download` | Las vistas son rápidas (Drive CDN), solo el endpoint de descarga/compartir pasa por el servidor |
| Compartir en redes | Web Share API (URL a la página + `?photo=N`) | Comparte el link al sitio; en móvil abre el sheet nativo de compartir |
| Album | **1 album por evento** — modelo `PhotoAlbum` con `eventId unique` | Simplifica navegación; no hay ambigüedad |
| Bulk upload | `multer.array('photos', 50)` | Hasta 50 fotos a la vez, procesadas en secuencia |
| Orden de fotos | Campo `order: Int`, drag-and-drop en admin | El admin puede reordenar el album antes de publicarlo |
| Watermark asset | `/backend/assets/watermark.png` — PNG con transparencia | Logo de la marca; posición bottom-right; ~20% del ancho de la imagen |

---

## Phase 0: Documentation Discovery ✅ COMPLETE

### Allowed APIs confirmados

**Drive service** (`backend/src/lib/drive.service.ts`):
- `uploadToDrive(folder, buffer, originalName, mimetype, isPublic): Promise<string>` → retorna `"drive:FILE_ID"`
- `deleteFromDrive(storedValue: string): Promise<void>`
- `streamFromDrive(storedValue: string): Promise<{ stream, mimeType }>`
- `isDriveValue(value): boolean`
- `DRIVE_PREFIX = 'drive:'`
- FOLDER_IDS existentes: `posters`, `pilots`, `receipts`, `diplomas`

**Multer** (`backend/src/lib/upload.ts`): `memoryStorage()`, 10MB limit, `req.file.buffer` / `req.files` disponibles. Versión 2.1.1+.

**Frontend API** (`frontend/src/api/client.ts`): `uploadWithAuth<T>(path, formData)` para uploads con CSRF + cookie auth.

**Imagen URL** (`frontend/src/lib/utils.ts`): `resolveMediaUrl(url)` convierte `"drive:ID"` → `https://lh3.googleusercontent.com/d/{ID}`.

**sharp**: NO instalado. Debe agregarse en Phase 1.

### Anti-patterns a evitar
- No usar `req.file` cuando se sube bulk — usar `req.files` (array)
- No hacer archivos de fotos privados en Drive (añade carga innecesaria al backend para thumbnails)
- No usar `jimp` — `sharp` es el estándar moderno y mucho más rápido

---

## Phase 1: Backend — Modelos, Drive, Watermark, API

### 1.1 Instalar sharp

```bash
cd backend && npm install sharp && npm install --save-dev @types/sharp
```

### 1.2 Agregar carpeta `photos` a FOLDER_IDS

**Archivo:** `backend/src/lib/drive.service.ts`

Agregar en el objeto `FOLDER_IDS`:
```typescript
photos: process.env.GOOGLE_DRIVE_PHOTOS_FOLDER_ID || 'PLACEHOLDER_ID',
```

**Variable de entorno a agregar en `.env`:**
```env
GOOGLE_DRIVE_PHOTOS_FOLDER_ID=<ID_de_carpeta_en_Drive>
```

> Crear la carpeta manualmente en Google Drive y copiar su ID.

### 1.3 Agregar modelos Prisma

**Archivo:** `backend/prisma/schema.prisma`

Agregar al final (antes del último `}`):
```prisma
model PhotoAlbum {
  id          String   @id @default(uuid())
  eventId     String   @unique
  title       String
  description String?
  isPublished Boolean  @default(false)
  coverUrl    String?  // "drive:ID" de la foto de portada
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event  Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  photos Photo[]
}

model Photo {
  id        String   @id @default(uuid())
  albumId   String
  fileUrl   String   // "drive:FILE_ID"
  order     Int      @default(0)
  createdAt DateTime @default(now())

  album PhotoAlbum @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@index([albumId, order])
}
```

Agregar relación en el modelo `Event` existente (dentro del bloque Event):
```prisma
photoAlbum  PhotoAlbum?
```

**Correr migración:**
```bash
docker compose exec backend npx prisma migrate dev --name photo_gallery
```

### 1.4 Crear watermark service

**Archivo:** `backend/src/lib/watermark.service.ts`

```typescript
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATERMARK_PATH = join(__dirname, '../../assets/watermark.png');
const WATERMARK_WIDTH_RATIO = 0.22; // 22% del ancho de la imagen

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const watermarkPng = await readFile(WATERMARK_PATH);
  const image = sharp(imageBuffer);
  const meta = await image.metadata();
  const imageWidth = meta.width ?? 1920;

  const wmWidth = Math.round(imageWidth * WATERMARK_WIDTH_RATIO);
  const watermarkResized = await sharp(watermarkPng)
    .resize(wmWidth)
    .toBuffer();

  const wmMeta = await sharp(watermarkResized).metadata();
  const wmHeight = wmMeta.height ?? 80;
  const margin = Math.round(imageWidth * 0.02);

  return sharp(imageBuffer)
    .composite([{
      input: watermarkResized,
      gravity: 'southeast',
      left: (meta.width ?? imageWidth) - wmWidth - margin,
      top: (meta.height ?? 1080) - wmHeight - margin,
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
```

**Crear carpeta y asset placeholder:**
```bash
mkdir -p backend/assets
# Colocar aquí el archivo watermark.png (logo con fondo transparente)
```

> El archivo `backend/assets/watermark.png` debe ser el logo de Karting Club México en PNG con fondo transparente. Si no existe aún, crear un placeholder PNG hasta tener el asset final.

### 1.5 Crear controller

**Archivo:** `backend/src/controllers/photo-albums.controller.ts`

Endpoints a implementar (copiar patrón de `events.controller.ts:164-180` para uploads):

```typescript
// Patrón de imports (igual que events.controller.ts)
import { prisma } from '../lib/prisma.js';
import { uploadToDrive, deleteFromDrive, isDriveValue } from '../lib/drive.service.js';
import { applyWatermark } from '../lib/watermark.service.js';
import { streamFromDrive } from '../lib/drive.service.js';
import type { Request, Response } from 'express';
```

**Funciones a implementar:**

| Función | Descripción |
|---------|-------------|
| `getAlbumByEvent(req, res)` | GET público — devuelve album con fotos ordenadas por `order` |
| `createAlbum(req, res)` | POST admin — crea album vacío para un evento |
| `updateAlbum(req, res)` | PATCH admin — edita título, descripción, isPublished, coverUrl |
| `deleteAlbum(req, res)` | DELETE admin — elimina album, borra fotos de Drive en paralelo |
| `uploadPhotos(req, res)` | POST admin — bulk upload, `req.files` array, sube a Drive `photos` folder (isPublic: true), crea registros Photo |
| `deletePhoto(req, res)` | DELETE admin — elimina registro + archivo de Drive |
| `reorderPhotos(req, res)` | PATCH admin — recibe `[{ id, order }]` array, actualiza en transacción |
| `downloadPhoto(req, res)` | GET público — descarga foto desde Drive, aplica watermark con sharp, retorna como attachment |

**Patrón para `downloadPhoto`** (combinar `streamFromDrive` + `applyWatermark`):
```typescript
export async function downloadPhoto(req: Request, res: Response): Promise<void> {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.photoId } });
  if (!photo) { res.status(404).json({ error: 'Foto no encontrada' }); return; }

  const { stream } = await streamFromDrive(photo.fileUrl);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const original = Buffer.concat(chunks);
  const watermarked = await applyWatermark(original);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="foto-${photo.id}.jpg"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(watermarked);
}
```

### 1.6 Crear routes

**Archivo:** `backend/src/routes/photo-albums.routes.ts`

Copiar estructura de `events.routes.ts`. Rutas:

```typescript
// Público
router.get('/events/:slug/photos', getAlbumByEvent);
router.get('/photos/:photoId/download', downloadPhoto);

// Admin
router.post('/events/:slug/photos/album', authenticate, requireRole('ADMIN', 'ORGANIZER'), createAlbum);
router.patch('/events/:slug/photos/album', authenticate, requireRole('ADMIN', 'ORGANIZER'), updateAlbum);
router.delete('/events/:slug/photos/album', authenticate, requireRole('ADMIN'), deleteAlbum);
router.post('/events/:slug/photos/upload', authenticate, requireRole('ADMIN', 'ORGANIZER'), uploadPhotos_multer.array('photos', 50), uploadPhotos);
router.delete('/events/:slug/photos/:photoId', authenticate, requireRole('ADMIN', 'ORGANIZER'), deletePhoto);
router.patch('/events/:slug/photos/reorder', authenticate, requireRole('ADMIN', 'ORGANIZER'), reorderPhotos);
```

**Multer config para fotos** (agregar en `backend/src/lib/upload.ts`):
```typescript
export const uploadPhotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB por foto
  fileFilter: imageFilter, // reusar el filter existente
});
```

### 1.7 Registrar en el router principal

**Archivo:** `backend/src/routes/index.ts`

```typescript
import photoAlbumsRoutes from './photo-albums.routes.js';
// ...
router.use('/', photoAlbumsRoutes);
```

### Verificación Phase 1
```bash
# Migración aplicada
docker compose exec backend npx prisma migrate status

# Sharp instalado
docker compose exec backend node -e "import('sharp').then(s => console.log(s.default.versions))"

# Endpoints responden
curl http://localhost:4000/api/events/slug-del-evento/photos
curl -I http://localhost:4000/api/photos/PHOTO_ID/download
```

---

## Phase 2: Frontend Admin — PhotoAlbumManager

### 2.1 Crear API client

**Archivo:** `frontend/src/api/photos.api.ts`

```typescript
import { fetchWithAuth, uploadWithAuth } from './client';

export const photosApi = {
  getAlbum: (slug: string) =>
    fetchWithAuth<PhotoAlbumWithPhotos>(`/events/${slug}/photos`),

  createAlbum: (slug: string, data: { title: string; description?: string }) =>
    fetchWithAuth<PhotoAlbum>(`/events/${slug}/photos/album`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  updateAlbum: (slug: string, data: Partial<PhotoAlbumUpdate>) =>
    fetchWithAuth<PhotoAlbum>(`/events/${slug}/photos/album`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  uploadPhotos: (slug: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('photos', f));
    return uploadWithAuth<Photo[]>(`/events/${slug}/photos/upload`, fd);
  },

  deletePhoto: (slug: string, photoId: string) =>
    fetchWithAuth<void>(`/events/${slug}/photos/${photoId}`, { method: 'DELETE' }),

  reorderPhotos: (slug: string, order: { id: string; order: number }[]) =>
    fetchWithAuth<void>(`/events/${slug}/photos/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    }),
};
```

**Tipos a agregar** (`frontend/src/types.ts` o archivo propio):
```typescript
export interface Photo {
  id: string;
  albumId: string;
  fileUrl: string;  // "drive:ID"
  order: number;
  createdAt: string;
}

export interface PhotoAlbum {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  isPublished: boolean;
  coverUrl?: string;
  photos: Photo[];
}
```

### 2.2 Crear página admin

**Archivo:** `frontend/src/pages/admin/photos/PhotoAlbumManager.tsx`

UI requerida (copiar patrones visuales de `InscriptionManager.tsx` para la estructura de página):

1. **Header**: título "Galería de Fotos" + botón "Publicar Album" (toggle `isPublished`)
2. **Upload zone**: dropzone drag-and-drop + click para seleccionar múltiples archivos
   - Mostrar preview en miniatura mientras suben
   - Progress bar o spinner por archivo
   - Máximo 50 archivos
3. **Grid de fotos**: cuadrícula de thumbnails con:
   - Handle de drag para reordenar (usar `@dnd-kit/sortable` si ya está instalado, sino simple buttons ↑↓)
   - Botón de eliminar en hover
   - Primera foto = portada (indicador visual)
4. **Estado vacío**: cuando no hay fotos, mostrar zona de upload amplia con instrucciones

```bash
# Verificar si dnd-kit está instalado
grep "dnd-kit" /home/jal/edel-racing/frontend/package.json
```

### 2.3 Agregar ruta en router

**Archivo:** `frontend/src/router/index.tsx`

```typescript
import { PhotoAlbumManager } from '../pages/admin/photos/PhotoAlbumManager';

// Dentro del bloque /app children:
{ path: 'eventos/:slug/fotos', element: <PhotoAlbumManager /> },
```

### 2.4 Agregar acceso desde EventHub

**Archivo:** `frontend/src/pages/admin/events/EventHub.tsx`

Agregar botón/tab "📷 Fotos" al mismo nivel que los otros accesos del hub (Inscripciones, Caja, Check-in, etc.).

### Verificación Phase 2
- Admin puede entrar a `/app/eventos/:slug/fotos`
- Puede subir 1-50 fotos
- Fotos aparecen en cuadrícula con thumbnails
- Puede eliminar fotos individuales
- Puede publicar/despublicar el album
- Las fotos subidas aparecen en Drive carpeta `photos`

---

## Phase 3: Frontend Público — Galería y Lightbox

### 3.1 Crear componente Lightbox

**Archivo:** `frontend/src/components/shared/PhotoLightbox.tsx`

Comportamiento:
- Overlay full-screen oscuro (fondo `bg-black/90`)
- Foto centrada, `object-contain`, max height/width respetando aspect ratio
- Navegación: botones `←` `→` + teclado (ArrowLeft, ArrowRight, Escape)
- Swipe en móvil (touch events: `touchstart` + `touchend`, delta > 50px)
- Contador `3 / 24` en esquina
- Botones de acción en barra inferior:
  - **Descargar** — `<a href="/api/photos/{id}/download" download>` (browser maneja la descarga)
  - **Compartir** — `navigator.share({ title, url: window.location.href + '?photo=N' })` con fallback a copiar URL al clipboard
- Cerrar: click en overlay, botón X, tecla Escape

```typescript
// Patrón URL compartir
const shareUrl = `${window.location.origin}/eventos/${slug}/fotos?photo=${currentIndex}`;

// Web Share API con fallback
const handleShare = async () => {
  const shareData = { title: `Fotos - ${eventName}`, url: shareUrl };
  if (navigator.share && navigator.canShare(shareData)) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(shareUrl);
    // mostrar toast "Link copiado"
  }
};
```

### 3.2 Crear página pública

**Archivo:** `frontend/src/pages/public/EventGallery.tsx`

Estructura:
```
EventGallery
├── Header: nombre del evento + fecha + "N fotos"
├── Breadcrumb: Inicio > Eventos > [Evento] > Fotos
├── Grid: cuadrícula responsive de thumbnails (Tailwind: grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5)
│   └── Cada foto: img con src={resolveMediaUrl(photo.fileUrl)}, cursor-pointer, hover:opacity-80
├── PhotoLightbox (renderizado cuando selectedIndex !== null)
└── Estado vacío: "Próximamente — las fotos del evento estarán disponibles aquí"
```

**Leer parámetro `?photo=N`** al montar para abrir lightbox en foto específica (maneja links compartidos):
```typescript
const [searchParams] = useSearchParams();
const initialPhoto = parseInt(searchParams.get('photo') ?? '-1');
// Si initialPhoto >= 0 y < photos.length → abrir lightbox en esa posición
```

**Fetch data** (copiar patrón de `EventDetail.tsx:14-18`):
```typescript
const albumQuery = useQuery({
  queryKey: ['photos', slug],
  queryFn: () => photosApi.getAlbum(slug!),
  enabled: !!slug,
});
```

**Solo mostrar si `isPublished === true`** — si no, mostrar el estado vacío.

### 3.3 Agregar ruta pública

**Archivo:** `frontend/src/router/index.tsx`

```typescript
import { EventGallery } from '../pages/public/EventGallery';

// Dentro del bloque PublicLayout children:
{ path: 'eventos/:slug/fotos', element: <EventGallery /> },
```

### 3.4 Agregar acceso desde EventDetail

**Archivo:** `frontend/src/pages/public/EventDetail.tsx`

Agregar botón "Ver Fotos" junto a los demás links del evento (Parrilla, Pilotos, Resultados). Condicional: solo mostrar si el evento tiene album publicado.

```typescript
// Verificar si existe album publicado
const galleryQuery = useQuery({
  queryKey: ['photos', slug, 'exists'],
  queryFn: () => photosApi.getAlbum(slug!).then(a => a.isPublished ? a : null).catch(() => null),
  enabled: !!slug,
});

// Renderizar solo si hay fotos
{galleryQuery.data && (
  <Link to={`/eventos/${slug}/fotos`}>Ver Fotos ({galleryQuery.data.photos.length})</Link>
)}
```

### Verificación Phase 3
- `/eventos/:slug/fotos` carga y muestra cuadrícula de fotos
- Click en foto abre lightbox full-screen
- Navegación con flechas y teclado funciona
- Swipe en móvil funciona
- Botón descargar descarga la foto con watermark
- Botón compartir abre sheet nativo en móvil
- URL `?photo=5` abre el lightbox en la foto 5
- Link desde EventDetail solo aparece si el album está publicado

---

## Phase 4: Assets, Polish y SEO

### 4.1 Watermark PNG

Crear o exportar `backend/assets/watermark.png`:
- Logo de Karting Club México en PNG con fondo transparente
- Tamaño recomendado: ~400px de ancho (se redimensiona proporcionalmente)
- Opacidad: el PNG puede tener alpha ~80% para que no tape la foto

### 4.2 SEO — Open Graph para galería

**Archivo:** `frontend/src/pages/public/EventGallery.tsx`

Agregar `<SEO>` con:
```typescript
<SEO
  title={`Fotos — ${event.name}`}
  description={`Galería de fotos de ${event.name}. ${photos.length} fotos del evento.`}
  image={resolveMediaUrl(album.coverUrl ?? photos[0]?.fileUrl)}
  url={`https://tudominio.com/eventos/${slug}/fotos`}
/>
```

### 4.3 Rate limiting para /download

En el servidor, aplicar rate limit al endpoint de descarga para evitar abuso (alguien descargando todas las fotos en loop):

```typescript
// backend/src/routes/photo-albums.routes.ts
import rateLimit from 'express-rate-limit';

const downloadLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 descargas por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/photos/:photoId/download', downloadLimit, downloadPhoto);
```

### 4.4 Variable de entorno

Agregar al `.env.example`:
```env
GOOGLE_DRIVE_PHOTOS_FOLDER_ID=<ID_de_carpeta_Photos_en_Drive>
```

### Verificación Phase 4
- Watermark visible en descarga, posicionado bottom-right, no tapa la foto
- OG image de la página de galería muestra la portada del album
- Rate limit bloquea más de 30 descargas/min por IP
- README actualizado con nueva sección "Galería de fotos"

---

## Checklist de archivos nuevos/modificados

### Nuevos
- `backend/assets/watermark.png`
- `backend/src/lib/watermark.service.ts`
- `backend/src/controllers/photo-albums.controller.ts`
- `backend/src/routes/photo-albums.routes.ts`
- `frontend/src/api/photos.api.ts`
- `frontend/src/pages/admin/photos/PhotoAlbumManager.tsx`
- `frontend/src/pages/public/EventGallery.tsx`
- `frontend/src/components/shared/PhotoLightbox.tsx`

### Modificados
- `backend/prisma/schema.prisma` — nuevos modelos PhotoAlbum, Photo + relación en Event
- `backend/src/lib/drive.service.ts` — nuevo folder `photos` en FOLDER_IDS
- `backend/src/lib/upload.ts` — nuevo multer config `uploadPhotos`
- `backend/src/routes/index.ts` — registrar photo-albums routes
- `backend/package.json` — agregar `sharp`
- `frontend/src/router/index.tsx` — nuevas rutas admin y pública
- `frontend/src/pages/admin/events/EventHub.tsx` — botón "Fotos"
- `frontend/src/pages/public/EventDetail.tsx` — link condicional "Ver Fotos"
- `.env` / `.env.example` — `GOOGLE_DRIVE_PHOTOS_FOLDER_ID`

---

## Flujo completo de uso

### Admin (después del evento)
1. Fotógrafa entrega fotos → admin las sube en `/app/eventos/:slug/fotos`
2. Sube hasta 50 fotos a la vez (drag & drop o selector)
3. Reordena si quiere (las primeras fotos aparecen primero en la galería)
4. Pulsa "Publicar Album" → fotos visibles para todos

### Visitante
1. Entra a la página del evento → ve botón "Ver Fotos (47)"
2. Abre la galería → cuadrícula de thumbnails
3. Click en foto → lightbox full-screen
4. Navega con flechas (o swipe en móvil)
5. Descarga con watermark del logo → foto guardada con branding
6. Compartir → en móvil abre sheet nativo con link al sitio; en desktop copia el link
7. Amigos y familiares reciben el link → entran al sitio → más tráfico
