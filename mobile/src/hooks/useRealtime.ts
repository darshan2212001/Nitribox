import { useEffect, useRef } from 'react';
import { mobileWebSocket, REALTIME_EVENTS, RealtimeEventType } from '../lib/websocket';
import { useQueryClient } from '@tanstack/react-query';
import { log } from '../lib/logger';

interface RealtimeConfig {
  events: RealtimeEventType[];
  invalidateQueries?: string[][];
  showToast?: boolean;
}

export function useRealtime(config: RealtimeConfig) {
  const queryClient = useQueryClient();
  const cleanupFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Clear any existing listeners
    cleanupFunctions.current.forEach(cleanup => cleanup());
    cleanupFunctions.current = [];

    // Set up listeners for each event
    config.events.forEach(eventType => {
      const cleanup = mobileWebSocket.on(eventType, (data) => {
        log.debug(`Received ${eventType}`, { data });

        // Invalidate queries if specified
        if (config.invalidateQueries) {
          config.invalidateQueries.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
        }

        // Show toast notification if enabled
        if (config.showToast) {
          // You can integrate with a toast library here
          log.debug(`Toast: ${eventType}`, { data });
        }
      });

      cleanupFunctions.current.push(cleanup);
    });

    // Cleanup function
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, [config.events, config.invalidateQueries, config.showToast, queryClient]);

  return {
    isConnected: mobileWebSocket.isConnected,
    send: mobileWebSocket.send.bind(mobileWebSocket),
    reconnect: mobileWebSocket.reconnect.bind(mobileWebSocket),
  };
}

// Specialized hooks for different portals
export function useKitchenRealtime() {
  return useRealtime({
    events: [
      REALTIME_EVENTS.ORDER_CREATED,
      REALTIME_EVENTS.ORDER_UPDATED,
      REALTIME_EVENTS.KITCHEN_ORDER_ASSIGNED,
      REALTIME_EVENTS.KITCHEN_ORDER_READY,
    ],
    invalidateQueries: [['/api/kitchen/orders']],
    showToast: true,
  });
}

export function useDeliveryRealtime() {
  return useRealtime({
    events: [
      REALTIME_EVENTS.DELIVERY_ASSIGNED,
      REALTIME_EVENTS.DELIVERY_STARTED,
      REALTIME_EVENTS.DELIVERY_COMPLETED,
      REALTIME_EVENTS.ORDER_STATUS_CHANGED,
    ],
    invalidateQueries: [['/api/delivery/orders']],
    showToast: true,
  });
}

export function useNutritionistRealtime() {
  return useRealtime({
    events: [
      REALTIME_EVENTS.CLIENT_PROGRESS_UPDATED,
      REALTIME_EVENTS.SESSION_SCHEDULED,
      REALTIME_EVENTS.MESSAGE,
    ],
    invalidateQueries: [
      ['/api/nutritionist/clients'],
      ['/api/nutritionist/sessions'],
    ],
    showToast: true,
  });
}

export function useAdminRealtime() {
  return useRealtime({
    events: [
      REALTIME_EVENTS.SYSTEM_ALERT,
      REALTIME_EVENTS.USER_ACTIVITY,
      REALTIME_EVENTS.ORDER_CREATED,
      REALTIME_EVENTS.ORDER_UPDATED,
    ],
    invalidateQueries: [
      ['/api/admin/alerts'],
      ['/api/admin/users'],
      ['/api/admin/orders'],
    ],
    showToast: true,
  });
}

export function useClientRealtime() {
  return useRealtime({
    events: [
      REALTIME_EVENTS.ORDER_UPDATED,
      REALTIME_EVENTS.ORDER_STATUS_CHANGED,
      REALTIME_EVENTS.DELIVERY_STARTED,
      REALTIME_EVENTS.DELIVERY_COMPLETED,
      REALTIME_EVENTS.NOTIFICATION,
    ],
    invalidateQueries: [
      ['/api/orders'],
      ['/api/meal-plans'],
    ],
    showToast: true,
  });
}