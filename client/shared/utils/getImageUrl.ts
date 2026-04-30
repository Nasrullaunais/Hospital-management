/**
 * Builds a full image URL from a server-relative path.
 * Handles absolute URLs, S3 protocol, local protocol, and legacy relative paths.
 *
 * Supported schemes:
 *   - http:// / https://  → pass through as-is
 *   - s3://...            → returns backend endpoint that generates presigned redirect
 *   - local://...         → strips 'local:' prefix, serves via express.static
 *   - /uploads/...        → legacy local path, serves via express.static
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (url.startsWith('s3://')) {
    const key = url.slice(5);
    const { Config: cfg } = require('@/shared/constants/Config');
    const apiBase = cfg.API_URL.endsWith('/') ? cfg.API_URL.slice(0, -1) : cfg.API_URL;
    return `${apiBase}/files/image/${encodeURIComponent(key)}`;
  }

  if (url.startsWith('local://')) {
    const { Config } = require('@/shared/constants/Config');
    const base = Config.BASE_URL.endsWith('/') ? Config.BASE_URL.slice(0, -1) : Config.BASE_URL;
    const cleanPath = url.slice(6).replace(/^\/+/, '/');
    return `${base}${cleanPath}`;
  }

  const { Config } = require('@/shared/constants/Config');
  const base = Config.BASE_URL.endsWith('/') ? Config.BASE_URL.slice(0, -1) : Config.BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}
