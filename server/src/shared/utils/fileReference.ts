/**
 * File reference protocol scheme utilities.
 *
 * All file references stored in the database use an explicit protocol prefix:
 * - `s3://bucket/key`     → S3 (full key including prefix)
 * - `local:///path/file`  → Local disk (three slashes b/c value starts with /)
 * - `/uploads/file.jpg`   → Legacy local (backward compatible, no protocol)
 *
 * @example
 *   formatFileReference('s3', 'hospital-management/pharmacy/uuid_amox.jpg')
 *   // → 's3://hospital-management/pharmacy/uuid_amox.jpg'
 *
 *   formatFileReference('local', '/uploads/filename.jpg')
 *   // → 'local:///uploads/filename.jpg'
 */

export type StorageType = 's3' | 'local';

export function formatFileReference(type: 's3', value: string): string;
export function formatFileReference(type: 'local', value: string): string;
export function formatFileReference(type: StorageType, value: string): string {
  return `${type}://${value}`;
}
