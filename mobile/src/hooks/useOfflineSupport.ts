import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

interface OfflineConfig {
  maxAge?: number; // in milliseconds
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
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected ?? false;
      
      setIsOnline(isNowOnline);

      // If we just came back online, sync pending data
      if (wasOffline && isNowOnline && autoSync) {
        syncPendingData();
      }
    });

    return unsubscribe;
  }, [isOnline, autoSync]);

  const checkNetworkStatus = async () => {
    try {
      const state = await NetInfo.fetch();
      setIsOnline(state.isConnected ?? false);
        } catch (error) {
          log.error('Error checking network status', error);
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

      await AsyncStorage.setItem(`offline_${key}`, JSON.stringify(offlineData));
      
      // Clean up old data
      await cleanupOldData();
      
          return true;
        } catch (error) {
          log.error('Error storing offline data', error);
          return false;
        }
  };

  const getOfflineData = async (key: string): Promise<any | null> => {
    try {
      const stored = await AsyncStorage.getItem(`offline_${key}`);
      if (!stored) return null;

      const offlineData: OfflineData = JSON.parse(stored);
      
      // Check if data has expired
      if (offlineData.expiresAt && Date.now() > offlineData.expiresAt) {
        await AsyncStorage.removeItem(`offline_${key}`);
        return null;
      }

          return offlineData.data;
        } catch (error) {
          log.error('Error retrieving offline data', error);
          return null;
        }
  };

  const queueOfflineAction = async (action: {
    type: string;
    endpoint: string;
    method: string;
    data?: any;
    headers?: any;
  }) => {
    try {
      const pendingAction = {
        ...action,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      const existingActions = await AsyncStorage.getItem('pending_actions');
      const actions = existingActions ? JSON.parse(existingActions) : [];
      
      actions.push(pendingAction);
      
      await AsyncStorage.setItem('pending_actions', JSON.stringify(actions));
      setPendingActions(actions);
      
          return true;
        } catch (error) {
          log.error('Error queuing offline action', error);
          return false;
        }
  };

  const syncPendingData = async (): Promise<boolean> => {
    if (!isOnline || isSyncing) return false;

    setIsSyncing(true);
    
    try {
      const stored = await AsyncStorage.getItem('pending_actions');
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
              log.error(`Failed to sync action ${action.id}`, error);
            }
      }

      // Remove successful actions
      const remainingActions = actions.filter(
        (action: any) => !successfulActions.includes(action.id)
      );
      
      await AsyncStorage.setItem('pending_actions', JSON.stringify(remainingActions));
      setPendingActions(remainingActions);
      
          return true;
        } catch (error) {
          log.error('Error syncing pending data', error);
          return false;
        } finally {
      setIsSyncing(false);
    }
  };

  const cleanupOldData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith('offline_'));
      
      if (offlineKeys.length > maxItems) {
        // Sort by timestamp and remove oldest
        const dataWithTimestamps = await Promise.all(
          offlineKeys.map(async (key) => {
            const stored = await AsyncStorage.getItem(key);
            const data = stored ? JSON.parse(stored) : null;
            return { key, timestamp: data?.timestamp || 0 };
          })
        );

        dataWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
        
        const keysToRemove = dataWithTimestamps
          .slice(0, offlineKeys.length - maxItems)
          .map(item => item.key);

            await AsyncStorage.multiRemove(keysToRemove);
          }
        } catch (error) {
          log.error('Error cleaning up old data', error);
        }
  };

  const clearOfflineData = async (): Promise<boolean> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('offline_') || key === 'pending_actions'
      );
      
      await AsyncStorage.multiRemove(offlineKeys);
      setPendingActions([]);
      
          return true;
        } catch (error) {
          log.error('Error clearing offline data', error);
          return false;
        }
  };

  const getOfflineDataSize = async (): Promise<number> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => key.startsWith('offline_'));
          return offlineKeys.length;
        } catch (error) {
          log.error('Error getting offline data size', error);
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

  const { storeOfflineData, getOfflineData } = useOfflineSupport();

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
    isStale: lastFetch ? (Date.now() - lastFetch) > staleTime : true,
  };
}
