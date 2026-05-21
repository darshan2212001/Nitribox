// Static ES6 imports - Metro will handle these correctly during bundling
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { log } from './logger';

/** Android emulator uses 10.0.2.2 to reach host machine localhost. */
export function resolveApiBase(): string {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
  }
  return process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
}

// Get API URL from environment variables or app.json extra config
// For physical devices, use your computer's IP address (e.g., http://192.168.1.100:8000)
// For emulator/simulator, localhost works
const getApiUrl = (): string => {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && Platform.OS === 'android') {
      return resolveApiBase();
    }
    // Priority 1: Environment variable (for Expo, use EXPO_PUBLIC_* prefix)
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
      const url = process.env.EXPO_PUBLIC_API_URL;
      // Enforce HTTPS in production
      if (typeof __DEV__ !== 'undefined' && !__DEV__ && !url.startsWith('https://')) {
        if (log.error) log.error('API URL must use HTTPS in production', { url });
        throw new Error('API URL must use HTTPS in production. Current: ' + url);
      }
      return url;
    }

    // Priority 2: app.json extra config (only if Constants is available)
    if (Constants?.expoConfig?.extra?.apiUrl) {
      const url = Constants.expoConfig.extra.apiUrl;
      // Enforce HTTPS in production
      if (typeof __DEV__ !== 'undefined' && !__DEV__ && !url.startsWith('https://')) {
        if (log.error) log.error('API URL must use HTTPS in production', { url });
        throw new Error('API URL must use HTTPS in production. Current: ' + url);
      }
      return url;
    }

    // Priority 3: Default based on __DEV__
    // For physical devices, you'll need to replace localhost with your computer's IP
    // Find your IP: Windows: ipconfig, Mac/Linux: ifconfig
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      if (log.warn) log.warn('Using default localhost API URL. For physical devices, set EXPO_PUBLIC_API_URL to your computer\'s IP address');
      return 'http://localhost:8000';
    }
    
    // Production: require HTTPS
    if (log.error) log.error('EXPO_PUBLIC_API_URL environment variable is required in production');
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required in production');
  } catch (error) {
    if (log.error) log.error('Error getting API URL', error);
    // Return safe default in development or during bundling
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      return 'http://localhost:8000';
    }
    throw error;
  }
};

// Get WebSocket URL
const getWebSocketUrl = (): string => {
  try {
    // Priority 1: Environment variable
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WS_URL) {
      const url = process.env.EXPO_PUBLIC_WS_URL;
      // Enforce WSS in production
      if (typeof __DEV__ !== 'undefined' && !__DEV__ && !url.startsWith('wss://')) {
        if (log.error) log.error('WebSocket URL must use WSS in production', { url });
        throw new Error('WebSocket URL must use WSS in production. Current: ' + url);
      }
      return url;
    }

    // Priority 2: app.json extra config (only if Constants is available)
    if (Constants?.expoConfig?.extra?.wsUrl) {
      const url = Constants.expoConfig.extra.wsUrl;
      // Enforce WSS in production
      if (typeof __DEV__ !== 'undefined' && !__DEV__ && !url.startsWith('wss://')) {
        if (log.error) log.error('WebSocket URL must use WSS in production', { url });
        throw new Error('WebSocket URL must use WSS in production. Current: ' + url);
      }
      return url;
    }

    // Priority 3: Derive from API URL
    const apiUrl = getApiUrl();
    if (apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'ws://') + '/ws';
    } else if (apiUrl.startsWith('https://')) {
      return apiUrl.replace('https://', 'wss://') + '/ws';
    }

    // Default (development only or during bundling)
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      if (log.warn) log.warn('Using default localhost WebSocket URL');
      return 'ws://localhost:8000/ws';
    }
    
    // Production: require WSS
    if (log.error) log.error('EXPO_PUBLIC_WS_URL environment variable is required in production');
    throw new Error('EXPO_PUBLIC_WS_URL environment variable is required in production');
  } catch (error) {
    if (log.error) log.error('Error getting WebSocket URL', error);
    // Return safe default in development or during bundling
    if (typeof __DEV__ === 'undefined' || __DEV__) {
      return 'ws://localhost:8000/ws';
    }
    throw error;
  }
};

// Get Google Maps API Key
const getGoogleMapsApiKey = (): string => {
  try {
    // Priority 1: Environment variable (required in production)
    if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    }

    // Priority 2: app.json extra config (for development only, only if Constants is available)
    if (Constants?.expoConfig?.extra?.googleMapsApiKey) {
      if (typeof __DEV__ === 'undefined' || __DEV__) {
        if (log.warn) log.warn('Using Google Maps API key from app.json. Use EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable in production.');
      }
      return Constants?.expoConfig?.extra?.googleMapsApiKey || '';
    }

    // No fallback - throw error in production
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
      if (log.error) log.error('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is required in production');
      throw new Error('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is required in production');
    }

    // Development fallback (will show error in app) or during bundling
    if (log.warn) log.warn('Google Maps API key not found. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.');
    return '';
  } catch (error) {
    if (log.error) log.error('Error getting Google Maps API key', error);
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
      throw error;
    }
    return '';
  }
};

// Safe exports with error handling for bundling
let API_BASE_URL: string;
let WS_URL: string;
let GOOGLE_MAPS_API_KEY: string;

try {
  API_BASE_URL = getApiUrl();
  WS_URL = getWebSocketUrl();
  GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
} catch (error) {
  // Fallback values during bundling or if there's an error
  API_BASE_URL = 'http://localhost:8000';
  WS_URL = 'ws://localhost:8000/ws';
  GOOGLE_MAPS_API_KEY = '';
}

export { API_BASE_URL, WS_URL, GOOGLE_MAPS_API_KEY };

// Log configuration in development (only if not during bundling)
try {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && log.info) {
    log.info('API URL:', { url: API_BASE_URL });
    log.info('WebSocket URL:', { url: WS_URL });
    log.info('Google Maps API Key:', { set: !!GOOGLE_MAPS_API_KEY });
    
    // Warn if using localhost (won't work on physical devices)
    if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
      if (log.warn) {
        log.warn(
          'Using localhost for API URL. This will NOT work on physical devices. ' +
          'For physical devices, set EXPO_PUBLIC_API_URL to your computer\'s IP address ' +
          '(e.g., http://192.168.1.100:8000) or update app.json extra.apiUrl'
        );
      }
    }
  }
} catch (e) {
  // Ignore logging errors during bundling
}
