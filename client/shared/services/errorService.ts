import { AxiosError } from 'axios';

const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

export interface ErrorResult {
  userMessage: string;
  shouldRetry: boolean;
  shouldToast: boolean;
  statusCode?: number;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Array<{ field?: string; message: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet.',
  REQUEST_FAILED: 'Request failed. Please try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. Please try again.',
  422: 'The submitted data is invalid.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Something went wrong on our end. Please try again later.',
  DEFAULT: 'Something went wrong. Please try again.',
};

export function getFriendlyErrorMessage(error: unknown): ErrorResult {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return {
        userMessage: ERROR_MESSAGES.NETWORK_ERROR,
        shouldRetry: true,
        shouldToast: true,
      };
    }

    const statusCode = error.response.status;
    const data = error.response.data as ApiErrorResponse | undefined;
    const serverMessage = data?.message;

    if (statusCode === 401) {
      return {
        userMessage: serverMessage || ERROR_MESSAGES[401],
        shouldRetry: false,
        shouldToast: true,
        statusCode,
      };
    }

    if (statusCode === 422 && data?.errors?.length) {
      return {
        userMessage: data.errors[0].message,
        shouldRetry: false,
        shouldToast: true,
        statusCode,
      };
    }

    return {
      userMessage: serverMessage || ERROR_MESSAGES[statusCode] || ERROR_MESSAGES.DEFAULT,
      shouldRetry: statusCode >= 500,
      shouldToast: true,
      statusCode,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return {
        userMessage: ERROR_MESSAGES.TIMEOUT,
        shouldRetry: true,
        shouldToast: true,
      };
    }
    return {
      userMessage: error.message || ERROR_MESSAGES.DEFAULT,
      shouldRetry: false,
      shouldToast: true,
    };
  }

  return {
    userMessage: ERROR_MESSAGES.DEFAULT,
    shouldRetry: false,
    shouldToast: true,
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delay: number) => void,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        onRetry?.(attempt + 1, delay);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export function extractFieldErrors(
  error: unknown,
): Array<{ field: string; message: string }> {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.errors?.length) {
      return data.errors.map((e) => ({
        field: e.field || 'unknown',
        message: e.message,
      }));
    }
  }
  return [];
}
