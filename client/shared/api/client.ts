import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import { getFriendlyErrorMessage, withRetry } from '../services/errorService';
import {
  getSecureAuthToken,
  deleteSecureAuthToken,
  ASYNC_USER_KEY,
} from '../services/secureStorage';

export const AUTH_TOKEN_KEY = '@hospital_auth_token';

let _toastShow: ((message: string, type?: 'success' | 'error' | 'info') => void) | null = null;
export function registerToast(showFn: (message: string, type?: 'success' | 'error' | 'info') => void) {
  _toastShow = showFn;
}

let _clearSession: (() => void) | null = null;
export function registerClearSession(fn: () => void) {
  _clearSession = fn;
}

export const apiClient = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getSecureAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const errorInfo = getFriendlyErrorMessage(error);

    if (error.response?.status === 401) {
      await deleteSecureAuthToken();
      await AsyncStorage.removeItem(ASYNC_USER_KEY);
      _clearSession?.();
    }

    if (errorInfo.shouldToast && _toastShow) {
      _toastShow(errorInfo.userMessage, 'error');
    }

    return Promise.reject(new Error(errorInfo.userMessage));
  },
);

export async function apiRequest<T>(fn: () => Promise<T>, showRetryToast = true): Promise<T> {
  return withRetry(fn, (attempt) => {
    if (showRetryToast && _toastShow) {
      _toastShow(`Retrying... (attempt ${attempt})`, 'info');
    }
  });
}
