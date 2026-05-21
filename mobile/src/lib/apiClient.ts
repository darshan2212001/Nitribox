import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from './config';
import { 
  getSecureItem, 
  setSecureItem, 
  removeSecureItem, 
  SECURE_STORAGE_KEYS 
} from './secureStorage';
import { log } from './logger';

// Safe API base URL with fallback
const getApiBaseUrl = (): string => {
  try {
    return API_BASE_URL || 'http://localhost:8000';
  } catch (error) {
    // Fallback if config fails during bundling
    return 'http://localhost:8000';
  }
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and check network connectivity
apiClient.interceptors.request.use(
  async (config) => {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      const error = new Error('No internet connection') as any;
      error.code = 'NETWORK_ERROR';
      error.config = config;
      return Promise.reject(error);
    }

    try {
      const token = await getSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      log.error('Error getting auth token', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error' || !error.response) {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        error.message = 'No internet connection. Please check your network settings.';
        error.userMessage = 'No internet connection';
        return Promise.reject(error);
      }
      // Connection timeout or server unreachable
      error.message = error.message || 'Unable to reach server. Please try again later.';
      error.userMessage = 'Server unreachable';
      return Promise.reject(error);
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'Request timeout. Please try again.';
      error.userMessage = 'Request timeout';
      return Promise.reject(error);
    }

    // If 401 and not a retry, try refreshing token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Refresh the token
        const refreshResponse = await axios.post(`${getApiBaseUrl()}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken, expires_in } = refreshResponse.data;

        await setSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, access_token);
        if (newRefreshToken) {
          await setSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }
        if (expires_in) {
          const expirationTime = Date.now() + (expires_in * 1000);
          await setSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT, expirationTime.toString());
        }

        // Update the authorization header and retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear storage
        await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
        await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
        await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
        await AsyncStorage.removeItem('user_data');
        return Promise.reject(refreshError);
      }
    }

    // Add user-friendly error messages for common status codes
    if (error.response) {
      switch (error.response.status) {
        case 404:
          error.userMessage = 'Resource not found';
          break;
        case 500:
          error.userMessage = 'Server error. Please try again later.';
          break;
        case 503:
          error.userMessage = 'Service temporarily unavailable';
          break;
        default:
          error.userMessage = error.response.data?.detail || error.message || 'An error occurred';
      }
    }

    return Promise.reject(error);
  }
);

// Utility function for API requests (matching web app pattern)
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  // Check network connectivity first
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    throw new Error('No internet connection. Please check your network settings.');
  }

  const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url.startsWith('/') ? url : '/' + url}`;
  
  const token = await getSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return response;
}

export default apiClient;
