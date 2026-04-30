import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * S3 Configuration
 *
 * Initializes the AWS S3 client using credentials from env.
 * Exports the client instance, bucket name, and storage prefix.
 * Operations will fail at runtime if AWS credentials are not configured.
 */

export const s3Client = new S3Client({
  region: env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

/** The S3 bucket name — must be configured in production */
export const S3_BUCKET: string = env.AWS_S3_BUCKET ?? '';

/** All files are stored under this prefix to namespace the bucket */
export const S3_PREFIX: string = env.AWS_S3_PREFIX;
