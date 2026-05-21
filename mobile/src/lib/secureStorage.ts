/**
 * Secure Storage Utility
 * 
 * Wrapper around expo-secure-store for storing sensitive data securely.
 * Uses device keychain (iOS) or encrypted SharedPreferences (Android).
 * 
 * Use this for:
 * - Authentication tokens
 * - Refresh tokens
 * - PINs and passwords
 * - Any sensitive user data
 * 
 * Do NOT use for:
 * - Large data (use AsyncStorage instead)
 * - Non-sensitive data (use AsyncStorage instead)
 */

import * as SecureStore from 'expo-secure-store';
import { log } from './logger';

export interface SecureStorageOptions {
  /**
   * Require authentication (biometric/passcode) before accessing the item
   * @default false
   */
  requireAuthentication?: boolean;
  
  /**
   * Authentication prompt message (iOS only)
   */
  authenticationPrompt?: string;
  
  /**
   * Keychain accessibility level (iOS only)
   * @default 'WhenUnlocked'
   */
  keychainAccessible?: typeof SecureStore.AFTER_FIRST_UNLOCK | typeof SecureStore.ALWAYS | typeof SecureStore.WHEN_UNLOCKED | typeof SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
}

/**
 * Store a value securely
 * 
 * @param key - Storage key
 * @param value - Value to store (will be converted to string)
 * @param options - Storage options
 * @returns Promise that resolves to true if successful
 */
export async function setSecureItem(
  key: string,
  value: string,
  options?: SecureStorageOptions
): Promise<boolean> {
  try {
    const secureOptions: SecureStore.SecureStoreOptions = {};
    
    if (options?.requireAuthentication) {
      secureOptions.requireAuthentication = true;
      if (options.authenticationPrompt) {
        secureOptions.authenticationPrompt = options.authenticationPrompt;
      }
    }
    
    if (options?.keychainAccessible) {
      secureOptions.keychainAccessible = options.keychainAccessible;
    }
    
    await SecureStore.setItemAsync(key, value, secureOptions);
    return true;
  } catch (error) {
      log.error(`Failed to set secure item "${key}"`, error);
      return false;
    }
}

/**
 * Retrieve a value from secure storage
 * 
 * @param key - Storage key
 * @param options - Storage options
 * @returns Promise that resolves to the stored value or null if not found
 */
export async function getSecureItem(
  key: string,
  options?: SecureStorageOptions
): Promise<string | null> {
  try {
    const secureOptions: SecureStore.SecureStoreOptions = {};
    
    if (options?.requireAuthentication) {
      secureOptions.requireAuthentication = true;
      if (options.authenticationPrompt) {
        secureOptions.authenticationPrompt = options.authenticationPrompt;
      }
    }
    
    return await SecureStore.getItemAsync(key, secureOptions);
  } catch (error) {
      log.error(`Failed to get secure item "${key}"`, error);
      return null;
    }
}

/**
 * Remove a value from secure storage
 * 
 * @param key - Storage key
 * @returns Promise that resolves to true if successful
 */
export async function removeSecureItem(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
      log.error(`Failed to remove secure item "${key}"`, error);
      return false;
    }
}

/**
 * Check if secure storage is available on this device
 * 
 * @returns Promise that resolves to true if secure storage is available
 */
export async function isSecureStorageAvailable(): Promise<boolean> {
  try {
    // Try to set and get a test value
    const testKey = '__secure_storage_test__';
    const testValue = 'test';
    
    await SecureStore.setItemAsync(testKey, testValue);
    const retrieved = await SecureStore.getItemAsync(testKey);
    await SecureStore.deleteItemAsync(testKey);
    
    return retrieved === testValue;
  } catch (error) {
    return false;
  }
}

/**
 * Storage keys used throughout the app
 * Centralized to avoid typos and ensure consistency
 */
export const SECURE_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRES_AT: 'token_expires_at',
  USER_PIN: 'user_pin',
  USER_DATA: 'user_data', // Note: Only store minimal user data here, use AsyncStorage for full profile
  BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

