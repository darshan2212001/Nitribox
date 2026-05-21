import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Image } from 'react-native';

// Memoization utilities
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

// Image optimization
export function optimizeImage(uri: string, _width?: number, _height?: number): string {
  // In a real implementation, you would use a service like Cloudinary or ImageKit
  // For now, return the original URI
  return uri;
}

export function preloadImages(uris: string[]): Promise<void[]> {
  return Promise.all(
    uris.map(uri => 
      new Promise<void>((resolve, reject) => {
        Image.prefetch(uri)
          .then(() => resolve())
          .catch(reject);
      })
    )
  );
}

// Debounce utility
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle utility
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [lastCall, setLastCall] = useState(0);

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        setLastCall(now);
        return callback(...args);
      }
    }) as T,
    [callback, delay, lastCall]
  );
}

// Lazy loading hook
export function useLazyLoading<T>(
  data: T[],
  pageSize: number = 10
): {
  visibleData: T[];
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
} {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [isLoading, setIsLoading] = useState(false);

  const visibleData = useMemo(() => {
    return data.slice(0, visibleCount);
  }, [data, visibleCount]);

  const hasMore = visibleCount < data.length;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setIsLoading(true);
      
      // Simulate loading delay
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + pageSize, data.length));
        setIsLoading(false);
      }, 500);
    }
  }, [hasMore, isLoading, pageSize, data.length]);

  return {
    visibleData,
    loadMore,
    hasMore,
    isLoading,
  };
}

// Network optimization
export function useNetworkOptimization() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'unknown'>('unknown');

  useEffect(() => {
    // Mock network status - in real app, use NetInfo
    const checkConnection = () => {
      setIsOnline(Math.random() > 0.1); // 90% online
      setConnectionType(Math.random() > 0.5 ? 'wifi' : 'cellular');
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const shouldUseHighQuality = useMemo(() => {
    return isOnline && connectionType === 'wifi';
  }, [isOnline, connectionType]);

  const getImageQuality = useCallback(() => {
    if (!isOnline) return 0.3;
    if (connectionType === 'cellular') return 0.6;
    return 0.8;
  }, [isOnline, connectionType]);

  return {
    isOnline,
    connectionType,
    shouldUseHighQuality,
    getImageQuality,
  };
}

// Cache management
export class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  set(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
  });

  const startTime = useMemo(() => Date.now(), []);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(prev => ({
        ...prev,
        renderTime: Date.now() - startTime,
        memoryUsage: Math.random() * 100, // Mock memory usage
        componentCount: prev.componentCount + 1,
      }));
    };

    updateMetrics();
  }, [startTime]);

  return metrics;
}

// Bundle size optimization
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc as any);
}

// Example usage:
// const LazyHeavyComponent = createLazyComponent(() => import('./HeavyComponent'));

// Memory management
export function useMemoryOptimization() {
  const [isLowMemory, setIsLowMemory] = useState(false);

  useEffect(() => {
    const checkMemory = () => {
      // Mock memory check
      const memoryPressure = Math.random();
      setIsLowMemory(memoryPressure > 0.8);
    };

    checkMemory();
    const interval = setInterval(checkMemory, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const shouldOptimizeImages = useMemo(() => isLowMemory, [isLowMemory]);
  const shouldReduceAnimations = useMemo(() => isLowMemory, [isLowMemory]);

  return {
    isLowMemory,
    shouldOptimizeImages,
    shouldReduceAnimations,
  };
}

// Performance tips for React Native
export const performanceTips = {
  // Use FlatList for large lists
  useFlatList: 'Use FlatList instead of ScrollView for large lists',
  
  // Optimize images
  optimizeImages: 'Use appropriate image sizes and formats',
  
  // Avoid unnecessary re-renders
  avoidRerenders: 'Use React.memo, useMemo, and useCallback appropriately',
  
  // Lazy load components
  lazyLoad: 'Lazy load heavy components and screens',
  
  // Optimize navigation
  optimizeNavigation: 'Use proper navigation patterns and avoid deep nesting',
  
  // Memory management
  memoryManagement: 'Clean up subscriptions and timers in useEffect cleanup',
};

export default {
  useMemoizedCallback,
  useMemoizedValue,
  optimizeImage,
  preloadImages,
  useDebounce,
  useThrottle,
  useLazyLoading,
  useNetworkOptimization,
  usePerformanceMonitor,
  useMemoryOptimization,
  SimpleCache,
  performanceTips,
};
