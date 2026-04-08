# Edel Racing — Karting Club México

Sistema completo de gestión de carreras de karting con resultados en tiempo real, parrilla de salida, auto-inscripción de pilotos, control de pagos con comprobantes, check-in, campeonato acumulado y SEO optimizado.

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + PWA
- **Auth**: JWT con roles ADMIN / ORGANIZER / VALIDATOR, doble cookie (access + refresh)
- **Realtime**: Server-Sent Events (SSE)
- **SEO**: react-helmet-async, sitemap dinámico, JSON-LD (SportsEvent), robots.txt
- **Deploy**: Docker + docker-compose + Nginx

---

## Requisitos del VPS

| Recurso | Mínimo |
|---------|--------|
| OS | Ubuntu 22.04+ |
| RAM | 2 GB |
| Disco | 20 GB |
| Software | Docker 24+, Docker Compose v2+ |

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

Variables obligatorias:
- `JWT_SECRET` — genera uno seguro: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` — genera uno distinto: `openssl rand -base64 32`
- `CORS_ORIGIN` — tu dominio: `https://tudominio.com`
- `APP_URL` — URL base del sitio (para sitemap y SEO): `https://tudominio.com`
- `DATABASE_URL` — se configura automáticamente con Docker Compose

### 3. Construir y levantar servicios

```bash
docker compose up -d --build
```

Las migraciones de base de datos se aplican automáticamente al arrancar el backend.

### 4. Cargar datos de prueba (seed)

```bash
docker compose run --rm \
  -e DATABASE_URL=postgresql://postgres:password@postgres:5432/edel_racing \
  -v $(pwd)/seed:/seed \
  node:20-alpine sh -c "cd /seed && npm ci && npx tsx seed.ts"
```

---

## HTTPS con Certbot

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado (nginx debe estar corriendo en puerto 80)
certbot --nginx -d tudominio.com -d www.tudominio.com

# Descomentar el bloque HTTPS en nginx.conf y reemplazar tudominio.com
docker compose exec nginx nginx -s reload
```

---

## URLs

| URL | Descripción |
|-----|-------------|
| `/` | Sitio público — eventos, parrillas, resultados |
| `/eventos` | Listado de eventos públicos |
| `/eventos/:slug` | Detalle del evento (parrilla, resultados, pilotos inscritos) |
| `/eventos/:slug/pilotos` | Pilotos inscritos por categoría (público) |
| `/eventos/:slug/resultados` | Resultados y puntos por categoría (público) |
| `/eventos/:slug/inscribirse` | Formulario de auto-inscripción para pilotos |
| `/campeonato` | Tabla de campeonato acumulado |
| `/pilotos/:id` | Perfil público de piloto |
| `/sitemap.xml` | Sitemap XML (generado dinámicamente) |
| `/robots.txt` | Reglas para crawlers |
| `/login` | Login administradores |
| `/app/dashboard` | Panel de administración (ADMIN / ORGANIZER) |
| `/app/eventos` | Listado de eventos (todos los roles) |
| `/api/` | API REST |
| `/uploads/` | Archivos subidos (comprobantes, fotos, posters) |

---

## Credenciales de prueba (seed)

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin@edelracing.mx | password123 | ADMIN |
| organizador@edelracing.mx | password123 | ORGANIZER |

> **Importante**: Cambia estas contraseñas en producción desde el panel de usuarios (`/app/usuarios`).

---

## Flujo de operación de un evento

### Desde el panel de administración

1. **Crear evento** — nombre, fecha, pista/circuito, categorías activas, cuota de servicio, cuota de alimentos y datos de transferencia bancaria
2. **Abrir inscripciones** — cambiar status a `OPEN` para activar el formulario público
3. **Inscribir pilotos** — manualmente desde *Gestionar → Inscripciones* (con número de acompañantes para comida), o esperar auto-inscripciones del público
4. **Caja** — revisar y aprobar comprobantes de pago enviados por pilotos; registrar pagos manuales; eliminar pagos incorrectos (revierte el estado a pendiente automáticamente)
5. **Check-in** — confirmar llegada y asignar número de kart
6. **Sorteo de parrilla** — aleatorio entre pilotos con check-in completado
7. **Carreras** — generar 3 carreras por categoría con un clic (se pueden agregar más o eliminar carreras pendientes); capturar posiciones con drag-and-drop
8. **Clasificación** — ver tabla de puntos y exportar resultados (PDF/CSV)
9. **Finalizar** — cambiar status a `FINISHED`

### Flujo de auto-inscripción (pilotos sin login)

1. El piloto entra al evento público → botón **"Inscribirme"** (visible solo si el evento está `OPEN`)
2. **Búsqueda**: el piloto busca su nombre en la base de pilotos registrados
   - **Piloto existente**: selecciona su nombre → solo llena datos de carrera (categoría, kart, acompañantes)
   - **Piloto nuevo**: llena el formulario completo (nombre, alias, email, teléfono, etc.)
3. El sistema crea o asocia su perfil de piloto y genera la inscripción
4. Se muestran los **datos bancarios** para hacer la transferencia y el monto a pagar
5. El piloto **sube su comprobante** de pago (JPG, PNG o PDF, máx. 10 MB) → inscripción queda en estado *Recibo enviado*
6. El admin/organizador ve los comprobantes pendientes en **Caja** y los **Aprueba** o **Rechaza**
7. Al aprobar, la inscripción pasa a *Pagada* y se registran los pagos automáticamente

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
| Ver listado de inscripciones | ✓ | ✓ | ✓ |
| Aprobar / rechazar comprobantes | ✓ | ✓ | — |
| Registrar pagos manuales | ✓ | ✓ | ✓ |
| Ver caja | ✓ | ✓ | ✓ |
| Eliminar pagos | ✓ | — | — |
| Check-in | ✓ | ✓ | ✓ |
| Sorteo de parrilla | ✓ | ✓ | — |
| Capturar resultados de carreras | ✓ | ✓ | — |
| Ver clasificación | ✓ | ✓ | — |
| Ver panel público | todos | todos | todos |

> El rol **VALIDATOR** está pensado para organizadores en pit lane durante el evento: pueden hacer check-in, inscribir pilotos de último momento y registrar pagos en efectivo, pero no tienen acceso a configuración, finanzas ni resultados.

---

## Cuota de alimentos con acompañantes

La cuota de alimentos se calcula por persona: `foodFee × (1 piloto + N acompañantes)`.

- En la auto-inscripción pública, el piloto elige cuántos acompañantes lleva
- En inscripción manual desde el panel, el campo "Acompañantes" está en el formulario
- La caja muestra el desglose y el saldo correcto por piloto

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
| `RECEIPT_SUBMITTED` | Piloto subió comprobante, pendiente de aprobación |
| `PAID` | Pago confirmado |

---

## SEO

El sitio está optimizado para motores de búsqueda:

- **Títulos y meta tags dinámicos** por página usando `react-helmet-async`
- **Open Graph y Twitter Card** para previews en redes sociales
- **JSON-LD** (schema.org `SportsEvent`) en páginas de eventos
- **Sitemap XML dinámico** en `/sitemap.xml` — generado desde la BD con todos los eventos, pilotos y campeonatos
- **robots.txt** — permite crawling público, bloquea rutas de administración

---

## Estructura del proyecto

```
edel-racing/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              Modelos de base de datos
│   │   └── migrations/                Migraciones SQL (automáticas al arrancar)
│   └── src/
│       ├── controllers/
│       │   ├── events.controller.ts         Eventos + pilotos públicos por categoría
│       │   ├── inscriptions.controller.ts   Inscripciones con cascade delete
│       │   ├── payments.controller.ts
│       │   ├── pilots.controller.ts
│       │   ├── races.controller.ts          Resultados con pilotos de última hora
│       │   ├── self-register.controller.ts  Auto-inscripción (piloto nuevo o existente)
│       │   └── ...
│       ├── lib/
│       │   ├── upload.ts              Multer para comprobantes y fotos
│       │   ├── sse.ts                 Server-Sent Events manager
│       │   └── ...
│       └── routes/
│           ├── index.ts               Sitemap XML dinámico
│           ├── self-register.routes.ts
│           └── ...
├── frontend/
│   ├── public/
│   │   └── robots.txt
│   └── src/
│       ├── api/
│       │   └── client.ts              uploadWithAuth (token refresh en multipart)
│       ├── components/
│       │   └── shared/
│       │       └── SEO.tsx            Componente reutilizable de SEO
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── events/            Gestión de eventos
│       │   │   ├── pilots/            Gestión de pilotos
│       │   │   ├── payments/          Caja + comprobantes
│       │   │   ├── checkin/           Check-in
│       │   │   ├── grid/              Sorteo de parrilla
│       │   │   ├── races/             Carreras y captura de resultados
│       │   │   ├── classification/    Clasificación y exportación
│       │   │   └── users/             Usuarios (ADMIN only)
│       │   └── public/
│       │       ├── EventRegister.tsx  Auto-inscripción con búsqueda de piloto
│       │       ├── EventPilots.tsx    Lista pública de pilotos por categoría
│       │       ├── EventResults.tsx   Resultados públicos con SSE
│       │       ├── Championship.tsx   Campeonato acumulado
│       │       └── ...
│       └── router/
├── nginx.conf                         Proxy /api/, /uploads/, /sitemap.xml; CSP headers
├── docker-compose.yml
└── .env.example
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

# Rebuild y redeploy
docker compose build backend frontend && docker compose up -d

# Backup de base de datos
docker compose exec postgres pg_dump -U postgres edel_racing > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup.sql | docker compose exec -T postgres psql -U postgres edel_racing

# Aplicar migraciones manualmente (normalmente automático al arrancar)
docker compose exec backend npx prisma migrate deploy
```

---

## Variables de entorno (`.env`)

```env
# Base de datos (se configura automáticamente con Docker Compose)
DATABASE_URL=postgresql://postgres:password@postgres:5432/edel_racing

# JWT — genera con: openssl rand -base64 32
JWT_SECRET=cambia_esto_en_produccion
JWT_REFRESH_SECRET=cambia_esto_tambien_en_produccion
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Servidor
PORT=4000
NODE_ENV=production

# CORS — tu dominio en producción
CORS_ORIGIN=https://tudominio.com

# URL base del sitio (para sitemap y links en emails)
APP_URL=https://tudominio.com
```
