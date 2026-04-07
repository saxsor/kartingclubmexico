import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

// Serve uploaded receipts as static files
app.use('/uploads', express.static('/app/uploads'));

app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Strict rate limit for auth endpoints (brute force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera un momento' },
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// CSRF validation for mutating requests (POST/PUT/PATCH/DELETE)
// Allows requests that include a matching X-CSRF-Token header (custom headers can't be set cross-site)
app.use('/api', (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  // Skip CSRF check for auth login/refresh/reset (not yet authenticated)
  const skipPaths = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];
  if (skipPaths.some((p) => req.path.startsWith(p))) return next();

  // Public self-register and receipt upload paths (no auth required by design)
  const publicPaths = ['/self-register'];
  if (publicPaths.some((p) => req.path.includes(p))) return next();

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ error: 'CSRF token inválido' });
    return;
  }

  next();
});

app.use('/api', apiRoutes);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable', timestamp: new Date().toISOString() });
  }
});

app.use(errorHandler);

export default app;
