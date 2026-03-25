import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import router from './routes/index.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── App Initialization ─────────────────────────────────────────────────────────
const app = express();

// ── Security Middlewares ───────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving static uploads
  }),
);

app.use(
  cors({
    origin:
      env.NODE_ENV === 'production'
        ? (process.env['CORS_ORIGINS'] ?? '').split(',').filter(Boolean)
        : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Request Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ────────────────────────────────────────────────────────────────────
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static Files — uploaded documents & images ────────────────────────────────
const uploadsPath = path.resolve(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use(router);

// ── Global Error Handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

// ── Server Startup ─────────────────────────────────────────────────────────────
async function startServer() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.info(`\n🚀 Server running on http://localhost:${env.PORT}`);
    console.info(`   Environment: ${env.NODE_ENV}`);
    console.info(`   Health:      http://localhost:${env.PORT}/api/health\n`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n⚡ ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.info('✅ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled promise rejections (fail loudly in development)
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    if (env.NODE_ENV === 'production') process.exit(1);
  });
}

startServer();
