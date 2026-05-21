import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { log } from '../lib/logger';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  cacheHitRate: number;
}

interface PerformanceConfig {
  enableMetrics?: boolean;
  logLevel?: 'none' | 'basic' | 'detailed';
  maxCacheSize?: number;
  imageOptimization?: boolean;
}

export function usePerformanceOptimization(config: PerformanceConfig = {}) {
  const {
    enableMetrics = true,
    logLevel = 'basic',
    maxCacheSize = 50,
    imageOptimization = true,
  } = config;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
  });

  const renderStartTime = useRef<number>(0);
  const cache = useRef<Map<string, any>>(new Map());
  const imageCache = useRef<Map<string, string>>(new Map());

  // Performance monitoring
  const startRenderTimer = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderTimer = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({ ...prev, renderTime }));
      
      if (logLevel === 'detailed') {
        log.debug(`Render time: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, [logLevel]);

  // Memory monitoring
  const updateMemoryUsage = useCallback(() => {
    if (Platform.OS === 'web' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);

  // Cache management
  const getCachedData = useCallback((key: string) => {
    const cached = cache.current.get(key);
    if (cached) {
      setMetrics(prev => ({ 
        ...prev, 
        cacheHitRate: prev.cacheHitRate + 1 
      }));
    }
    return cached;
  }, []);

  const setCachedData = useCallback((key: string, data: any) => {
    // Implement LRU cache
    if (cache.current.size >= maxCacheSize) {
      const firstKey = cache.current.keys().next().value;
      if (firstKey) {
        cache.current.delete(firstKey);
      }
    }
    
    const keyStr = key || '';
    cache.current.set(keyStr, {
      data,
      timestamp: Date.now(),
    });
  }, [maxCacheSize]);

  const clearCache = useCallback(() => {
    cache.current.clear();
    imageCache.current.clear();
  }, []);

  // Image optimization
  const optimizeImageUrl = useCallback((url: string, width?: number, height?: number): string => {
    if (!imageOptimization) return url;

    const cached = imageCache.current.get(url);
    if (cached) return cached;

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const targetWidth = width || screenWidth;
    const targetHeight = height || screenHeight;

    // Add image optimization parameters
    const optimizedUrl = `${url}?w=${targetWidth}&h=${targetHeight}&q=80&f=auto`;
    
    imageCache.current.set(url, optimizedUrl);
    return optimizedUrl;
  }, [imageOptimization]);

  // Network performance monitoring
  const measureNetworkLatency = useCallback(async (url: string): Promise<number> => {
    const startTime = performance.now();
    
    try {
      await fetch(url, { method: 'HEAD' });
      const latency = performance.now() - startTime;
      
      setMetrics(prev => ({ ...prev, networkLatency: latency }));
          return latency;
        } catch (error) {
          log.error('Network latency measurement failed', error);
          return 0;
        }
  }, []);

  // Debounced function
  const useDebounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => func(...args), delay);
      return undefined as ReturnType<T>;
    }) as T;
  }, []);

  // Throttled function
  const useThrottle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    const lastCallRef = useRef<number>(0);
    
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        func(...args);
      }
    }) as T;
  }, []);

  // Memoized expensive calculations
  const useMemoizedCalculation = useCallback(<T>(
    calculation: () => T,
    dependencies: any[]
  ): T => {
    return useMemo(calculation, dependencies);
  }, []);

  // Lazy loading hook
  const useLazyLoad = useCallback((
    threshold: number = 0.1
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef<any>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, [threshold]);

    return { elementRef, isVisible };
  }, []);

  // Performance monitoring effect
  useEffect(() => {
    if (!enableMetrics) return;

    const interval = setInterval(() => {
      updateMemoryUsage();
    }, 5000);

    return () => clearInterval(interval);
  }, [enableMetrics, updateMemoryUsage]);

  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    getCachedData,
    setCachedData,
    clearCache,
    optimizeImageUrl,
    measureNetworkLatency,
    useDebounce,
    useThrottle,
    useMemoizedCalculation,
    useLazyLoad,
  };
}

// Hook for virtual scrolling
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length - 1
    );

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
    visibleRange,
  };
}

// Hook for image preloading
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback(async (url: string) => {
    if (loadedImages.has(url) || loadingImages.has(url)) return;

    setLoadingImages(prev => new Set(prev).add(url));

    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      setLoadedImages(prev => new Set(prev).add(url));
    } catch (error) {
      log.error(`Failed to preload image: ${url}`, error);
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  }, [loadedImages, loadingImages]);

  useEffect(() => {
    urls.forEach(url => preloadImage(url));
  }, [urls, preloadImage]);

  return {
    loadedImages,
    loadingImages,
    isImageLoaded: (url: string) => loadedImages.has(url),
    isImageLoading: (url: string) => loadingImages.has(url),
  };
}
