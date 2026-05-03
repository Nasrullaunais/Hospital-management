import type { Request, Response, NextFunction } from 'express';
import { s3Service } from '../../shared/services/s3.service.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { PendingUpload } from './pendingUpload.model.js';
import { S3_PREFIX } from '../../config/s3.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_MODULES = ['records', 'prescriptions', 'invoices', 'patients', 'doctors', 'pharmacy'];

/** POST /api/files/upload-url */
export const getUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileName, mimeType, module: fileModule, expirySeconds: rawExpiry } = req.body as Record<string, unknown>;

    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      return next(ApiError.badRequest('fileName is required and must be a non-empty string'));
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return next(ApiError.badRequest('mimeType is required'));
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return next(ApiError.badRequest(`Invalid mimeType. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }

    if (!fileModule || typeof fileModule !== 'string') {
      return next(ApiError.badRequest('module is required'));
    }

    if (!ALLOWED_MODULES.includes(fileModule)) {
      return next(ApiError.badRequest(`Invalid module. Allowed: ${ALLOWED_MODULES.join(', ')}`));
    }

    const expirySeconds = typeof rawExpiry === 'number' && rawExpiry > 0 ? rawExpiry : 3600;

    const { uploadUrl, fileKey } = await s3Service.generateUploadUrl(
      fileName.trim(),
      mimeType,
      fileModule,
      expirySeconds,
    );

    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    await PendingUpload.create({
      fileKey,
      userId: req.user.id,
      module: fileModule,
      expiresAt: new Date(Date.now() + expirySeconds * 1000),
    });

    res.status(200).json({ success: true, data: { uploadUrl, fileKey } });
  } catch (err) {
    next(err);
  }
};

/** POST /api/files/download-url */
export const getDownloadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileKey } = req.body as Record<string, unknown>;

    if (!fileKey || typeof fileKey !== 'string' || fileKey.trim().length === 0) {
      return next(ApiError.badRequest('fileKey is required and must be a non-empty string'));
    }

    if (!fileKey.startsWith(S3_PREFIX)) {
      return next(ApiError.forbidden('Invalid file key prefix'));
    }

    const downloadUrl = await s3Service.generateDownloadUrl(fileKey.trim());

    res.status(200).json({ success: true, data: { downloadUrl } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/files/image/:encodedKey
 * Redirects to a presigned S3 download URL.
 * Used by <Image> components that can't call POST endpoints asynchronously.
 */
export const serveImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const encodedKey = String(req.params.encodedKey);
    const fileKey = decodeURIComponent(encodedKey);

    if (!fileKey.startsWith(S3_PREFIX)) {
      return next(ApiError.forbidden('Invalid file key prefix'));
    }

    const downloadUrl = await s3Service.generateDownloadUrl(fileKey);

    res.redirect(302, downloadUrl);
  } catch (err) {
    next(err);
  }
};

/** POST /api/files/download-urls */
export const getDownloadUrls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileKeys } = req.body as Record<string, unknown>;

    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      return next(ApiError.badRequest('fileKeys is required and must be a non-empty array'));
    }

    const stringFileKeys = fileKeys as string[];

    for (const key of stringFileKeys) {
      if (typeof key !== 'string' || !key.startsWith(S3_PREFIX)) {
        return next(ApiError.forbidden(`All file keys must start with ${S3_PREFIX}`));
      }
    }

    const urls = await s3Service.generateDownloadUrls(stringFileKeys);

    res.status(200).json({ success: true, data: { urls } });
  } catch (err) {
    next(err);
  }
};