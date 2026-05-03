import type { Request } from 'express';
import { s3Service } from '../services/s3.service.js';
import { formatFileReference } from './fileReference.js';

/**
 * Unified file upload resolution — deduplicates the S3-vs-local pattern
 * that was duplicated in 7+ controllers.
 *
 * Priority: S3 presigned key > multer local file > null
 *
 * @returns The resolved file URL string, or null if no file was provided.
 * @throws {ApiError} if the S3 presigned fileKey fails verification.
 *
 * @example
 *   // In a controller:
 *   const idDocumentUrl = await resolveFileUpload(req, req.user!.id);
 *   if (idDocumentUrl) updates.idDocumentUrl = idDocumentUrl;
 */
export async function resolveFileUpload(
  req: Request,
  userId: string,
  s3FieldName = 'fileKey',
): Promise<string | null> {
  const fileKey: unknown = req.body[s3FieldName];

  if (fileKey && typeof fileKey === 'string' && fileKey.trim().length > 0) {
    // S3 presigned upload flow
    await s3Service.verifyAndConsume(userId, fileKey);
    return formatFileReference('s3', fileKey);
  }

  if (req.file) {
    // Legacy multer upload
    return formatFileReference('local', `/uploads/${req.file.filename}`);
  }

  return null;
}

/**
 * Resolve a file URL from either S3 or local storage without consuming a presigned key.
 * For use cases where the file has already been uploaded and just needs its URL built.
 *
 * @example
 *   // Building file URL from existing reference
 *   const url = resolveFileUrl(req, 'paymentReceipt');
 */
export function resolveFileUrl(req: Request, s3FieldName = 'fileKey'): string | null {
  const fileKey: unknown = req.body[s3FieldName];

  if (fileKey && typeof fileKey === 'string' && fileKey.trim().length > 0) {
    return formatFileReference('s3', fileKey);
  }

  if (req.file) {
    return formatFileReference('local', `/uploads/${req.file.filename}`);
  }

  return null;
}
