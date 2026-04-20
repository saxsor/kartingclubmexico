# Edel Racing — Karting Club México

Sistema completo de gestión de carreras de karting con resultados en tiempo real, parrilla de salida, auto-inscripción de pilotos, control de pagos con comprobantes, check-in, campeonato acumulado por pilotos y constructores, portal de piloto con magic link, gestión de comensales y notas de kart, generación de diplomas de participación con editor visual y SEO optimizado.

## Stack

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express + express-async-errors
- **ORM**: Prisma
- **Base de datos**: [Neon](https://neon.tech) — PostgreSQL serverless
- **Almacenamiento de archivos**: [Google Drive API v3](https://developers.google.com/drive) — fotos de pilotos, posters de eventos y comprobantes de pago
- **Auth Google**: OAuth2 con refresh token (`googleapis` + `google-auth-library`)
- **Email**: SMTP via [Resend](https://resend.com) (`nodemailer`) — magic links para portal de piloto
- **Auth usuarios admin**: JWT doble cookie (access 7d + refresh 30d), roles ADMIN / ORGANIZER / VALIDATOR
- **Realtime**: Server-Sent Events (SSE)
- **Rate limiting**: express-rate-limit
- **Seguridad**: helmet, bcryptjs

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Estilos**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v6
- **State / Fetching**: TanStack Query (React Query)
- **Gráficas**: Recharts
- **PWA**: vite-plugin-pwa
- **SEO**: react-helmet-async, sitemap dinámico, JSON-LD (SportsEvent), robots.txt

### Infraestructura
- **Deploy**: Docker + Docker Compose + Nginx (proxy reverso)
- **HTTPS**: Certbot / Let's Encrypt
- **DB hosting**: Neon (serverless PostgreSQL, sin contenedor local)
- **Blob storage**: Google Drive personal (5 TB, sin costo adicional)
- **Email relay**: Resend (SMTP)

---

## Requisitos del VPS

| Recurso | Mínimo |
|---------|--------|
| OS | Ubuntu 22.04+ |
| RAM | 1 GB (sin PostgreSQL local) |
| Disco | 10 GB |
| Software | Docker 24+, Docker Compose v2+ |

> La base de datos corre en Neon y los archivos en Google Drive, por lo que el servidor solo necesita correr los contenedores de backend, frontend y nginx.

---

## Servicios externos requeridos

| Servicio | Uso | Dónde obtener |
|----------|-----|---------------|
| [Neon](https://neon.tech) | PostgreSQL serverless | neon.tech → crear proyecto → copiar connection string |
| [Google Drive API](https://console.cloud.google.com) | Almacenamiento de archivos | Google Cloud Console → OAuth2 credentials + refresh token |
| [Resend](https://resend.com) | Envío de emails (magic link) | resend.com → API Keys → SMTP credentials |

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/saxsor/kartingclubmexico.git
cd edel-racing
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

### 3. Construir y levantar servicios

```bash
docker compose up -d --build
```

Las migraciones de base de datos se aplican automáticamente al arrancar el backend.

### 4. Cargar datos de prueba (seed)

```bash
docker compose exec backend npx prisma db seed
```

---

## Variables de entorno (`.env`)

```env
# ── Base de datos ─────────────────────────────────────────────────────────────
# Neon connection string (o cualquier PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET=genera_con_openssl_rand_base64_32
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ── Servidor ──────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://tudominio.com
APP_URL=https://tudominio.com

# ── Email (Resend SMTP) ───────────────────────────────────────────────────────
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxxxxxxxxx
SMTP_FROM=Edel Racing <onboarding@resend.dev>

# ── Google Drive (OAuth2) ─────────────────────────────────────────────────────
# Google Cloud Console → OAuth2 credentials (tipo "Desktop" o "Web")
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
# Refresh token obtenido con el flujo OAuth2 offline
GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cómo obtener el refresh token de Google Drive

1. Ve a [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Crea o usa un OAuth2 Client ID (tipo Web, agrega `http://localhost` como redirect URI)
3. Genera la URL de autorización y completa el flujo de consentimiento con la cuenta que tiene el Drive de destino
4. Intercambia el `code` por tokens usando el endpoint `https://oauth2.googleapis.com/token`
5. Copia el `refresh_token` al `.env`

Las carpetas de Drive donde se suben los archivos se configuran en `backend/src/lib/drive.service.ts` (`FOLDER_IDS`).

---

## HTTPS con Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tudominio.com -d www.tudominio.com
docker compose exec nginx nginx -s reload
```

---

## URLs

| URL | Descripción |
|-----|-------------|
| `/` | Sitio público — eventos, parrillas, resultados |
| `/eventos` | Listado de eventos públicos |
| `/eventos/:slug` | Detalle del evento |
| `/eventos/:slug/inscribirse` | Auto-inscripción para pilotos |
| `/campeonato` | Tabla de campeonato (pilotos y constructores) |
| `/pilotos/:id` | Perfil público de piloto |
| `/piloto` | Portal del piloto (acceso por magic link) |
| `/sitemap.xml` | Sitemap XML dinámico |
| `/login` | Login administradores |
| `/app/dashboard` | Panel de administración |
| `/api/` | API REST |

---

## Portal de piloto (magic link)

Los pilotos acceden sin contraseña a través de un magic link enviado a su email:

1. El piloto busca su nombre en `/piloto`
2. Si ya existe: selecciona "Soy yo" e ingresa su correo → recibe un magic link (expira en 24h)
3. Si es nuevo: completa el formulario de registro (nombre, alias, correo, teléfono) → se crea su perfil y recibe el magic link automáticamente
4. Al hacer clic en el enlace, el piloto queda autenticado y puede:
   - Ver sus inscripciones activas y el estado de pago
   - Editar su perfil: foto, número de kart, equipo/constructor
   - Subir/reemplazar comprobantes de pago

> El flujo obliga a buscar por nombre antes de permitir el registro, evitando perfiles duplicados.

---

## Comensales y logística de comida

El sistema gestiona la logística de comida por evento de forma independiente del número de pilotos inscritos:

- **Comensales por piloto**: cada piloto puede registrar cuántas personas van a comer (incluyéndose a sí mismo si lo desea). El valor por defecto es 0 — los pilotos no se cuentan automáticamente.
- **Staff en pista**: el admin puede registrar en la Caja cuántas personas de staff van a comer, editable directamente en la pantalla de Caja.
- **Total visible**: en la Caja se muestra `Pilotos + Staff = Total comidas`. En el Dashboard, los eventos abiertos o en curso muestran un resumen de comensales con link directo a la Caja.

---

## Notas de kart (`kartNotes`)

Durante el check-in, los administradores pueden agregar una nota descriptiva al kart de cada piloto (ej: "kart azul, pontones blancos"). Esta nota:
- Se guarda independientemente del check-in (botón de guardar inline, o se envía junto al check-in)
- Se muestra debajo del nombre del piloto en la **parrilla de salida**
- Se muestra debajo del nombre del piloto en la **captura de resultados** de carrera

Permite identificar a los pilotos cuando no tienen número visible en el kart.

---

## Diplomas de participación

Al cerrar un evento, el admin puede generar y descargar diplomas en PDF personalizados para cada piloto.

### Configuración del template

- Se sube una imagen de fondo (JPG o PNG) desde el formulario del evento — soporta orientación horizontal y vertical
- El admin posiciona el nombre del piloto arrastrando y redimensionando un recuadro directamente sobre la preview del template
- Los parámetros se guardan por evento en la base de datos

### Campos configurables

| Campo | Descripción | Default |
|-------|-------------|---------|
| `diplomaNameX` | Posición X del recuadro (ratio 0–1) | 0.15 |
| `diplomaNameY` | Posición Y del recuadro (ratio 0–1) | 0.58 |
| `diplomaNameWidth` | Ancho del recuadro (ratio 0–1) | 0.70 |
| `diplomaNameHeight` | Alto del recuadro (ratio 0–1) | 0.10 |
| `diplomaFontSize` | Tamaño base de fuente (8–128) | 28 |
| `diplomaTextColor` | Color hex del texto | `#111111` |
| `diplomaTextAlign` | Alineación: `left`, `center`, `right` | `center` |

### Generación del PDF

- Se usa [PDFKit](https://pdfkit.org/) en el backend — el tamaño de página se adapta al aspect ratio del template
- El texto se auto-ajusta al recuadro: si el nombre es largo, el font size se reduce proporcionalmente hasta el mínimo de 14pt
- Los diplomas se descargan directamente desde la pantalla de resultados del evento, sin salir de la página

---

## Campeonato de constructores

Además del campeonato individual, el sistema calcula standings por equipo/constructor:

- Los resultados de cada piloto suman puntos al equipo con el que corrió en esa carrera
- Se captura un snapshot `raceResultTeamSnapshot` al guardar resultados para preservar el equipo histórico aunque el piloto cambie
- Visible en `/campeonato` (toggle pilotos / constructores) y en el panel admin de campeonatos

---

## Almacenamiento de archivos (Google Drive)

Todos los archivos se almacenan en Google Drive usando la API v3 con OAuth2:

| Tipo | Carpeta Drive | Visibilidad |
|------|---------------|-------------|
| Fotos de pilotos | `pilots/` | Pública (anyone reader) |
| Posters de eventos | `posters/` | Pública (anyone reader) |
| Comprobantes de pago | `receipts/` | Privada (solo admin via proxy) |

- Los campos en BD almacenan `drive:FILE_ID`
- El frontend resuelve a `https://lh3.googleusercontent.com/d/FILE_ID` para imágenes públicas
- Los comprobantes se sirven via proxy en el backend (`GET /api/events/:slug/inscriptions/:id/receipt`)
- Script de migración one-time: `backend/scripts/migrate-uploads-to-drive.mjs`

---

## Roles y permisos

| Acción | ADMIN | ORGANIZER | VALIDATOR |
|--------|:-----:|:---------:|:---------:|
| Crear / editar / eliminar eventos | ✓ | — | — |
| Subir / eliminar poster de evento | ✓ | ✓ | — |
| Crear / editar / eliminar pilotos | ✓ | — | — |
| Gestionar usuarios | ✓ | — | — |
| Ver dashboard de recaudación | ✓ | ✓ | — |
| Inscribir pilotos | ✓ | ✓ | ✓ |
| Eliminar inscripciones | ✓ | ✓ | — |
| Aprobar / rechazar comprobantes | ✓ | ✓ | — |
| Registrar pagos manuales | ✓ | ✓ | ✓ |
| Eliminar pagos | ✓ | — | — |
| Check-in | ✓ | ✓ | ✓ |
| Sorteo de parrilla | ✓ | ✓ | — |
| Capturar resultados de carreras | ✓ | ✓ | — |
| Ver clasificación | ✓ | ✓ | — |

> El rol **VALIDATOR** está pensado para pit lane: check-in, inscripciones de último momento y pagos en efectivo, sin acceso a configuración ni finanzas.

---

## Sistema de puntos (F1)

| Posición | Puntos |
|----------|--------|
| 1° | 25 |
| 2° | 18 |
| 3° | 15 |
| 4° | 12 |
| 5° | 10 |
| 6° | 8 |
| 7° | 6 |
| 8° | 4 |
| 9° | 2 |
| 10°+ | 1 |
| DNS/DNF/DSQ | 0 |

La clasificación del evento suma las 3 carreras por piloto por categoría. Desempate: mejor resultado en C3 → C2 → C1.

---

## Estados de una inscripción

| Estado | Descripción |
|--------|-------------|
| `PENDING_PAYMENT` | Inscrita, pendiente de pago |
| `RECEIPT_SUBMITTED` | Comprobante subido, pendiente de aprobación |
| `PAID` | Pago confirmado |

---

## Estructura del proyecto

```
edel-racing/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              Modelos de base de datos
│   │   └── migrations/                Migraciones SQL
│   ├── scripts/
│   │   └── migrate-uploads-to-drive.mjs  Migración one-time a Google Drive
│   └── src/
│       ├── controllers/
│       │   ├── events.controller.ts
│       │   ├── inscriptions.controller.ts
│       │   ├── payments.controller.ts
│       │   ├── pilots.controller.ts
│       │   ├── pilot-portal.controller.ts   Portal de piloto (magic link)
│       │   ├── races.controller.ts
│       │   ├── self-register.controller.ts  Auto-inscripción + proxy de recibos
│       │   ├── analytics.controller.ts      Dashboard stats + gráficas
│       │   └── championships.controller.ts  Standings pilotos y constructores
│       ├── lib/
│       │   ├── drive.service.ts       Google Drive API (upload/delete/stream)
│       │   ├── upload.ts              Multer memory storage
│       │   ├── mailer.ts              Nodemailer + Resend SMTP
│       │   └── sse.ts                 Server-Sent Events manager
│       └── routes/
│           ├── index.ts               Sitemap XML dinámico
│           ├── pilot-portal.routes.ts
│           ├── self-register.routes.ts
│           └── ...
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── lib/
│       │   └── utils.ts               resolveMediaUrl (drive: → lh3.googleusercontent.com)
│       └── pages/
│           ├── admin/
│           │   ├── Dashboard.tsx      Stats + gráficas (Recharts)
│           │   ├── championships/     Standings pilotos + constructores
│           │   └── ...
│           ├── pilot/
│           │   └── PilotPortal.tsx    Portal piloto (editar perfil, kart, equipo)
│           └── public/
├── nginx.conf
├── docker-compose.yml
└── .env
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar un servicio
docker compose restart backend

# Recargar nginx (sin downtime)
docker compose exec nginx nginx -s reload

# Rebuild y redeploy completo
docker compose build && docker compose up -d

# Solo rebuild frontend y redeploy
docker compose build frontend && docker compose up -d frontend

# Aplicar migraciones manualmente
docker compose exec backend npx prisma migrate deploy

# Backup de base de datos (Neon)
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql

# Migrar uploads existentes a Google Drive (one-time)
docker compose exec backend node scripts/migrate-uploads-to-drive.mjs
```

---

## Credenciales de prueba (seed)

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin@edelracing.mx | password123 | ADMIN |
| organizador@edelracing.mx | password123 | ORGANIZER |

> **Importante**: Cambia estas contraseñas en producción desde el panel de usuarios (`/app/usuarios`).
