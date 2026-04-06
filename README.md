# Edel Racing — Karting Club México

Sistema completo de gestión de carreras de karting con resultados en tiempo real, parrilla de salida, auto-inscripción de pilotos, control de pagos con comprobantes, check-in y campeonato acumulado.

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Auth**: JWT con roles ADMIN / ORGANIZER
- **Realtime**: Server-Sent Events (SSE)
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
git clone https://github.com/tu-usuario/edel-racing.git
cd edel-racing
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Variables obligatorias:
- `JWT_SECRET` — genera uno seguro: `openssl rand -base64 32`
- `CORS_ORIGIN` — tu dominio: `https://tudominio.com`
- `DATABASE_URL` — se configura automáticamente con Docker Compose

### 3. Construir y levantar servicios

```bash
docker compose up -d --build
```

### 4. Inicializar la base de datos

```bash
docker compose exec backend npx prisma db push
```

### 5. Cargar datos de prueba (seed)

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
| `/eventos/:slug/inscribirse` | Formulario de auto-inscripción para pilotos |
| `/campeonato` | Tabla de campeonato acumulado |
| `/login` | Login administradores |
| `/app/dashboard` | Panel de administración |
| `/api/` | API REST |
| `/uploads/receipts/` | Comprobantes de pago subidos |

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

1. **Crear evento** — nombre, fecha, categorías activas, cuota de servicio, cuota de alimentos y datos de transferencia bancaria para pagos
2. **Abrir inscripciones** — cambiar status a `OPEN` para activar el formulario público
3. **Inscribir pilotos** — manualmente desde *Gestionar → Inscripciones*, o esperar auto-inscripciones del público
4. **Caja** — revisar y aprobar comprobantes de pago enviados por los pilotos; también registrar pagos manuales
5. **Check-in** — confirmar llegada y asignar número de kart
6. **Sorteo de parrilla** — aleatorio entre pilotos con check-in completado
7. **Carreras** — crear 3 carreras por categoría, capturar posiciones con drag-and-drop
8. **Clasificación** — ver tabla de puntos y exportar resultados (PDF/CSV)
9. **Finalizar** — cambiar status a `FINISHED`

### Flujo de auto-inscripción (pilotos sin login)

1. El piloto entra al evento público → botón **"Inscribirme"** (visible solo si el evento está `OPEN`)
2. Llena el formulario: nombre, alias, email, teléfono, número de kart preferido, categoría
3. El sistema crea o actualiza su perfil de piloto (identificado por email) y genera la inscripción
4. Se muestran los **datos bancarios** para hacer la transferencia y el monto a pagar
5. El piloto **sube su comprobante** de pago (JPG, PNG o PDF, máx. 10 MB) → inscripción queda en estado *Recibo enviado*
6. El admin/organizador ve los comprobantes pendientes en **Caja** y los **Aprueba** o **Rechaza**
7. Al aprobar, la inscripción pasa a *Pagada* y se registra el pago automáticamente

---

## Roles y permisos

| Acción | ADMIN | ORGANIZER |
|--------|-------|-----------|
| Crear / editar / eliminar eventos | ✓ | — |
| Crear / editar / eliminar pilotos | ✓ | — |
| Gestionar usuarios | ✓ | — |
| Inscribir pilotos | ✓ | ✓ |
| Aprobar / rechazar comprobantes | ✓ | ✓ |
| Registrar pagos manuales | ✓ | ✓ |
| Check-in | ✓ | ✓ |
| Sorteo de parrilla | ✓ | ✓ |
| Capturar resultados de carreras | ✓ | ✓ |
| Ver panel público | todos | todos |

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

## Estructura del proyecto

```
edel-racing/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          Modelos de base de datos
│   └── src/
│       ├── controllers/
│       │   ├── events.controller.ts
│       │   ├── inscriptions.controller.ts
│       │   ├── pilots.controller.ts
│       │   ├── self-register.controller.ts   ← Auto-inscripción pública
│       │   └── ...
│       ├── lib/
│       │   ├── upload.ts                     ← Multer para comprobantes
│       │   └── ...
│       └── routes/
│           ├── self-register.routes.ts       ← Rutas públicas de inscripción
│           └── ...
├── frontend/
│   └── src/
│       ├── api/
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── events/        Gestión de eventos (crear, editar, eliminar)
│       │   │   ├── pilots/        Gestión de pilotos (crear, editar, eliminar)
│       │   │   ├── payments/      Caja + aprobación de comprobantes
│       │   │   ├── checkin/
│       │   │   ├── grid/
│       │   │   ├── races/
│       │   │   └── classification/
│       │   └── public/
│       │       ├── EventRegister.tsx         ← Formulario auto-inscripción
│       │       └── ...
│       └── router/
├── seed/                          Datos de prueba
├── nginx.conf                     Proxy para /api/ y /uploads/
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

# Backup de base de datos
docker compose exec postgres pg_dump -U postgres edel_racing > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup.sql | docker compose exec -T postgres psql -U postgres edel_racing

# Acceder a Prisma Studio (explorador visual de BD)
docker compose exec backend npx prisma studio --port 5555
# Exponer el puerto: docker compose exec -p 5555:5555 backend npx prisma studio

# Aplicar cambios de schema sin migraciones
docker compose exec backend npx prisma db push
```

---

## Variables de entorno (`.env`)

```env
# Base de datos (se configura automáticamente con Docker Compose)
DATABASE_URL=postgresql://postgres:password@postgres:5432/edel_racing

# JWT — genera con: openssl rand -base64 32
JWT_SECRET=cambia_esto_en_produccion
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Servidor
PORT=4000
NODE_ENV=production

# CORS — tu dominio en producción
CORS_ORIGIN=https://tudominio.com
```
