import React, { createContext, useContext, useCallback } from 'react';
import { ToastAndroid, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = ToastAndroid.SHORT;
const BOTTOM = ToastAndroid.BOTTOM;

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
