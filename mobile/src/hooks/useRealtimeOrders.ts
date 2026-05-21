import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mobileWebSocket, REALTIME_EVENTS } from '../lib/websocket';
import { log } from '../lib/logger';

interface OrderUpdate {
  orderId: string;
  status: string;
  timestamp: string;
  message?: string;
}

export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<OrderUpdate[]>([]);

  // Listen for order updates using native WebSocket
  useEffect(() => {
    const handleOrderUpdate = (data: any) => {
      const update: OrderUpdate = {
        orderId: data.orderId || data.id,
        status: data.status || data.order_status,
        timestamp: data.timestamp || new Date().toISOString(),
        message: data.message,
      };
      
      log.debug('Order update received', { update });
      
      // Add to notifications
      setNotifications(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 notifications
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    };

    const handleKitchenUpdate = (data: any) => {
      log.debug('Kitchen update received', { data });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    };

    const handleDeliveryUpdate = (data: any) => {
      log.debug('Delivery update received', { data });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    };

    // Subscribe to real-time events
    const cleanupOrder = mobileWebSocket.on(REALTIME_EVENTS.ORDER_UPDATED, handleOrderUpdate);
    const cleanupOrderStatus = mobileWebSocket.on(REALTIME_EVENTS.ORDER_STATUS_CHANGED, handleOrderUpdate);
    const cleanupKitchen = mobileWebSocket.on(REALTIME_EVENTS.KITCHEN_ORDER_ASSIGNED, handleKitchenUpdate);
    const cleanupKitchenReady = mobileWebSocket.on(REALTIME_EVENTS.KITCHEN_ORDER_READY, handleKitchenUpdate);
    const cleanupDelivery = mobileWebSocket.on(REALTIME_EVENTS.DELIVERY_ASSIGNED, handleDeliveryUpdate);
    const cleanupDeliveryCompleted = mobileWebSocket.on(REALTIME_EVENTS.DELIVERY_COMPLETED, handleDeliveryUpdate);

    // Note: Subscription is handled globally by WebSocketInitializer, no need to subscribe here

    return () => {
      cleanupOrder();
      cleanupOrderStatus();
      cleanupKitchen();
      cleanupKitchenReady();
      cleanupDelivery();
      cleanupDeliveryCompleted();
    };
  }, [queryClient]); // Removed 'user' dependency as subscription is handled globally

  // Emit order status update
  const updateOrderStatus = (orderId: string, status: string, data?: any) => {
    mobileWebSocket.send('update_order_status', {
      orderId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });
  };

  // Emit kitchen status update
  const updateKitchenStatus = (orderId: string, status: string, estimatedTime?: number) => {
    mobileWebSocket.send('update_kitchen_status', {
      orderId,
      status,
      estimatedTime,
      timestamp: new Date().toISOString(),
    });
  };

  // Emit delivery status update
  const updateDeliveryStatus = (orderId: string, status: string, location?: { latitude: number; longitude: number }) => {
    mobileWebSocket.send('update_delivery_status', {
      orderId,
      status,
      location,
      timestamp: new Date().toISOString(),
    });
  };

  // Clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    isConnected: mobileWebSocket.isConnected,
    notifications,
    updateOrderStatus,
    updateKitchenStatus,
    updateDeliveryStatus,
    clearNotifications,
  };
}
