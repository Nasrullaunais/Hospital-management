import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';

export const AUTH_TOKEN_KEY = '@hospital_auth_token';

// Registered by AuthProvider at mount — clears React state on 401
let _clearSession: (() => void) | null = null;
export function registerClearSession(fn: () => void) {
  _clearSession = fn;
}

/**
 * Axios API Client
 *
 * Pre-configured with:
 *   - Base URL from Config.API_URL (set via EXPO_PUBLIC_API_URL env var)
 *   - Request interceptor: auto-attaches Authorization Bearer token from AsyncStorage
 *   - Response interceptor: standardized error handling
 *   - 15s timeout
 *
 * All feature service files should import this client:
 *   import { apiClient } from '@/shared/api/client';
 */
export const apiClient = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor — Attach auth token ────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor — Normalize errors ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    // Network error (server down, no connection)
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // 401 Unauthorized — token expired or invalid, clear stored token and React state
    if (error.response.status === 401) {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      _clearSession?.();
    }

    // Extract backend message or fall back to a generic error
    const message =
      error.response.data?.message ?? `Request failed with status ${error.response.status}`;

    return Promise.reject(new Error(message));
  },
);
