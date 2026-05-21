import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface NetworkStatusProps {
  showWhenOnline?: boolean;
  className?: string;
}

export default function NetworkStatus({ showWhenOnline = false, className = '' }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!showWhenOnline) {
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showWhenOnline]);

  if (!showAlert && isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <div className={className}>
      {!isOnline && (
        <Alert className="border-red-200 bg-red-50">
          <WifiOff className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium">No Internet Connection</div>
            <div className="text-sm mt-1">
              Please check your network connection and try again.
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {isOnline && showAlert && (
        <Alert className="border-green-200 bg-green-50">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-medium">Connection Restored</div>
            <div className="text-sm mt-1">
              You're back online! You can now continue using the application.
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {isOnline && showWhenOnline && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <Wifi className="h-4 w-4" />
          <span>Online</span>
        </div>
      )}
    </div>
  );
}

// Hook for checking network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Get connection type if available
    const getConnectionType = () => {
      const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    getConnectionType();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g',
    isFastConnection: connectionType === '4g' || connectionType === '5g',
  };
};
