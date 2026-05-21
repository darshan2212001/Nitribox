import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../lib/config';
import { log } from '../lib/logger';

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
  endpoint: string;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineData();
    }
  }, [isOnline, offlineQueue.length]);

  const addToOfflineQueue = async (data: Omit<OfflineData, 'timestamp'>) => {
    const offlineData: OfflineData = {
      ...data,
      timestamp: Date.now(),
    };

    const newQueue = [...offlineQueue, offlineData];
    setOfflineQueue(newQueue);
    
    // Store in AsyncStorage
    await AsyncStorage.setItem('offline_queue', JSON.stringify(newQueue));
  };

  const syncOfflineData = async () => {
    if (isSyncing || offlineQueue.length === 0) return;

    setIsSyncing(true);

    try {
      for (const item of offlineQueue) {
        await syncOfflineItem(item);
      }

      // Clear queue after successful sync
      setOfflineQueue([]);
      await AsyncStorage.removeItem('offline_queue');
        } catch (error) {
          log.error('Failed to sync offline data', error);
        } finally {
      setIsSyncing(false);
    }
  };

  const syncOfflineItem = async (item: OfflineData) => {
    try {
      const endpoint = item.endpoint.startsWith('/') ? item.endpoint : `/${item.endpoint}`;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: item.action === 'delete' ? 'DELETE' : 
                item.action === 'update' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

          return await response.json();
        } catch (error) {
          log.error(`Failed to sync item ${item.key}`, error);
          throw error;
        }
  };

  const getOfflineData = async (key: string) => {
    try {
      const data = await AsyncStorage.getItem(`offline_${key}`);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        log.error('Failed to get offline data', error);
        return null;
      }
  };

  const setOfflineData = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(`offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        }));
      } catch (error) {
        log.error('Failed to set offline data', error);
      }
  };

  const clearOfflineData = async (key: string) => {
    try {
        await AsyncStorage.removeItem(`offline_${key}`);
      } catch (error) {
        log.error('Failed to clear offline data', error);
      }
  };

  const retryFailedSync = async () => {
    if (isOnline) {
      await syncOfflineData();
    }
  };

  const getOfflineStatus = () => ({
    isOnline,
    isOffline: !isOnline,
    queueLength: offlineQueue.length,
    isSyncing,
  });

  return {
    isOnline,
    isOffline: !isOnline,
    offlineQueue,
    isSyncing,
    addToOfflineQueue,
    syncOfflineData,
    getOfflineData,
    setOfflineData,
    clearOfflineData,
    retryFailedSync,
    getOfflineStatus,
  };
}
