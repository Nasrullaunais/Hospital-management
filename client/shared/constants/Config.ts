/**
 * App-wide configuration constants.
 * All values come from environment variables (Expo public env vars).
 *
 * Set EXPO_PUBLIC_API_URL in client/.env
 * Physical device: use your machine's local IP e.g. http://192.168.1.x:5000/api
 */
export const Config = {
  BASE_URL: process.env['EXPO_PUBLIC_BASE_URL'] ?? ((): string => {
    const apiUrl = process.env['EXPO_PUBLIC_API_URL'];
    if (apiUrl) return apiUrl.replace(/\/api\/?$/, '');
    return 'http://localhost:5000';
  })(),
  API_URL: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:5000/api',
  REQUEST_TIMEOUT_MS: 15_000,
} as const;

export const LOW_STOCK_THRESHOLD = 10;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const TAB_BAR_HEIGHT = 70;
