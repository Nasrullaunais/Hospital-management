import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { app } from './app.js';
import { logger } from './shared/utils/logger.js';
import { markOverdueInvoices } from './modules/billing/invoice.service.js';

// ── Server Startup ─────────────────────────────────────────────────────────────
async function startServer() {
  const startupStart = Date.now();

  const dbStart = Date.now();
  await connectDB();
  logger.info({ event: 'db_connected', durationMs: Date.now() - dbStart }, 'Database connected');

  // ── Scheduled Jobs ──────────────────────────────────────────────────────────
  // Mark invoices as overdue every 5 minutes
  const overdueIntervalMs = 5 * 60 * 1000;
  // Run immediately on startup, then every 5 minutes
  markOverdueInvoices().catch((err) =>
    logger.error({ event: 'cron_overdue_marking_failed', err }, 'Initial overdue marking failed'),
  );
  const overdueTimer = setInterval(() => {
    markOverdueInvoices().catch((err) =>
      logger.error({ event: 'cron_overdue_marking_failed', err }, 'Scheduled overdue marking failed'),
    );
  }, overdueIntervalMs);
  overdueTimer.unref(); // Don't prevent process exit

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        event: 'server_started',
        port: env.PORT,
        env: env.NODE_ENV,
        startupDurationMs: Date.now() - startupStart,
        healthEndpoint: '/api/health',
      },
      'Server started',
    );
  });

  // Pre-warm: lazy-load heavy modules during startup
  setImmediate(() => {
    import('./shared/services/reportGenerator.js').catch((err) => {
      logger.warn({ event: 'prewarm_warning', err }, 'Report generator pre-warm failed');
    });
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.warn({ event: 'shutdown_signal', signal }, 'Shutdown signal received');
    server.close(async () => {
      await disconnectDB();
      logger.info({ event: 'server_stopped' }, 'Server closed gracefully');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled promise rejections (fail loudly in development)
  process.on('unhandledRejection', (reason) => {
    logger.error({ event: 'unhandled_rejection', reason }, 'Unhandled promise rejection');
    if (env.NODE_ENV === 'production') process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ event: 'uncaught_exception', err: error }, 'Uncaught exception');
    process.exit(1);
  });
}

startServer();
