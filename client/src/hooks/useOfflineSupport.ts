import { useState, useEffect, useCallback } from 'react';

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface OfflineConfig {
  maxAge?: number;
  maxItems?: number;
  autoSync?: boolean;
}

export function useOfflineSupport(config: OfflineConfig = {}) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  const {
    maxAge = 24 * 60 * 60 * 1000, // 24 hours
    maxItems = 100,
    autoSync = true,
  } = config;

  useEffect(() => {
    // Check initial network status
    checkNetworkStatus();

    // Listen for network changes
    const handleOnline = () => {
      const wasOffline = !isOnline;
      setIsOnline(true);

      // If we just came back online, sync pending data
      if (wasOffline && autoSync) {
        syncPendingData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, autoSync]);

  const checkNetworkStatus = async () => {
    try {
      setIsOnline(navigator.onLine);
    } catch (error) {
      console.error('Error checking network status:', error);
    }
  };

  const storeOfflineData = async (key: string, data: any, customExpiry?: number): Promise<boolean> => {
    try {
      const offlineData: OfflineData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: customExpiry || (Date.now() + maxAge),
      };

      localStorage.setItem(`offline_${key}`, JSON.stringify(offlineData));
      
      // Clean up old data
      await cleanupOldData();
      
      return true;
    } catch (error) {
      console.error('Error storing offline data:', error);
      return false;
    }
  };

  const getOfflineData = async (key: string): Promise<any | null> => {
    try {
      const stored = localStorage.getItem(`offline_${key}`);
      if (!stored) return null;

      const offlineData: OfflineData = JSON.parse(stored);
      
      // Check if data has expired
      if (Date.now() > offlineData.expiresAt) {
        localStorage.removeItem(`offline_${key}`);
        return null;
      }

      return offlineData.data;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  };

  const queueOfflineAction = async (action: {
    id: string;
    endpoint: string;
    method: string;
    data?: any;
    headers?: Record<string, string>;
  }): Promise<boolean> => {
    try {
      const stored = localStorage.getItem('pending_actions');
      const actions = stored ? JSON.parse(stored) : [];
      
      actions.push({
        ...action,
        timestamp: Date.now(),
      });

      // Keep only the most recent actions
      const recentActions = actions.slice(-maxItems);
      
      localStorage.setItem('pending_actions', JSON.stringify(recentActions));
      setPendingActions(recentActions);
      
      return true;
    } catch (error) {
      console.error('Error queuing offline action:', error);
      return false;
    }
  };

  const syncPendingData = async (): Promise<boolean> => {
    if (!isOnline || isSyncing) return false;

    setIsSyncing(true);
    
    try {
      const stored = localStorage.getItem('pending_actions');
      if (!stored) return true;

      const actions = JSON.parse(stored);
      const successfulActions: string[] = [];
      
      for (const action of actions) {
        try {
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
              ...action.headers,
            },
            body: action.data ? JSON.stringify(action.data) : undefined,
          });

          if (response.ok) {
            successfulActions.push(action.id);
          }
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
        }
      }

      // Remove successful actions
      const remainingActions = actions.filter(
        (action: any) => !successfulActions.includes(action.id)
      );
      
      localStorage.setItem('pending_actions', JSON.stringify(remainingActions));
      setPendingActions(remainingActions);
      
      return true;
    } catch (error) {
      console.error('Error syncing pending data:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const cleanupOldData = async () => {
    try {
      const keys = Object.keys(localStorage);
      const offlineKeys = keys.filter(key => key.startsWith('offline_'));
      
      for (const key of offlineKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const offlineData: OfflineData = JSON.parse(stored);
          if (Date.now() > offlineData.expiresAt) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  };

  const clearOfflineData = async (key?: string) => {
    try {
      if (key) {
        localStorage.removeItem(`offline_${key}`);
      } else {
        const keys = Object.keys(localStorage);
        const offlineKeys = keys.filter(key => key.startsWith('offline_'));
        offlineKeys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  const getOfflineDataSize = (): number => {
    try {
      const keys = Object.keys(localStorage);
      const offlineKeys = keys.filter(key => key.startsWith('offline_'));
      return offlineKeys.length;
    } catch (error) {
      console.error('Error getting offline data size:', error);
      return 0;
    }
  };

  return {
    isOnline,
    isSyncing,
    pendingActions,
    storeOfflineData,
    getOfflineData,
    queueOfflineAction,
    syncPendingData,
    clearOfflineData,
    getOfflineDataSize,
  };
}

// Hook for offline-first data fetching
export function useOfflineQuery<T>(
  queryKey: string,
  fetchFn: () => Promise<T>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    enabled?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 30 * 60 * 1000, // 30 minutes
    enabled = true,
  } = options;

  const { isOnline, storeOfflineData, getOfflineData } = useOfflineSupport();

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to get cached data first
      if (!forceRefresh) {
        const cachedData = await getOfflineData(queryKey);
        if (cachedData && lastFetch && (Date.now() - lastFetch) < staleTime) {
          setData(cachedData);
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const freshData = await fetchFn();
      setData(freshData);
      setLastFetch(Date.now());

      // Store in offline cache
      await storeOfflineData(queryKey, freshData, Date.now() + cacheTime);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);

      // Try to get stale data if available
      const staleData = await getOfflineData(queryKey);
      if (staleData) {
        setData(staleData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryKey, fetchFn, enabled, staleTime, cacheTime, lastFetch, storeOfflineData, getOfflineData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => fetchData(true);

  return {
    data,
    isLoading,
    error,
    refetch,
    isOffline: !isOnline,
  };
}
