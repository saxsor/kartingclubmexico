import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use('/api', apiRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

export default app;
