import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { app } from './app.js';
import { logger } from './shared/utils/logger.js';

// ── Server Startup ─────────────────────────────────────────────────────────────
async function startServer() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        event: 'server_started',
        port: env.PORT,
        env: env.NODE_ENV,
        healthEndpoint: '/api/health',
      },
      'Server started',
    );
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
