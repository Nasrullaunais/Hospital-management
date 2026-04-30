/**
 * SecureStorage - Provides encrypted storage for sensitive data.
 *
 * Uses expo-secure-store (iOS Keychain / Android Keystore) for tokens.
 * Falls back to AsyncStorage for non-sensitive data.
 *
 * IMPORTANT: Only use this for sensitive data like JWT tokens.
 * For user preferences, cached data, etc., use AsyncStorage directly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store uses native keychain/keystore which is properly encrypted
// AsyncStorage is NOT encrypted - only use for non-sensitive data
import * as SecureStore from 'expo-secure-store';

export const SECURE_AUTH_TOKEN_KEY = 'hospital_auth_token';

/**
 * Store the auth token securely.
 * Uses iOS Keychain / Android Keystore via expo-secure-store.
 */
export async function setSecureAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, token, {
      requireConsumption: false,
    });
  } catch (error) {
    // If secure store fails (e.g., device doesn't support it), log but don't crash
    console.error('SecureStorage: Failed to store token securely:', error);
    // Fallback: don't store - security issue is better than storing insecurely
    throw new Error('Failed to store authentication token securely');
  }
}

/**
 * Retrieve the auth token from secure storage.
 */
export async function getSecureAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('SecureStorage: Failed to retrieve token:', error);
    return null;
  }
}

/**
 * Delete the auth token from secure storage.
 */
export async function deleteSecureAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('SecureStorage: Failed to delete token:', error);
  }
}

/**
 * Check if secure storage is available on this device.
 * expo-secure-store may not be available on some devices or in web.
 */
export async function isSecureStorageAvailable(): Promise<boolean> {
  try {
    await SecureStore.getItemAsync('__test_key__');
    return true;
  } catch {
    return false;
  }
}

// Keep these AsyncStorage keys for non-sensitive data
export const ASYNC_USER_KEY = '@hospital_user';
export const ASYNC_TOKEN_FALLBACK_KEY = '@hospital_auth_token_fallback';
