import React, { createContext, useContext, useCallback } from 'react';
import { ToastAndroid, Platform, Alert } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ToastAndroid.SHORT=0, ToastAndroid.BOTTOM=1 — inline to avoid Android-only module errors on web
const DURATION = 0;
const BOTTOM = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const show = useCallback((message: string, type: ToastType = 'info') => {
    if (Platform.OS === 'android') {
      const androidTypeMap = {
        success: ToastAndroid.LONG,
        error: ToastAndroid.LONG,
        info: ToastAndroid.SHORT,
      };
      ToastAndroid.showWithGravity(message, androidTypeMap[type], BOTTOM);
    }
  }, []);

  const showSuccess = useCallback(
    (message: string) => show(message, 'success'),
    [show],
  );

  const showError = useCallback(
    (message: string) => show(message, 'error'),
    [show],
  );

  const showInfo = useCallback(
    (message: string) => show(message, 'info'),
    [show],
  );

  return (
    <ToastContext.Provider value={{ show, showSuccess, showError, showInfo }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
