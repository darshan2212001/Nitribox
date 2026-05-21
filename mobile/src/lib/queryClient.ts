import { QueryClient, QueryFunction } from '@tanstack/react-query';
import apiClient from './apiClient';

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL from query key
    const pathParts = queryKey.filter((part): part is string => typeof part === 'string');
    const url = pathParts.join("/") as string;
    
    try {
      const response = await apiClient.get(url);
      
      // Check for 401 if needed
      if (unauthorizedBehavior === "returnNull" && response.status === 401) {
        return null;
      }

      return response.data;
    } catch (error: any) {
      // Handle 401 errors
      if (unauthorizedBehavior === "returnNull" && error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: (failureCount, error: any) => {
        // Don't retry on network errors if offline
        if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('No internet connection')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnMount: false, // Don't refetch if data is fresh
      refetchOnWindowFocus: false, // Don't refetch on window focus in mobile
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1, // Retry mutations once
    },
  },
});
