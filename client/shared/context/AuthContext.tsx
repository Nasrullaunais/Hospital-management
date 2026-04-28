import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, registerClearSession } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import type { User, AuthResponse } from '../types';
import type { RegisterPayload } from '@/features/auth/services/auth.service';
import { authService } from '@/features/auth/services/auth.service';
import {
  setSecureAuthToken,
  getSecureAuthToken,
  deleteSecureAuthToken,
  ASYNC_USER_KEY,
} from '../services/secureStorage';

// ── Context types ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Call after profile updates to refresh the stored user object */
  refreshUser: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until we check AsyncStorage

  // Stable ref used by the Axios 401 interceptor (avoids stale closure)
  const clearSessionRef = useRef<() => void>(() => {});

  // ── Wire clearSession into Axios interceptor on mount ──────────────────────
  useEffect(() => {
    clearSessionRef.current = () => {
      setToken(null);
      setUser(null);
    };
    registerClearSession(() => clearSessionRef.current());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── On mount: restore session from secure storage ───────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await getSecureAuthToken();
        const storedUser = await AsyncStorage.getItem(ASYNC_USER_KEY);

        if (!storedToken) {
          if (storedUser) {
            await AsyncStorage.removeItem(ASYNC_USER_KEY);
          }
          setIsLoading(false);
          return;
        }

        setToken(storedToken);

        if (storedUser) {
          try {
            const cachedUser = JSON.parse(storedUser) as User;

            if (cachedUser.role !== 'patient') {
              setUser(cachedUser);
              setIsLoading(false);
              return;
            }

            const response = await apiClient.get<{ success: boolean; data: { user: User } }>(
              ENDPOINTS.PATIENTS.ME,
            );
            const validatedUser = response.data.data.user;
            await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(validatedUser));
            setUser(validatedUser);
          } catch (err) {
            console.error('restoreSession: Session validation failed:', err);
            await deleteSecureAuthToken();
            await AsyncStorage.removeItem(ASYNC_USER_KEY);
            setToken(null);
            setUser(null);
          }
        } else {
          try {
            const response = await apiClient.get<{ success: boolean; data: { user: User } }>(
              ENDPOINTS.PATIENTS.ME,
            );
            const validatedUser = response.data.data.user;
            await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(validatedUser));
            setUser(validatedUser);
          } catch (err) {
            console.error('restoreSession: Failed to fetch user profile:', err);
            await deleteSecureAuthToken();
            await AsyncStorage.removeItem(ASYNC_USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('restoreSession: Corrupted storage:', err);
        await deleteSecureAuthToken();
        await AsyncStorage.removeItem(ASYNC_USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      ENDPOINTS.AUTH.LOGIN,
      { email, password },
    );

    const { token: newToken, user: newUser } = response.data.data;

    await setSecureAuthToken(newToken);
    await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload) => {
    const { token: newToken, user: newUser } = await authService.register(payload);

    await setSecureAuthToken(newToken);
    await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // ignore — logout should succeed even if server call fails
    }
    await deleteSecureAuthToken();
    await AsyncStorage.removeItem(ASYNC_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // ── Refresh user from server ─────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { user: User } }>(
        ENDPOINTS.PATIENTS.ME,
      );
      const updatedUser = response.data.data.user;
      await AsyncStorage.setItem(ASYNC_USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error('refreshUser: Failed to refresh user:', err);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
