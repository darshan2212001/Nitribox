import { useEffect, useRef } from 'react';
import { mobileWebSocket } from '../lib/websocket';
import { useAuth } from '../hooks/useAuth';
import { log } from '../lib/logger';

/**
 * Component that initializes WebSocket connection after user authentication
 * Includes debouncing to prevent race conditions
 */
export function WebSocketInitializer() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserRef = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Clear any pending connection attempts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Only connect after authentication is complete and user is authenticated
    if (!isLoading && isAuthenticated && user?.id) {
      const currentUserId = user.id;
      
      // Debounce connection attempts - only connect if user changed or not already connected
      if (lastUserRef.current !== currentUserId || !mobileWebSocket.isConnected) {
        lastUserRef.current = currentUserId;
        
        // Debounce connection by 300ms to prevent rapid reconnections
        connectionTimeoutRef.current = setTimeout(() => {
          log.debug('User authenticated, connecting WebSocket...', { userId: user.id, role: user.role });
          
          // Set up subscription handler that sends user info after connection
          const handleConnected = () => {
            if (user?.id && user?.role) {
              log.debug('WebSocket connected, sending subscription...', { userId: user.id, role: user.role });
              try {
                mobileWebSocket.send('subscribe', {
                  userId: user.id,
                  role: user.role,
                });
              } catch (error) {
                log.error('Error sending WebSocket subscription', error);
              }
            }
          };

          // Subscribe to connection status changes
          unsubscribe = mobileWebSocket.onStatusChange((status) => {
            if (status === 'connected') {
              handleConnected();
            }
          });

          // Only connect if not already connected
          if (!mobileWebSocket.isConnected) {
            mobileWebSocket.connect().catch(error => {
              log.error('Failed to connect WebSocket', error);
            });
          } else {
            // Already connected, send subscription immediately
            handleConnected();
          }
        }, 300);
      }
    } else if (!isLoading && !isAuthenticated) {
      // Disconnect WebSocket when user logs out
      lastUserRef.current = null;
      log.debug('User logged out, disconnecting WebSocket...');
      mobileWebSocket.disconnect();
    }

    // Cleanup function
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (unsubscribe) {
        unsubscribe();
      }
      // Don't disconnect on unmount as user might still be authenticated
      // Only disconnect when explicitly logged out
    };
  }, [isAuthenticated, isLoading, user]);

  return null; // This component doesn't render anything
}
