import dotenv from 'dotenv';
import { resolve } from 'path';
import { logger } from '../shared/utils/logger.js';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

/**
 * Environment Variable Configuration
 *
 * Validates all required environment variables at startup.
 * The app will fail fast with a clear error if anything is missing.
 * Import `env` from this module — never use process.env directly.
 */

interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  // Phase 6: AWS (optional in dev, required in production)
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  AWS_S3_PREFIX: string;
  S3_PRESIGNED_UPLOAD_EXPIRY: number;
  S3_PRESIGNED_DOWNLOAD_EXPIRY: number;
}

const required = ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN'] as const;

function validateEnv(): EnvConfig {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.fatal(
      {
        event: 'env_validation_failed',
        missing,
        expectedFile: 'server/.env',
      },
      'Missing required environment variables',
    );
    process.exit(1);
  }

  const mongoUri = process.env['MONGO_URI'];
  const jwtSecret = process.env['JWT_SECRET'];
  const jwtExpiresIn = process.env['JWT_EXPIRES_IN'];

  if (!mongoUri || !jwtSecret || !jwtExpiresIn) {
    logger.fatal({ event: 'env_validation_failed' }, 'Environment validation failed unexpectedly');
    process.exit(1);
  }

  const nodeEnv = (process.env['NODE_ENV'] as EnvConfig['NODE_ENV']) ?? 'development';

  const config: EnvConfig = {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env['PORT'] ?? '5000', 10),
    MONGO_URI: mongoUri,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    AWS_ACCESS_KEY_ID: process.env['AWS_ACCESS_KEY_ID'],
    AWS_SECRET_ACCESS_KEY: process.env['AWS_SECRET_ACCESS_KEY'],
    AWS_REGION: process.env['AWS_REGION'],
    AWS_S3_BUCKET: process.env['AWS_S3_BUCKET'],
    AWS_S3_PREFIX: process.env['AWS_S3_PREFIX'] || 'hospital-management/',
    S3_PRESIGNED_UPLOAD_EXPIRY: parseInt(process.env['S3_PRESIGNED_UPLOAD_EXPIRY'] ?? '3600', 10),
    S3_PRESIGNED_DOWNLOAD_EXPIRY: parseInt(process.env['S3_PRESIGNED_DOWNLOAD_EXPIRY'] ?? '300', 10),
  };

  // In production, AWS credentials are required
  if (nodeEnv === 'production') {
    const awsRequired = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'] as const;
    const awsMissing = awsRequired.filter((key) => !process.env[key]);

    if (awsMissing.length > 0) {
      logger.fatal(
        { event: 'env_validation_failed', missing: awsMissing },
        'Missing required AWS environment variables for production',
      );
      process.exit(1);
    }
  }

  return config;
}

export const env = validateEnv();
