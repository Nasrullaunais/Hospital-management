import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import router from './routes/index.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { logger } from './shared/utils/logger.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin:
      env.NODE_ENV === 'production'
        ? (process.env['CORS_ORIGINS'] ?? '').split(',').filter(Boolean)
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Structured, low-volume request logging.
// Logs only: 4xx/5xx responses and slow requests (>= 1s), skipping health checks.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  req.requestId = randomUUID();
  res.setHeader('x-request-id', req.requestId);

  res.on('finish', () => {
    if (req.path === '/health' || req.path === '/api/health') return;

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload = {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: req.user?.id,
      role: req.user?.role,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error(payload, 'HTTP request failed');
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(payload, 'HTTP client error');
      return;
    }

    if (durationMs >= 1000) {
      logger.info(payload, 'Slow HTTP request');
    }
  });

  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes + error handler
app.use(router);
app.use(errorHandler);

// createServer wrapper for testing with inject() interface
import request from 'supertest';
export function createServer() {
  const agent = request.agent(app);

  return {
    inject: async (options: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      payload?: unknown;
    }) => {
      const { method, url, headers, payload } = options;
      let req = agent[method.toLowerCase() as keyof typeof agent](url);

      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          req = req.set(key, value);
        }
      }

      if (payload !== undefined) {
        req = req.send(payload);
      }

      const res = await req;
      return {
        statusCode: res.status,
        body: res.body,
        headers: res.headers,
      };
    },
  };
}
