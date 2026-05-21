/**
 * PIN Security Utility
 * 
 * Provides secure PIN hashing and verification using SHA-256 with salt.
 * PINs are never stored in plain text.
 */

import { getSecureItem, setSecureItem, removeSecureItem, SECURE_STORAGE_KEYS } from './secureStorage';
import * as cryptoModule from 'react-native-quick-crypto';
// Type assertion for react-native-quick-crypto exports
const crypto = cryptoModule as any;
import { log } from './logger';

/**
 * Generate a random salt for PIN hashing
 */
function generateSalt(): string {
  const saltBytes = crypto.randomBytes(16);
  return saltBytes.toString('hex');
}

/**
 * Hash a PIN with salt
 * 
 * @param pin - Plain text PIN
 * @param salt - Salt value (optional, will generate if not provided)
 * @returns Object with hash and salt
 */
export function hashPIN(pin: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || generateSalt();
  const hash = crypto.createHash('sha256')
    .update(pin + actualSalt)
    .digest('hex');
  
  return { hash, salt: actualSalt };
}

/**
 * Verify a PIN against a stored hash
 * 
 * @param pin - Plain text PIN to verify
 * @param hash - Stored hash
 * @param salt - Salt used for the hash
 * @returns True if PIN matches
 */
export function verifyPIN(pin: string, hash: string, salt: string): boolean {
  const computedHash = crypto.createHash('sha256')
    .update(pin + salt)
    .digest('hex');
  
  return computedHash === hash;
}

/**
 * Store a PIN securely (hashed)
 * 
 * @param pin - Plain text PIN
 * @returns Promise that resolves to true if successful
 */
export async function storePIN(pin: string): Promise<boolean> {
  try {
    const { hash, salt } = hashPIN(pin);
    const pinData = JSON.stringify({ hash, salt });
    
    return await setSecureItem(SECURE_STORAGE_KEYS.USER_PIN, pinData);
  } catch (error) {
    log.error('Failed to store PIN', error);
    return false;
  }
}

/**
 * Verify a PIN against stored hash
 * 
 * @param pin - Plain text PIN to verify
 * @returns Promise that resolves to true if PIN is correct
 */
export async function verifyStoredPIN(pin: string): Promise<boolean> {
  try {
    const pinData = await getSecureItem(SECURE_STORAGE_KEYS.USER_PIN);
    if (!pinData) {
      return false;
    }
    
    const { hash, salt } = JSON.parse(pinData);
    return verifyPIN(pin, hash, salt);
  } catch (error) {
    log.error('Failed to verify PIN', error);
    return false;
  }
}

/**
 * Check if a PIN is set
 * 
 * @returns Promise that resolves to true if PIN is set
 */
export async function isPINSet(): Promise<boolean> {
  try {
    const pinData = await getSecureItem(SECURE_STORAGE_KEYS.USER_PIN);
    return pinData !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Remove stored PIN
 * 
 * @returns Promise that resolves to true if successful
 */
export async function removePIN(): Promise<boolean> {
  try {
    return await removeSecureItem(SECURE_STORAGE_KEYS.USER_PIN);
  } catch (error) {
    log.error('Failed to remove PIN', error);
    return false;
  }
}

