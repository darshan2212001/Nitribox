import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Clock, RefreshCw } from 'lucide-react';

const SESSION_TIMEOUT_SECONDS = 10; // Auto-logout after 10 seconds of warning

export function SessionTimeoutWarning() {
  const { isTokenExpiringSoon, refreshAccessToken, logout, isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT_SECONDS);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    let interval: NodeJS.Timeout | null = null;
    let countdown: NodeJS.Timeout | null = null;

    const checkSession = () => {
      const isExpiring = isTokenExpiringSoon();
      
      if (isExpiring && !showWarning) {
        setShowWarning(true);
        setTimeLeft(SESSION_TIMEOUT_SECONDS);
        
        // Start countdown
        countdown = window.setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              if (countdown) window.clearInterval(countdown);
              // Auto-logout
              logout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000) as any;
        setCountdownInterval(countdown);
      } else if (!isExpiring && showWarning) {
        setShowWarning(false);
        if (countdown) {
          window.clearInterval(countdown);
          setCountdownInterval(null);
        }
      }
    };

    // Check every 30 seconds
    interval = window.setInterval(checkSession, 30000) as any;
    checkSession(); // Check immediately

    return () => {
      if (interval) window.clearInterval(interval);
      if (countdown) window.clearInterval(countdown);
    };
  }, [isAuthenticated, isTokenExpiringSoon, logout]);

  const handleExtendSession = async () => {
    setShowWarning(false);
    if (countdownInterval) window.clearInterval(countdownInterval);
    setCountdownInterval(null);
    
    const newToken = await refreshAccessToken();
    if (!newToken) {
      // If refresh fails, logout
      await logout();
    }
  };

  const handleLogout = async () => {
    setShowWarning(false);
    if (countdownInterval) window.clearInterval(countdownInterval);
    setCountdownInterval(null);
    await logout();
  };

  if (!showWarning) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <AlertDialogTitle className="text-xl">Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-base text-muted-foreground space-y-2">
              <p className="m-0">
                Your session will expire in <strong>{timeLeft} seconds</strong>.
              </p>
              <p className="text-sm text-gray-600 m-0">
                Would you like to extend your session, or you&apos;ll be logged out automatically?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row sm:justify-end gap-2">
          <AlertDialogCancel onClick={handleLogout}>
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession} className="bg-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

