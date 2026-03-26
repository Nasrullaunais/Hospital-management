/**
 * App-wide configuration constants.
 * All values come from environment variables (Expo public env vars).
 *
 * Set EXPO_PUBLIC_API_URL in client/.env
 * Physical device: use your machine's local IP e.g. http://192.168.1.x:5000/api
 */
export const Config = {
  /** Base server URL without /api — used for serving uploaded files, images, etc. */
  BASE_URL: process.env['EXPO_PUBLIC_BASE_URL'] ?? 'http://localhost:5000',
  /** Full API URL — used for all API requests */
  API_URL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:5000/api',
  REQUEST_TIMEOUT_MS: 15_000,
} as const;
