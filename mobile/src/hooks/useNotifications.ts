import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../lib/config';
import { log } from '../lib/logger';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  // Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token || null);
        // Send token to your backend
        sendTokenToBackend(token);
      }
    });
  }, []);

  // Listen for notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    return () => subscription.remove();
  }, []);

  // Listen for notification responses (when user taps notification)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      log.debug('Notification response', { response });
      // Handle notification tap - navigate to relevant screen
      handleNotificationResponse(response);
    });

    return () => subscription.remove();
  }, []);

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        log.warn('Failed to get push token for push notification');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      log.warn('Must use physical device for Push Notifications');
    }

    return token || null;
  };

  const sendTokenToBackend = async (token: string) => {
    if (user) {
      try {
        // Send token to your backend API
        const response = await fetch(`${API_BASE_URL}/api/notifications/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(user as any).token}`, // Assuming you have a token
          },
          body: JSON.stringify({
            userId: user.id,
            pushToken: token,
            platform: Platform.OS,
          }),
        });
        
        if (response.ok) {
          log.debug('Push token registered successfully');
        }
      } catch (error) {
        log.error('Failed to register push token', error);
      }
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data?.type === 'order_update') {
      // Navigate to orders screen
      log.debug('Navigate to order', { orderId: data.orderId });
    } else if (data?.type === 'kitchen_update') {
      // Navigate to kitchen screen
        log.debug('Navigate to kitchen');
    } else if (data?.type === 'delivery_update') {
      // Navigate to delivery screen
        log.debug('Navigate to delivery');
    }
  };

  // Schedule a local notification
  const scheduleNotification = async (notificationData: NotificationData) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
      },
      trigger: null, // Show immediately
    });
  };

  // Schedule a notification with delay
  const scheduleNotificationWithDelay = async (
    notificationData: NotificationData,
    seconds: number
  ) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data,
      },
      trigger: { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds 
      } as Notifications.TimeIntervalTriggerInput,
    });
  };

  // Cancel all notifications
  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  // Get notification permissions
  const getNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  };

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  return {
    expoPushToken,
    notification,
    scheduleNotification,
    scheduleNotificationWithDelay,
    cancelAllNotifications,
    getNotificationPermissions,
    requestNotificationPermissions,
  };
}