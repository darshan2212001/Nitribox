import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { API_BASE } from '@/lib/queryClient';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'kitchen' | 'nutritionist' | 'delivery' | 'admin';
  avatar?: string;
  createdAt: string;
}

// LoginRequest interface removed - not used, login function uses direct parameters

interface RegisterRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'client' | 'kitchen' | 'nutritionist' | 'delivery' | 'admin';
}

interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

/** POST /auth/register returns tokens plus nested user (UserResponse with camelCase aliases). */
interface RegisterAuthResponse extends AuthResponse {
  user?: Record<string, unknown>;
}

function mapApiUserPayloadToUser(raw: unknown): User | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : '';
  const name =
    r.name != null ? String(r.name) : r.userName != null ? String(r.userName) : '';
  const email = r.email != null ? String(r.email) : '';
  const phoneVal = r.phone;
  const phone = phoneVal != null && String(phoneVal).length > 0 ? String(phoneVal) : undefined;
  const roleRaw = r.role;
  const role =
    roleRaw === 'kitchen' ||
    roleRaw === 'nutritionist' ||
    roleRaw === 'delivery' ||
    roleRaw === 'admin' ||
    roleRaw === 'client'
      ? roleRaw
      : 'client';
  const createdAt =
    r.createdAt != null
      ? String(r.createdAt)
      : r.created_at != null
        ? String(r.created_at)
        : '';
  if (!id || !email || !createdAt) return null;
  return {
    id,
    name: name || String(r.username ?? ''),
    email,
    phone,
    role,
    createdAt,
  };
}

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
  isTokenExpiringSoon: () => boolean;
}

// Enhanced error handling types
interface AuthError {
  type: 'network' | 'credentials' | 'server' | 'validation' | 'unknown';
  message: string;
  details?: string;
  retryable?: boolean;
  statusCode?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** FastAPI returns detail as string, array of validation errors, or object — normalize for UI */
function formatFastApiDetail(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    try {
      return detail
        .map((d: unknown) => (typeof d === 'object' && d !== null && 'msg' in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
        .join('; ');
    } catch {
      return JSON.stringify(detail);
    }
  }
  if (typeof detail === 'object') return JSON.stringify(detail);
  return String(detail);
}

// Enhanced error categorization
const categorizeAuthError = (error: any, statusCode?: number): AuthError => {
  // Network errors
  if (!navigator.onLine) {
    return {
      type: 'network',
      message: 'No internet connection. Please check your network and try again.',
      details: 'You appear to be offline.',
      retryable: true,
      statusCode: 0
    };
  }

  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return {
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection.',
      details: 'The server may be temporarily unavailable.',
      retryable: true,
      statusCode: 0
    };
  }

  // HTTP status code based errors
  if (statusCode === 401) {
    return {
      type: 'credentials',
      message: 'Invalid username or password. Please check your credentials and try again.',
      details: 'Double-check your username and password for typos.',
      retryable: false,
      statusCode: 401
    };
  }

  if (statusCode === 400) {
    return {
      type: 'validation',
      message: 'Invalid request. Please check your input and try again.',
      details: 'Make sure all required fields are filled correctly.',
      retryable: false,
      statusCode: 400
    };
  }

  if (statusCode === 409) {
    return {
      type: 'validation',
      message: 'Username or email already exists. Please choose different credentials.',
      details: 'Try a different username or email address.',
      retryable: false,
      statusCode: 409
    };
  }

  if (statusCode === 422) {
    return {
      type: 'validation',
      message: 'Invalid data provided. Please check your input.',
      details: 'Make sure all fields meet the requirements.',
      retryable: false,
      statusCode: 422
    };
  }

  if (statusCode === 503 || statusCode === 502 || statusCode === 504) {
    return {
      type: 'server',
      message: error.message || 'Service temporarily unavailable. Please try again.',
      details: 'The API or database may be starting or unreachable.',
      retryable: true,
      statusCode
    };
  }

  if (statusCode && statusCode >= 500) {
    return {
      type: 'server',
      message: error.message || 'Server error occurred. Please try again in a few moments.',
      details: 'Our servers are experiencing issues. We\'re working to fix this.',
      retryable: true,
      statusCode
    };
  }

  // Generic error handling
  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred. Please try again.',
    details: 'If this problem persists, please contact support.',
    retryable: true,
    statusCode
  };
};

// Enhanced fetch with timeout and retry
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    throw error;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user_data');
      
      if (token && user) {
        setAuthState({
          user: JSON.parse(user),
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (username: string, password: string) => {
    const apiBaseUrl = API_BASE;
    try {
      console.log('Starting login process for username:', username);
      console.log('Making request to:', `${apiBaseUrl}/api/auth/login`);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // First, check if backend is reachable and database is usable
      try {
        const healthCheck = await fetchWithTimeout(`${apiBaseUrl}/api/health`, {
          method: 'GET',
        }, 8000); // allow slow cold start / DB probe
        if (!healthCheck.ok) {
          throw new Error(`Health check HTTP ${healthCheck.status}`);
        }
        let healthBody: {
          database?: {
            connected?: boolean;
            ping_ok?: boolean | null;
            ping_error?: string | null;
            current_database?: string | null;
            error?: string | null;
            users_table_ok?: boolean | null;
            auth_error?: string | null;
          };
        } = {};
        try {
          healthBody = await healthCheck.json();
        } catch {
          /* non-JSON response */
        }
        const db = healthBody.database;
        if (db && db.ping_ok === false) {
          const hint = db.ping_error || 'connection test failed';
          console.error('Database ping failed:', hint);
          throw new Error(
            `Database unreachable: ${hint}. Check MySQL is running and DATABASE_URL in .env points to nutribox.`
          );
        }
        if (db && db.connected === false) {
          const hint = db.error || 'Database query failed';
          console.error('Backend is up but database is not connected:', hint);
          throw new Error(
            `Database unavailable: ${hint}. Ensure MySQL is running, DATABASE_URL in .env is correct, and run: alembic upgrade head`
          );
        }
        if (db && db.users_table_ok === false) {
          const hint = db.auth_error || db.error || 'users table not accessible';
          console.error('Auth database probe failed:', hint);
          throw new Error(
            `Login/register blocked: ${hint}. Run: alembic upgrade head (or enable AUTO_CREATE_DB_SCHEMA and restart the API).`
          );
        }
        console.log('Backend health check passed');
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        if (
          healthError instanceof Error &&
          (healthError.message.startsWith('Database unavailable:') ||
            healthError.message.startsWith('Database unreachable:') ||
            healthError.message.startsWith('Login/register blocked:'))
        ) {
          throw healthError;
        }
        throw new Error(
          `Backend not reachable at ${apiBaseUrl}. Start the API (e.g. npm run start:api from the project root) and set VITE_API_URL in client/.env to that URL, then restart the Vite dev server.`,
        );
      }
      
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      }, 15000); // 15 second timeout

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.log('Login error response:', errorData);
        const detailStr = formatFastApiDetail(errorData.detail) || 'Login failed';
        const authError = categorizeAuthError({ message: detailStr }, response.status);
        throw new Error(authError.message);
      }

      const data: AuthResponse = await response.json();
      console.log('Login successful, received token:', data.access_token ? 'Yes' : 'No');
      console.log('Token type:', data.token_type);
      const { access_token, refresh_token, expires_in } = data;
      
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
        console.log('Refresh token stored in localStorage');
      }
      if (expires_in) {
        // Store expiration time (current time + expires_in seconds)
        const expirationTime = Date.now() + (expires_in * 1000);
        localStorage.setItem('token_expires_at', expirationTime.toString());
      }
      console.log('Token stored in localStorage');
      
      // Get user info after successful login
      console.log('Fetching user info from:', `${apiBaseUrl}/api/auth/me`);
      const userResponse = await fetchWithTimeout(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }, 10000); // 10 second timeout
      
      console.log('User info response status:', userResponse.status);
      
      if (userResponse.ok) {
        const user: User = await userResponse.json();
        console.log('User info received:', user);
        localStorage.setItem('user_data', JSON.stringify(user));
        
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
        
        console.log('Authentication state updated successfully');
        
        return { success: true, user };
      } else {
        console.error('Failed to get user info:', userResponse.status);
        // Clear the token if we can't get user info
        localStorage.removeItem('access_token');
        const authError = categorizeAuthError({ message: 'Failed to get user information' }, userResponse.status);
        throw new Error(authError.message);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Clear any stored tokens on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user_data');
      
      // More helpful messages only when we did not already throw a specific one
      let errorMessage = error.message || 'Login failed';
      const specific =
        errorMessage.includes('Backend not reachable at') ||
        errorMessage.includes('Database unavailable:') ||
        errorMessage.includes('Database unreachable:') ||
        errorMessage.includes('Login/register blocked:');
      if (!specific) {
        if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
          errorMessage = `Login timed out. Is the API running at ${apiBaseUrl}?`;
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          errorMessage = `Cannot reach ${apiBaseUrl}. Start the API (npm run start:api) and set VITE_API_URL in client/.env to match, then restart Vite.`;
        }
      }

      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const apiBaseUrl = API_BASE;
      console.log('Starting registration process for:', userData.username);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      }, 15000); // 15 second timeout

      console.log('Registration response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }

        console.log('Registration error response:', errorData);
        const detailStr = formatFastApiDetail(errorData.detail) || 'Registration failed';
        if (response.status === 422) {
          throw new Error(detailStr || 'Please fix the highlighted fields.');
        }
        const authError = categorizeAuthError({ message: detailStr }, response.status);
        throw new Error(authError.message);
      }

      const data = (await response.json()) as RegisterAuthResponse;
      console.log('Registration successful:', data);
      const { access_token, refresh_token, expires_in, user: embeddedRaw } = data;

      if (!access_token) {
        throw new Error('Registration response missing access token');
      }

      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      if (expires_in) {
        const expirationTime = Date.now() + (expires_in * 1000);
        localStorage.setItem('token_expires_at', expirationTime.toString());
      }

      const embedded = mapApiUserPayloadToUser(embeddedRaw);
      if (embedded) {
        localStorage.setItem('user_data', JSON.stringify(embedded));
        setAuthState({
          user: embedded,
          isLoading: false,
          isAuthenticated: true,
        });
        console.log('Authentication state updated successfully after registration (embedded user)');
        return { success: true };
      }

      const userResponse = await fetchWithTimeout(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }, 10000);

      if (userResponse.ok) {
        const fromMe = await userResponse.json();
        const user = mapApiUserPayloadToUser(fromMe);
        if (!user) {
          throw new Error('Failed to get user info after registration');
        }
        localStorage.setItem('user_data', JSON.stringify(user));

        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });

        console.log('Authentication state updated successfully after registration');
        return { success: true };
      }

      throw new Error('Failed to get user info after registration');
    } catch (error: any) {
      console.error('Registration failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Clear any stored tokens on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user_data');
      
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.log('[Auth] No refresh token available');
        return null;
      }

      const apiBaseUrl = API_BASE;
      console.log('[Auth] Attempting to refresh access token');
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }, 10000);

      if (!response.ok) {
        console.log('[Auth] Token refresh failed:', response.status);
        // Clear tokens if refresh fails
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires_at');
        return null;
      }

      const data: AuthResponse = await response.json();
      const { access_token, refresh_token: newRefreshToken, expires_in } = data;

      localStorage.setItem('access_token', access_token);
      if (newRefreshToken) {
        localStorage.setItem('refresh_token', newRefreshToken);
      }
      if (expires_in) {
        const expirationTime = Date.now() + (expires_in * 1000);
        localStorage.setItem('token_expires_at', expirationTime.toString());
      }

      console.log('[Auth] Access token refreshed successfully');
      return access_token;
    } catch (error) {
      console.error('[Auth] Token refresh error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      return null;
    }
  };

  const isTokenExpiringSoon = (): boolean => {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return false;
    
    const expirationTime = parseInt(expiresAt, 10);
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;
    
    // Check if token expires in less than 5 minutes (300000 ms)
    return timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000;
  };

  const logout = async () => {
    try {
      // Try to blacklist refresh token on backend
      const apiBaseUrl = API_BASE;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await fetch(`${apiBaseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch (e) {
          // Ignore logout errors - still clear local storage
          console.log('[Auth] Logout API call failed, clearing local storage anyway');
        }
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user_data');
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      setLocation('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local storage even if API call fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('user_data');
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const apiBaseUrl = API_BASE;
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh user');
      }

      const user: User = await response.json();
      
      localStorage.setItem('user_data', JSON.stringify(user));
      
      setAuthState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  // Set up automatic token refresh check
  useEffect(() => {
    const checkTokenExpiry = async () => {
      const token = localStorage.getItem('access_token');
      if (!token || !authState.isAuthenticated) return;

      // Check if token is expiring soon
      if (isTokenExpiringSoon()) {
        console.log('[Auth] Token expiring soon, refreshing...');
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
