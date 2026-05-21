// Import WebSocket URL from config
import { WS_URL } from './config';
import NetInfo from '@react-native-community/netinfo';
import { log } from './logger';

// Connection status types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// WebSocket client for real-time features in mobile app
export class MobileWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnecting = false;
  private shouldReconnect = true;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  // private autoConnect = false; // Don't auto-connect on instantiation (currently unused)
  private netInfoUnsubscribe: (() => void) | null = null; // Track NetInfo listener for cleanup

  constructor(private url: string) {
    // Don't auto-connect - wait for explicit connect() call after authentication
  }

  async connect() {
    if (this.isConnecting || this.connectionStatus === 'connected') {
      return;
    }

    // Check network connectivity first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      log.warn('No network connection, skipping WebSocket connect');
      this.setConnectionStatus('error');
      return;
    }
    
    this.isConnecting = true;
    this.setConnectionStatus('connecting');
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        log.info('WebSocket connected', { url: this.url });
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.setConnectionStatus('connected');
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (error) {
          log.error('WebSocket parse error', error);
        }
      };

      this.ws.onerror = (error) => {
        log.error('WebSocket error', error);
        this.isConnecting = false;
        this.setConnectionStatus('error');
      };

      this.ws.onclose = (event) => {
        log.info('WebSocket disconnected', { code: event.code, reason: event.reason });
        this.isConnecting = false;
        this.setConnectionStatus('disconnected');
        
        // Only attempt reconnect if it wasn't a manual close and we should reconnect
        if (this.shouldReconnect && event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      log.error('WebSocket connection error', error);
      this.isConnecting = false;
      this.setConnectionStatus('error');
      this.attemptReconnect();
    }
  }

  private setConnectionStatus(status: ConnectionStatus) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    
    // Return cleanup function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private async attemptReconnect() {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        log.error('Max WebSocket reconnection attempts reached');
        this.setConnectionStatus('error');
      }
      return;
    }

    // Check network connectivity before attempting reconnect
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      log.warn('No network connection, will retry WebSocket when network is available');
      // Set up listener for network state changes
      // Clean up any existing listener first
      if (this.netInfoUnsubscribe) {
        this.netInfoUnsubscribe();
      }
      
      this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && this.shouldReconnect) {
          if (this.netInfoUnsubscribe) {
            this.netInfoUnsubscribe();
            this.netInfoUnsubscribe = null;
          }
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.connect();
        }
      });
      return;
    }

    this.reconnectAttempts++;
    log.debug(`Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      // Exponential backoff with jitter
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2 + Math.random() * 1000,
        this.maxReconnectDelay
      );
    }, this.reconnectDelay);
  }

  send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Return cleanup function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  disconnect() {
    this.shouldReconnect = false;
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Clean up NetInfo listener
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    // Close WebSocket connection
    if (this.ws) {
      // Remove event handlers to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    // Clear all event listeners
    this.listeners.clear();
    
    // Clear status listeners
    this.statusListeners.clear();
    
    this.setConnectionStatus('disconnected');
  }

  reconnect() {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.disconnect();
    this.connect();
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get status(): ConnectionStatus {
    return this.connectionStatus;
  }
}

// Export singleton instance (but don't auto-connect)
export const mobileWebSocket = new MobileWebSocket(WS_URL);

// Real-time event types
export const REALTIME_EVENTS = {
  // Order events
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  
  // Kitchen events
  KITCHEN_ORDER_ASSIGNED: 'kitchen_order_assigned',
  KITCHEN_ORDER_READY: 'kitchen_order_ready',
  
  // Delivery events
  DELIVERY_ASSIGNED: 'delivery_assigned',
  DELIVERY_STARTED: 'delivery_started',
  DELIVERY_COMPLETED: 'delivery_completed',
  
  // Nutritionist events
  CLIENT_PROGRESS_UPDATED: 'client_progress_updated',
  SESSION_SCHEDULED: 'session_scheduled',
  
  // Admin events
  SYSTEM_ALERT: 'system_alert',
  USER_ACTIVITY: 'user_activity',
  
  // General events
  NOTIFICATION: 'notification',
  MESSAGE: 'message',
} as const;

export type RealtimeEventType = typeof REALTIME_EVENTS[keyof typeof REALTIME_EVENTS];
