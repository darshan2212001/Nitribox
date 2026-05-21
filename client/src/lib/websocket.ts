// WebSocket client for real-time updates
export class DeliveryWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private channelListeners: Map<string, Set<(data: any) => void>> = new Map();
  private subscribedChannels: Set<string> = new Set();
  private messageQueue: Array<{ type: string; data: any }> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnecting = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;

  constructor(private url: string) {
    // Don't auto-connect - connection will be triggered manually when needed
  }
  
  // Public method to trigger connection
  public connect() {
    if (this.isConnecting) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.connectInternal();
  }

  private connectInternal() {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        // Start heartbeat
        this.startHeartbeat();

        // Resubscribe to channels
        this.resubscribeToChannels();

        // Process queued messages
        this.processMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle heartbeat response
          if (data.type === 'pong') {
            this.handlePong();
            return;
          }

          // Handle channel messages
          if (data.channel) {
            this.emitToChannel(data.channel, data);
          } else {
            // Handle regular event messages
            this.emit(data.type, data);
          }
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Only log error on first connection attempt, then suppress spam
        if (this.reconnectAttempts === 0) {
          console.warn('[WebSocket] ⚠️ Connection error. Backend may not be ready yet. Will retry...');
        }
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        // Suppress log spam for normal connection attempts
        if (event.code !== 1000 && this.reconnectAttempts < 3) {
          console.log(`[WebSocket] Connection closed (${event.code}). Retrying...`);
        } else if (event.code !== 1000) {
          // Only log every 5th attempt to reduce spam
          if (this.reconnectAttempts % 5 === 0) {
            console.log(`[WebSocket] Disconnected (${event.code}). Reconnecting...`);
          }
        }
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Only attempt reconnect if it wasn't a manual close and we should reconnect
        if (this.shouldReconnect && event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        
        // Set timeout for pong response
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
          this.reconnect();
        }, 5000);
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handlePong() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private resubscribeToChannels() {
    for (const channel of this.subscribedChannels) {
      this.send('subscribe', { channel });
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.type, message.data);
      }
    }
  }

  private attemptReconnect() {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] ❌ Max reconnection attempts reached. Please ensure backend is running on port 8000');
      }
      return;
    }

    this.reconnectAttempts++;
    // Only log every 5th attempt or first 3 attempts to reduce spam
    if (this.reconnectAttempts <= 3 || this.reconnectAttempts % 5 === 0) {
      console.log(`[WebSocket] 🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(this.reconnectDelay / 1000)}s...`);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectInternal();
      // Exponential backoff with jitter
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2 + Math.random() * 1000,
        this.maxReconnectDelay
      );
    }, this.reconnectDelay);
  }

  send(type: string, data: any) {
    const message = { type, ...data };
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
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

  // Channel management methods
  async subscribe(channel: string) {
    if (!this.subscribedChannels.has(channel)) {
      this.subscribedChannels.add(channel);
      this.send('subscribe', { channel });
      console.log(`[WebSocket] Subscribed to channel: ${channel}`);
    }
  }

  async unsubscribe(channel: string) {
    if (this.subscribedChannels.has(channel)) {
      this.subscribedChannels.delete(channel);
      this.send('unsubscribe', { channel });
      console.log(`[WebSocket] Unsubscribed from channel: ${channel}`);
    }
  }

  onChannel(channel: string, callback: (data: any) => void) {
    if (!this.channelListeners.has(channel)) {
      this.channelListeners.set(channel, new Set());
    }
    this.channelListeners.get(channel)!.add(callback);
    
    // Return cleanup function
    return () => {
      this.channelListeners.get(channel)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  private emitToChannel(channel: string, data: any) {
    this.channelListeners.get(channel)?.forEach(callback => callback(data));
  }

  // Broadcast to specific channel
  broadcastToChannel(channel: string, data: any) {
    this.send('broadcast', { channel, ...data });
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  reconnect() {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.disconnect();
    this.connect();
  }

  // Get connection status
  get isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get subscribed channels
  get channels() {
    return Array.from(this.subscribedChannels);
  }
}

// Singleton instance - construct URL dynamically
function getWebSocketUrl() {
  const envWs = import.meta.env.VITE_WS_URL as string | undefined;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const urlObj = new URL(apiUrl);

  // Prefer VITE_WS_URL (e.g. ws://localhost:8000); append /ws if missing
  let baseWs: string;
  if (envWs && envWs.length > 0) {
    baseWs = envWs.replace(/\/$/, '');
    if (!baseWs.endsWith('/ws')) {
      baseWs = `${baseWs}/ws`;
    }
  } else {
    baseWs = `${protocol}//${urlObj.host}/ws`;
  }

  let url = baseWs;
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Add token as query parameter for authentication
      url = `${url}?token=${encodeURIComponent(token)}`;
    }
  } catch (error) {
    console.warn('[WebSocket] Could not retrieve auth token:', error);
  }
  
  console.log('[WebSocket] Connecting to:', url.replace(/\?token=[^&]+/, '?token=***'));
  return url;
}

// Lazy initialization - only create when needed
let wsInstance: DeliveryWebSocket | null = null;

export function getDeliveryWS(): DeliveryWebSocket {
  if (!wsInstance) {
    wsInstance = new DeliveryWebSocket(getWebSocketUrl());
    // Only connect if user is authenticated or in development
    const token = localStorage.getItem('access_token');
    const isDev = import.meta.env.DEV || !import.meta.env.PROD;
    if (token || isDev) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        wsInstance?.connect();
      }, 1000);
    }
  }
  return wsInstance;
}

// Export singleton for backward compatibility
export const deliveryWS = getDeliveryWS();
