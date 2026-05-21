import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';

/**
 * Wrapper around useQuery with better defaults for error handling, timeouts, and retry logic
 */
export function useSafeQuery<TData = unknown, TError = AxiosError>(
  options: Omit<UseQueryOptions<TData, TError>, 'retry' | 'retryDelay' | 'gcTime'> & {
    timeout?: number;
    enableRetry?: boolean;
  }
): UseQueryResult<TData, TError> {
  const { timeout = 15000, enableRetry = true, ...queryOptions } = options;

  return useQuery<TData, TError>({
    ...queryOptions,
    retry: enableRetry
      ? (failureCount, error: any) => {
          // Don't retry on network errors
          if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('No internet connection')) {
            return false;
          }
          // Don't retry on 401/403 errors
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false;
          }
          // Retry up to 2 times for other errors
          return failureCount < 2;
        }
      : false,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // gcTime is now handled by React Query v5
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes
    // Add timeout handling
    meta: {
      ...queryOptions.meta,
      timeout,
    },
    // Ensure queries don't hang indefinitely
    refetchOnMount: options.refetchOnMount ?? false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: options.refetchOnReconnect ?? true,
  });
}
