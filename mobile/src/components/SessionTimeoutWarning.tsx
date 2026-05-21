import { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

// const SESSION_WARNING_MINUTES = 2; // Show warning when 2 minutes left (currently unused)
const SESSION_TIMEOUT_SECONDS = 10; // Auto-logout after 10 seconds of warning

export function SessionTimeoutWarning() {
  const { isTokenExpiringSoon, refreshAccessToken, logout, isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT_SECONDS);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    const checkSession = async () => {
      const isExpiring = await isTokenExpiringSoon();
      
      if (isExpiring && !showWarning) {
        setShowWarning(true);
        setTimeLeft(SESSION_TIMEOUT_SECONDS);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Start countdown
        const countdown = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              countdownIntervalRef.current = null;
              // Auto-logout
              logout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        countdownIntervalRef.current = countdown;
      } else if (!isExpiring && showWarning) {
        setShowWarning(false);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSession, 30000);
    checkSession(); // Check immediately

    return () => {
      clearInterval(interval);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, showWarning, isTokenExpiringSoon, logout]);

  const handleExtendSession = async () => {
    setShowWarning(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    const newToken = await refreshAccessToken();
    if (!newToken) {
      // If refresh fails, logout
      await logout();
    }
  };

  const handleLogout = async () => {
    setShowWarning(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    await logout();
  };

  if (!showWarning) return null;

  return (
    <Modal
      transparent
      visible={showWarning}
      animationType="fade"
      onRequestClose={handleExtendSession}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={48} color="#f97316" />
          </View>
          
          <Text style={styles.title}>Session Expiring Soon</Text>
          
          <Text style={styles.message}>
            Your session will expire in{' '}
            <Text style={styles.timeLeft}>{timeLeft} seconds</Text>.
          </Text>
          
          <Text style={styles.subMessage}>
            Would you like to extend your session, or you'll be logged out automatically?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.extendButton]}
              onPress={handleExtendSession}
            >
              <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.extendButtonText}>Extend Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeLeft: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
  },
  subMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  extendButton: {
    backgroundColor: '#10b981',
  },
  logoutButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  extendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

