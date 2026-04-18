import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useToast } from '@/shared/providers/ToastProvider';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function useMessage() {
  const toast = useToast();

  const showSuccess = useCallback(
    (message: string) => {
      toast.showSuccess(message);
    },
    [toast],
  );

  const showError = useCallback(
    (message: string) => {
      toast.showError(message);
    },
    [toast],
  );

  const showInfo = useCallback(
    (message: string) => {
      toast.showInfo(message);
    },
    [toast],
  );

  const showApiError = useCallback(
    (error: unknown, fallback = 'Something went wrong') => {
      const message = error instanceof Error ? error.message : fallback;
      toast.showError(message);
    },
    [toast],
  );

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        Alert.alert(options.title, options.message, [
          {
            text: options.cancelText ?? 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: options.confirmText ?? 'Confirm',
            style: options.destructive ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ]);
      });
    },
    [],
  );

  return {
    showSuccess,
    showError,
    showInfo,
    showApiError,
    confirm,
  };
}
