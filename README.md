# Edel Racing — Karting Club México

Sistema completo de gestión de carreras de karting con resultados en tiempo real, parrilla de salida, control de pagos, check-in y campeonato acumulado.

## Stack

- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Auth**: JWT con roles ADMIN / ORGANIZER
- **Realtime**: Server-Sent Events (SSE)
- **PWA**: vite-plugin-pwa con service worker y soporte offline
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

Edita al menos:
- `JWT_SECRET` — genera uno seguro: `openssl rand -base64 32`
- `CORS_ORIGIN` — tu dominio: `https://tudominio.com`
- `DATABASE_URL` — si usas PostgreSQL externo, cambia la URL

### 3. Construir y levantar servicios

```bash
docker compose up -d --build
```

### 4. Ejecutar migraciones de base de datos

```bash
docker compose exec backend npx prisma migrate deploy
```

### 5. Cargar datos de prueba (seed)

```bash
cd seed
npm install
DATABASE_URL=postgresql://postgres:password@localhost:5432/edel_racing tsx seed.ts
```

O desde Docker:

```bash
docker compose run --rm -e DATABASE_URL=postgresql://postgres:password@postgres:5432/edel_racing \
  -v $(pwd)/seed:/seed node:20-alpine sh -c "cd /seed && npm ci && tsx seed.ts"
```

---

## HTTPS con Certbot

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado (el servidor nginx debe estar corriendo en puerto 80)
certbot --nginx -d tudominio.com -d www.tudominio.com

# Descomentar el bloque HTTPS en nginx.conf y reemplazar tudominio.com
# Recargar nginx
docker compose exec nginx nginx -s reload
```

---

## URLs

| URL | Descripción |
|-----|-------------|
| `https://tudominio.com/` | Sitio público |
| `https://tudominio.com/eventos` | Lista de eventos públicos |
| `https://tudominio.com/campeonato` | Tabla de campeonato |
| `https://tudominio.com/login` | Login admin |
| `https://tudominio.com/app/dashboard` | Panel de administración |
| `https://tudominio.com/api/` | API REST |

---

## Credenciales de prueba (seed)

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin@edelracing.mx | password123 | ADMIN |
| organizador@edelracing.mx | password123 | ORGANIZER |

**Importante**: Cambia estas contraseñas en producción desde el panel de usuarios.

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

## Flujo de operación de un evento

1. **Crear evento** (Admin) — nombre, fecha, categorías, cuotas
2. **Abrir inscripciones** — cambiar status a `OPEN`
3. **Inscribir pilotos** — por categoría
4. **Caja** — registrar pagos de inscripción
5. **Check-in** — confirmar llegada y asignar kart
6. **Sorteo de parrilla** — aleatorio entre pilotos con check-in
7. **Carreras** — crear 3 carreras por categoría, capturar resultados con drag-and-drop
8. **Clasificación** — ver y exportar resultados (PDF/CSV)
9. **Finalizar** — cambiar status a `FINISHED`

---

## Comandos útiles

```bash
# Ver logs
docker compose logs -f backend

# Conectar a Prisma Studio
docker compose exec backend npx prisma studio

# Reiniciar sólo backend
docker compose restart backend

# Backup de base de datos
docker compose exec postgres pg_dump -U postgres edel_racing > backup.sql
```

---

## Estructura del proyecto

```
edel-racing/
├── backend/         Node.js + Express + Prisma
├── frontend/        React + Vite + Tailwind
├── seed/            Script de datos de prueba
├── nginx.conf       Configuración Nginx
├── docker-compose.yml
└── .env.example
```
