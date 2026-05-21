import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import { User, RegisterRequest, AuthResponse } from '../types';
import { 
  getSecureItem, 
  setSecureItem, 
  removeSecureItem, 
  SECURE_STORAGE_KEYS 
} from '../lib/secureStorage';
import { log } from '../lib/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  isTokenExpiringSoon: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      const refreshToken = await getSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      const user = await AsyncStorage.getItem('user_data'); // User data can stay in AsyncStorage as it's not as sensitive
      
      if (!token || !user) {
        // No tokens found, user is not authenticated
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      // Verify token validity with API
      try {
        const userResponse = await apiClient.get<User>('/api/auth/me');
        const verifiedUser = userResponse.data;
        
        // Token is valid, update user data
        await AsyncStorage.setItem('user_data', JSON.stringify(verifiedUser));
        
        setAuthState({
          user: verifiedUser,
          isLoading: false,
          isAuthenticated: true,
        });
        
        // Check if token is expiring soon and refresh if needed (async, non-blocking)
        try {
          const expiresAt = await getSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
          if (expiresAt) {
            const expirationTime = parseInt(expiresAt, 10);
            const now = Date.now();
            const timeUntilExpiry = expirationTime - now;
            
            // Check if token expires in less than 5 minutes
            if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000 && refreshToken) {
              log.debug('Token expiring soon, refreshing...');
              refreshAccessToken().catch(error => log.error('Token refresh failed', error));
            }
          }
        } catch (e) {
          // Ignore error, continue with auth state
        }
      } catch (verifyError: any) {
        // Token verification failed
        log.warn('Token verification failed', { status: verifyError.response?.status, message: verifyError.message });
        
        // If 401, try refreshing token
        if (verifyError.response?.status === 401 && refreshToken) {
          try {
            log.debug('Attempting to refresh expired token...');
            const newToken = await refreshAccessToken();
            if (newToken) {
              // Retry user fetch with new token
              const userResponse = await apiClient.get<User>('/api/auth/me');
              const verifiedUser = userResponse.data;
              await AsyncStorage.setItem('user_data', JSON.stringify(verifiedUser));
              
              setAuthState({
                user: verifiedUser,
                isLoading: false,
                isAuthenticated: true,
              });
              return;
            }
          } catch (refreshErr) {
            log.error('Token refresh failed during auth check', refreshErr);
          }
        }
        
        // Verification or refresh failed, clear tokens and logout
        await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
        await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
        await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
        await AsyncStorage.removeItem('user_data');
        
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      log.error('Auth check failed', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiClient.post<AuthResponse>('/api/auth/login', {
        username,
        password,
      });
      
      const { access_token, refresh_token, expires_in } = response.data;
      
      await setSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, access_token);
      if (refresh_token) {
        await setSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      }
      if (expires_in) {
        const expirationTime = Date.now() + (expires_in * 1000);
        await setSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT, expirationTime.toString());
      }
      
      // Get user info after successful login
      const userResponse = await apiClient.get<User>('/api/auth/me');
      const user = userResponse.data;
      
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      // Navigate based on user role
      if (user.role === 'client') {
        router.replace('/(tabs)');
      } else if (user.role === 'kitchen') {
        router.replace('/(kitchen)');
      } else if (user.role === 'delivery') {
        router.replace('/(delivery)');
      } else if (user.role === 'nutritionist') {
        router.replace('/(nutritionist)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      }
      
      return { success: true };
    } catch (error: any) {
      log.error('Login failed', error, { username });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Clear any stored tokens on error
      await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
      await AsyncStorage.removeItem('user_data');
      
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await apiClient.post<AuthResponse>('/api/auth/register', userData);
      
      const { access_token, refresh_token, expires_in } = response.data;
      
      await setSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, access_token);
      if (refresh_token) {
        await setSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
      }
      if (expires_in) {
        const expirationTime = Date.now() + (expires_in * 1000);
        await setSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT, expirationTime.toString());
      }
      
      // Get user info after successful registration
      const userResponse = await apiClient.get<User>('/api/auth/me');
      const user = userResponse.data;
      
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      
      // Navigate based on user role
      if (user.role === 'client') {
        router.replace('/(tabs)');
      } else if (user.role === 'kitchen') {
        router.replace('/(kitchen)');
      } else if (user.role === 'delivery') {
        router.replace('/(delivery)');
      } else if (user.role === 'nutritionist') {
        router.replace('/(nutritionist)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      }
      
      return { success: true };
    } catch (error: any) {
      log.error('Registration failed', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Clear any stored tokens on error
      await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
      await AsyncStorage.removeItem('user_data');
      
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const refreshToken = await getSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        log.debug('No refresh token available');
        return null;
      }

      log.debug('Attempting to refresh access token');
      const response = await apiClient.post<AuthResponse>('/api/auth/refresh', {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;

      await setSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, access_token);
      if (newRefreshToken) {
        await setSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }
      if (expires_in) {
        const expirationTime = Date.now() + (expires_in * 1000);
        await setSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT, expirationTime.toString());
      }

      log.debug('Access token refreshed successfully');
      return access_token;
    } catch (error: any) {
      log.error('Token refresh error', error);
      await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
      return null;
    }
  };

  const isTokenExpiringSoon = async (): Promise<boolean> => {
    try {
      const expiresAt = await getSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
      if (!expiresAt) return false;
      
      const expirationTime = parseInt(expiresAt, 10);
      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;
      
      // Check if token expires in less than 5 minutes (300000 ms)
      return timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      log.error('Error checking token expiry', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Try to blacklist refresh token on backend
      const refreshToken = await getSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        try {
          await apiClient.post('/api/auth/logout', {
            refresh_token: refreshToken,
          });
        } catch (e) {
          // Ignore logout errors - still clear local storage
          log.warn('Logout API call failed, clearing local storage anyway');
        }
      }

      await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
      await AsyncStorage.removeItem('user_data');
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      router.replace('/(auth)/login');
    } catch (error) {
      log.error('Logout failed', error);
      // Clear local storage even if API call fails
      await removeSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN);
      await removeSecureItem(SECURE_STORAGE_KEYS.TOKEN_EXPIRES_AT);
      await AsyncStorage.removeItem('user_data');
    }
  };

  const refreshUser = async () => {
    try {
      const token = await getSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return;

      // Try to refresh token if expiring soon
      const isExpiring = await isTokenExpiringSoon();
      if (isExpiring) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          await logout();
          return;
        }
      }

      try {
        const response = await apiClient.get<User>('/api/auth/me');
        const user = response.data;
        
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
        
        setAuthState(prev => ({
          ...prev,
          user,
        }));
      } catch (error: any) {
        // If 401, try refreshing token once more
        if (error.response?.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            // Retry with new token
            const retryResponse = await apiClient.get<User>('/api/auth/me');
            const user = retryResponse.data;
            
            await AsyncStorage.setItem('user_data', JSON.stringify(user));
            
            setAuthState(prev => ({
              ...prev,
              user,
            }));
            return;
          }
        }
        throw error;
      }
    } catch (error) {
      log.error('Failed to refresh user', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  // Set up automatic token refresh check
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const checkTokenExpiry = async () => {
      const token = await getSecureItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return;

      // Check if token is expiring soon
      const isExpiring = await isTokenExpiringSoon();
      if (isExpiring) {
        log.debug('Token expiring soon, refreshing...');
        const newToken = await refreshAccessToken();
        if (!newToken) {
          // Refresh failed, logout user
          await logout();
        }
      }
    };

    // Check token expiry every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    checkTokenExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshUser,
    refreshAccessToken,
    isTokenExpiringSoon,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
