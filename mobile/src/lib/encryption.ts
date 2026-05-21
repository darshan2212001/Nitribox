/**
 * Encryption Utility
 * 
 * Provides AES-256 encryption for sensitive data.
 * Uses device-specific keys stored in secure storage.
 */

import * as cryptoModule from 'react-native-quick-crypto';
// Type assertion for react-native-quick-crypto exports
const crypto = cryptoModule as any;
import { getSecureItem, setSecureItem } from './secureStorage';
import { log } from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
// const SALT_LENGTH = 32; // Currently unused
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get or create encryption key for this device
 * The key is stored securely and is device-specific
 */
async function getEncryptionKey(): Promise<Buffer | null> {
  try {
    // Try to get existing key
    let keyData = await getSecureItem('encryption_key');
    
    if (!keyData) {
      // Generate new key
      const key = crypto.randomBytes(KEY_LENGTH) as Buffer;
      keyData = key.toString('base64');
      
      // Store key securely
      const stored = await setSecureItem('encryption_key', keyData);
      if (!stored) {
        log.error('Failed to store encryption key');
        return null;
      }
    }
    
    return Buffer.from(keyData, 'base64');
  } catch (error) {
    log.error('Failed to get encryption key', error);
    return null;
  }
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param data - Plain text data to encrypt
 * @returns Encrypted data as base64 string, or original data if encryption fails
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    if (!key) {
      log.error('No encryption key available');
      return data; // Return original data if encryption fails
    }

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH) as Buffer;
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const combined = Buffer.concat([
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    log.error('Encryption error', error);
    return data; // Return original data if encryption fails
  }
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encryptedData - Encrypted data as base64 string
 * @returns Decrypted plain text data, or original data if decryption fails
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    if (!key) {
      log.error('No encryption key available');
      return encryptedData; // Return original data if decryption fails
    }

    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, tag, and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    log.error('Decryption error', error);
    return encryptedData; // Return original data if decryption fails
  }
}

/**
 * Check if a string is encrypted (base64 format check)
 * This is a simple heuristic and may not be 100% accurate
 */
export function isEncrypted(data: string): boolean {
  try {
    // Check if it's valid base64
    const buffer = Buffer.from(data, 'base64');
    // Encrypted data should be at least IV + TAG + some data
    return buffer.length >= IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

