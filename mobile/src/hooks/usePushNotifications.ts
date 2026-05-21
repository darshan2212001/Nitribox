import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

interface NotificationPermission {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: string;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        log.debug('Expo push token', { token });
      }
    });

    // Listen for incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      log.debug('Notification received', { notification });
      setNotifications(prev => [{
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
        timestamp: new Date().toISOString(),
      }, ...prev.slice(0, 19)]); // Keep last 20 notifications
    });

    // Listen for notification responses (when user taps on notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      log.debug('Notification response', { response });
      // Handle notification tap
      const data = response.notification.request.content.data;
      if (data?.screen) {
        // Navigate to specific screen
        log.debug('Navigate to', { screen: data.screen });
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const requestPermissions = async (): Promise<NotificationPermission> => {
    const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
    
    const permissionStatus: NotificationPermission = {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
    
    setPermission(permissionStatus);
    return permissionStatus;
  };

  const scheduleNotification = async (notification: {
    title: string;
    body: string;
    data?: any;
    trigger?: Notifications.NotificationTriggerInput;
  }) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        },
        trigger: notification.trigger || null,
      });
    } catch (error) {
      log.error('Error scheduling notification', error);
    }
  };

  const sendPushNotification = async (expoPushToken: string, notification: {
    title: string;
    body: string;
    data?: any;
  }) => {
    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      log.error('Error sending push notification', error);
    }
  };

  const cancelNotification = async (notificationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  };

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    permission,
    expoPushToken,
    notifications,
    requestPermissions,
    scheduleNotification,
    sendPushNotification,
    cancelNotification,
    cancelAllNotifications,
    clearNotifications,
  };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

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

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } catch (error) {
    log.error('Error getting Expo push token', error);
  }

  return token;
}

// Hook for meal reminders
export function useMealReminders() {
  const { scheduleNotification, cancelNotification } = usePushNotifications();

  const scheduleMealReminder = async (_mealTime: string, mealType: string) => {
    const trigger: Notifications.TimeIntervalTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24, // Daily
      repeats: true,
    };

    await scheduleNotification({
      title: 'Meal Time! 🍽️',
      body: `It's time for your ${mealType} meal. Don't forget to order!`,
      data: { type: 'meal_reminder', mealType },
      trigger,
    });
  };

  const scheduleOrderReminder = async (orderId: string, estimatedTime: number) => {
    const trigger: Notifications.TimeIntervalTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: estimatedTime * 60, // Convert minutes to seconds
    };

    await scheduleNotification({
      title: 'Order Update 📦',
      body: 'Your order is ready for pickup!',
      data: { type: 'order_ready', orderId },
      trigger,
    });
  };

  return {
    scheduleMealReminder,
    scheduleOrderReminder,
    cancelNotification,
  };
}
