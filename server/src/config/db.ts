import mongoose from 'mongoose';
import { env } from './env.js';

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
  mongoose.connection.on('connected', () => {
    console.info(`✅ MongoDB connected: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        // Recommended production settings
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      return; // Success — exit retry loop
    } catch (err) {
      const error = err as Error;
      if (attempt === MAX_RETRIES) {
        console.error(
          `❌ MongoDB connection failed after ${MAX_RETRIES} attempts: ${error.message}`,
        );
        process.exit(1);
      }
      console.warn(
        `⚠️  MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`,
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
  console.info('🔌 MongoDB connection closed.');
}
