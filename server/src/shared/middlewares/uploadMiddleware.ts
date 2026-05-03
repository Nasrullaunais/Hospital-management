import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';
import { ApiError } from '../utils/ApiError.js';

// ── Ensure uploads directory exists ───────────────────────────────────────────
const UPLOADS_DIR = path.resolve(import.meta.dirname, '../../..', process.env['UPLOADS_DIR'] ?? 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Allowed MIME types ─────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

// ── Storage Engine ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const sanitized = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${sanitized}`;
    cb(null, unique);
  },
});

// ── Allowed file extensions (enforced server-side, in addition to MIME check) ─────
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

// ── File Filter ────────────────────────────────────────────────────────────────
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    cb(
      new ApiError(
        400,
        `File type '${file.mimetype}' (ext: ${ext}) is not allowed. Accepted types: JPEG, PNG, GIF, WebP, PDF.`,
      ),
    );
  } else {
    cb(null, true);
  }
};

// ── Base Multer Instance ───────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

/**
 * Upload a single file from a named form field.
 *
 * @param fieldName - The form field name (e.g. 'idDocument', 'labReport')
 *
 * @example
 *   router.put('/me', authMiddleware, uploadSingle('idDocument'), updateProfile)
 */
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

/**
 * Upload multiple files from a named form field.
 *
 * @param fieldName - The form field name
 * @param maxCount  - Maximum number of files (default: 5)
 *
 * @example
 *   router.post('/records', authMiddleware, uploadMultiple('labFiles', 3), createRecord)
 */
export const uploadMultiple = (fieldName: string, maxCount = 5) =>
  upload.array(fieldName, maxCount);
