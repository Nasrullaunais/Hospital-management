import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * S3 Configuration
 *
 * S3Client is only created when all required AWS environment variables are present.
 * In development without AWS configured, s3Client is null — consumers should check
 * before using S3 operations or handle graceful fallback.
 *
 * Use the ready guards: isS3Configured() / requireS3()
 */

const ALL_AWS_VARS_PRESENT = !!(
  env.AWS_ACCESS_KEY_ID &&
  env.AWS_SECRET_ACCESS_KEY &&
  env.AWS_S3_BUCKET
);

export const s3Client: S3Client | null = ALL_AWS_VARS_PRESENT
  ? new S3Client({
      region: env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/** Returns true if S3 is configured and ready for use */
export function isS3Configured(): boolean {
  return s3Client !== null && !!env.AWS_S3_BUCKET;
}

/** The S3 bucket name */
export const S3_BUCKET: string = env.AWS_S3_BUCKET ?? '';

/** All files are stored under this prefix to namespace the bucket */
export const S3_PREFIX: string = env.AWS_S3_PREFIX;
