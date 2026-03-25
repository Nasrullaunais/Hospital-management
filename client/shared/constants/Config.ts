/**
 * App-wide configuration constants.
 * All values come from environment variables (Expo public env vars).
 *
 * Set EXPO_PUBLIC_API_URL in client/.env
 * Physical device: use your machine's local IP e.g. http://192.168.1.x:5000/api
 */
export const Config = {
  API_URL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:5000/api',
  REQUEST_TIMEOUT_MS: 15_000,
} as const;
