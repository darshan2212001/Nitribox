import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to refresh access token
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.log('[API] No refresh token available');
      return null;
    }

    const apiBaseUrl = API_BASE;
    console.log('[API] Attempting to refresh access token');
    
    const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      console.log('[API] Token refresh failed:', response.status);
      // Clear tokens if refresh fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      return null;
    }

    const data = await response.json();
    const { access_token, refresh_token: newRefreshToken, expires_in } = data;

    localStorage.setItem('access_token', access_token);
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
    }
    if (expires_in) {
      const expirationTime = Date.now() + (expires_in * 1000);
      localStorage.setItem('token_expires_at', expirationTime.toString());
    }

    console.log('[API] Access token refreshed successfully');
    return access_token;
  } catch (error) {
    console.error('[API] Token refresh error:', error);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryOn401: boolean = true,
): Promise<Response> {
  // Add base URL for API calls
  const baseUrl = API_BASE;
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  // Get auth token from localStorage
  let token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  // If 401 and retryOn401 is true, try to refresh token and retry once
  if (res.status === 401 && retryOn401) {
    console.log('[API] Received 401, attempting token refresh...');
    // Clone response to read error message before refreshing
    const errorText = await res.clone().text().catch(() => res.statusText);
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Retry the request with the new token
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(fullUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });
    } else {
      // Token refresh failed, throw error with original error message
      throw new Error(`401: ${errorText || res.statusText}`);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add base URL for API calls
    const baseUrl = API_BASE;
    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    // Get auth token from localStorage
    let token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    let res = await fetch(fullUrl, {
      headers,
    });

    // If 401, try to refresh token and retry (unless returnNull behavior)
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      console.log('[QueryFn] Received 401, attempting token refresh...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Retry the request with the new token
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(fullUrl, {
          headers,
        });
      } else {
        // Token refresh failed, throw error
        const errorText = await res.clone().text().catch(() => res.statusText);
        throw new Error(`401: ${errorText || res.statusText}`);
      }
    }

    // Handle 404 errors gracefully when using returnNull behavior
    if (res.status === 404 && unauthorizedBehavior === "returnNull") {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity
      retry: (failureCount, error) => {
        // Don't retry on 401 errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on 401 errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});