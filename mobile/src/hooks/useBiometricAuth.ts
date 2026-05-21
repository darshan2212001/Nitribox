import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { log } from '../lib/logger';

interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: LocalAuthentication.AuthenticationType;
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [biometryType, setBiometryType] = useState<LocalAuthentication.AuthenticationType | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [supportedTypes, setSupportedTypes] = useState<LocalAuthentication.AuthenticationType[]>([]);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setIsAvailable(compatible);
      setIsEnrolled(enrolled);
      setSupportedTypes(types);
      
      if (types.length > 0) {
        setBiometryType(types[0]);
      }
    } catch (error) {
      log.error('Error checking biometric availability', error);
    }
  };

  const authenticate = async (reason?: string): Promise<BiometricAuthResult> => {
    try {
      if (!isAvailable) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      if (!isEnrolled) {
        return { success: false, error: 'No biometric data enrolled' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to continue',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { 
          success: true, 
          biometryType: supportedTypes[0] || biometryType || null
        };
      } else {
        return { 
          success: false, 
          error: result.error || 'Authentication failed' 
          };
        }
      } catch (error) {
        log.error('Biometric authentication error', error);
        return { 
          success: false, 
          error: 'Authentication error occurred' 
        };
      }
  };

  const getBiometryTypeName = (type: LocalAuthentication.AuthenticationType): string => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Touch ID';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  };

  const promptToEnableBiometrics = () => {
    const biometryName = biometryType ? getBiometryTypeName(biometryType) : 'Biometric';
    
    Alert.alert(
      'Enable Biometric Authentication',
      `Would you like to enable ${biometryName} for faster and more secure login?`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
          {
            text: 'Enable',
            onPress: () => {
              // Navigate to settings or show enrollment flow
              log.debug('User wants to enable biometrics');
            },
          },
      ]
    );
  };

  return {
    isAvailable,
    isEnrolled,
    biometryType,
    authenticate,
    getBiometryTypeName,
    promptToEnableBiometrics,
    checkBiometricAvailability,
  };
}

// Hook for secure storage with biometric protection
export function useSecureStorage() {
  const { authenticate, isAvailable } = useBiometricAuth();
  const { setSecureItem, getSecureItem, removeSecureItem } = require('../lib/secureStorage');

  const storeSecurely = async (key: string, value: string, requireAuth: boolean = true): Promise<boolean> => {
    try {
      if (requireAuth && isAvailable) {
        const authResult = await authenticate('Authenticate to store secure data');
        if (!authResult.success) {
          return false;
        }
      }

      // Store in secure storage with optional biometric requirement
      const options = requireAuth && isAvailable ? {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to store secure data'
      } : undefined;
      
      return await setSecureItem(key, value, options);
    } catch (error) {
      log.error('Error storing secure data', error);
      return false;
    }
  };

  const retrieveSecurely = async (key: string, requireAuth: boolean = true): Promise<string | null> => {
    try {
      if (requireAuth && isAvailable) {
        const authResult = await authenticate('Authenticate to access secure data');
        if (!authResult.success) {
          return null;
        }
      }

      // Retrieve from secure storage with optional biometric requirement
      const options = requireAuth && isAvailable ? {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access secure data'
      } : undefined;
      
      return await getSecureItem(key, options);
    } catch (error) {
      log.error('Error retrieving secure data', error);
      return null;
    }
  };

  const removeSecurely = async (key: string, requireAuth: boolean = true): Promise<boolean> => {
    try {
      if (requireAuth && isAvailable) {
        const authResult = await authenticate('Authenticate to remove secure data');
        if (!authResult.success) {
          return false;
        }
      }

      return await removeSecureItem(key);
    } catch (error) {
      log.error('Error removing secure data', error);
      return false;
    }
  };

  return {
    storeSecurely,
    retrieveSecurely,
    removeSecurely,
  };
}

// Hook for biometric login
export function useBiometricLogin() {
  const { authenticate, isAvailable, isEnrolled } = useBiometricAuth();

  const loginWithBiometrics = async (): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      if (!isAvailable || !isEnrolled) {
        return { 
          success: false, 
          error: 'Biometric authentication not available or not enrolled' 
        };
      }

      const authResult = await authenticate('Login to your account');
      
      if (!authResult.success) {
        return { 
          success: false, 
          error: authResult.error || 'Biometric authentication failed' 
        };
      }

      // Call your authentication API with biometric verification
      const response = await fetch('/api/auth/biometric-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          biometryType: authResult.biometryType,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Biometric login failed');
      }

      const data = await response.json();
      
      return {
        success: true,
        token: data.token,
      };
    } catch (error) {
      log.error('Biometric login error', error);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    }
  };

  return {
    loginWithBiometrics,
    isBiometricAvailable: isAvailable && isEnrolled,
  };
}
