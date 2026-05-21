import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { storePIN, verifyStoredPIN } from '../lib/pinSecurity';
import { encryptData as encrypt, decryptData as decrypt } from '../lib/encryption';
import { log } from '../lib/logger';

interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  encryptionEnabled: boolean;
}

interface SecurityState {
  isAuthenticated: boolean;
  loginAttempts: number;
  lastActivity: number;
  isLocked: boolean;
  lockoutUntil?: number;
}

export function useSecurity() {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    biometricEnabled: false,
    pinEnabled: false,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    encryptionEnabled: true,
  });

  const [securityState, setSecurityState] = useState<SecurityState>({
    isAuthenticated: false,
    loginAttempts: 0,
    lastActivity: Date.now(),
    isLocked: false,
  });

  useEffect(() => {
    loadSecuritySettings();
    checkBiometricAvailability();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionTimeout();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [securitySettings.sessionTimeout]);

  const loadSecuritySettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('security_settings');
      if (settings) {
        setSecuritySettings(JSON.parse(settings));
      }
    } catch (error) {
      log.error('Error loading security settings', error);
    }
  };

  const saveSecuritySettings = async (settings: SecuritySettings) => {
    try {
      await AsyncStorage.setItem('security_settings', JSON.stringify(settings));
      setSecuritySettings(settings);
    } catch (error) {
      log.error('Error saving security settings', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (isAvailable && isEnrolled) {
          setSecuritySettings(prev => ({ ...prev, biometricEnabled: true }));
        }
      } catch (error) {
        log.error('Error checking biometric availability', error);
      }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      if (!securitySettings.biometricEnabled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access the app',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        setSecurityState(prev => ({
          ...prev,
          isAuthenticated: true,
          lastActivity: Date.now(),
          loginAttempts: 0,
        }));
          return true;
        }

        return false;
      } catch (error) {
        log.error('Biometric authentication error', error);
        return false;
      }
  };

  const authenticateWithPIN = async (pin: string): Promise<boolean> => {
    try {
      const isValid = await verifyStoredPIN(pin);
      if (isValid) {
        setSecurityState(prev => ({
          ...prev,
          isAuthenticated: true,
          lastActivity: Date.now(),
          loginAttempts: 0,
        }));
        return true;
      } else {
        setSecurityState(prev => ({
          ...prev,
          loginAttempts: prev.loginAttempts + 1,
        }));
        
        if (securityState.loginAttempts + 1 >= securitySettings.maxLoginAttempts) {
          lockAccount();
        }
        
        return false;
      }
    } catch (error) {
      log.error('PIN authentication error', error);
      return false;
    }
  };

  const setPIN = async (pin: string): Promise<boolean> => {
    try {
      const success = await storePIN(pin);
      if (success) {
        setSecuritySettings(prev => ({ ...prev, pinEnabled: true }));
      }
      return success;
    } catch (error) {
      log.error('Error setting PIN', error);
      return false;
    }
  };

  const lockAccount = () => {
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes
    setSecurityState(prev => ({
      ...prev,
      isLocked: true,
      lockoutUntil: Date.now() + lockoutDuration,
    }));
  };

  const checkSessionTimeout = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - securityState.lastActivity;
    
    if (timeSinceLastActivity > securitySettings.sessionTimeout) {
      setSecurityState(prev => ({
        ...prev,
        isAuthenticated: false,
      }));
    }
  };

  const updateLastActivity = () => {
    setSecurityState(prev => ({
      ...prev,
      lastActivity: Date.now(),
    }));
  };

  const logout = () => {
    setSecurityState(prev => ({
      ...prev,
      isAuthenticated: false,
      lastActivity: 0,
    }));
  };

  const encryptData = async (data: string): Promise<string> => {
    try {
      // Use proper AES-256-GCM encryption
      return await encrypt(data);
    } catch (error) {
      log.error('Encryption error', error);
      return data;
    }
  };

  const decryptData = async (encryptedData: string): Promise<string> => {
    try {
      // Use proper AES-256-GCM decryption
      return await decrypt(encryptedData);
    } catch (error) {
      log.error('Decryption error', error);
      return encryptedData;
    }
  };

  const isAccountLocked = (): boolean => {
    if (!securityState.isLocked) return false;
    
    if (securityState.lockoutUntil && Date.now() < securityState.lockoutUntil) {
      return true;
    }
    
    // Unlock if lockout period has passed
    setSecurityState(prev => ({
      ...prev,
      isLocked: false,
      lockoutUntil: undefined,
    }));
    
    return false;
  };

  const getRemainingLockoutTime = (): number => {
    if (!securityState.lockoutUntil) return 0;
    return Math.max(0, securityState.lockoutUntil - Date.now());
  };

  const getSecurityStatus = () => ({
    isAuthenticated: securityState.isAuthenticated,
    isLocked: isAccountLocked(),
    remainingAttempts: securitySettings.maxLoginAttempts - securityState.loginAttempts,
    lockoutTimeRemaining: getRemainingLockoutTime(),
    biometricAvailable: securitySettings.biometricEnabled,
    pinEnabled: securitySettings.pinEnabled,
  });

  return {
    securitySettings,
    securityState,
    authenticateWithBiometric,
    authenticateWithPIN,
    setPIN,
    updateLastActivity,
    logout,
    encryptData,
    decryptData,
    isAccountLocked,
    getRemainingLockoutTime,
    getSecurityStatus,
    saveSecuritySettings,
  };
}
