import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../shared/utils/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Connect to MongoDB
 *
 * Attempts connection up to MAX_RETRIES times with exponential delay.
 * Registers event listeners for connection lifecycle logging.
 * Call this once at app startup in index.ts.
 */
export async function connectDB(): Promise<void> {
  const dbLogger = logger.child({ component: 'database' });

  mongoose.connection.on('connected', () => {
    dbLogger.info(
      { event: 'mongo_connected', host: mongoose.connection.host },
      'MongoDB connected',
    );
  });

  mongoose.connection.on('disconnected', () => {
    dbLogger.warn({ event: 'mongo_disconnected' }, 'MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    dbLogger.error({ event: 'mongo_connection_error', err }, 'MongoDB connection error');
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        // Recommended production settings
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true, // Required for MongoDB Atlas
      });
      return; // Success — exit retry loop
    } catch (err) {
      const error = err as Error;
      if (attempt === MAX_RETRIES) {
        dbLogger.fatal(
          {
            event: 'mongo_connect_failed',
            attempt,
            maxRetries: MAX_RETRIES,
            err: error,
          },
          'MongoDB connection failed after max retries',
        );
        process.exit(1);
      }
      dbLogger.warn(
        {
          event: 'mongo_retry',
          attempt,
          maxRetries: MAX_RETRIES,
          retryDelayMs: RETRY_DELAY_MS,
          error: error.message,
        },
        'MongoDB connection attempt failed, retrying',
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Gracefully close the MongoDB connection.
 * Called during process shutdown (SIGINT / SIGTERM).
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  logger.info(
    { component: 'database', event: 'mongo_connection_closed' },
    'MongoDB connection closed',
  );
}
