import { useEffect } from 'react';
import { Platform } from 'react-native';
import { log } from '../lib/logger';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  subscription?: string;
}

export function useAnalytics() {
  useEffect(() => {
    // Initialize analytics
    initializeAnalytics();
  }, []);

  const initializeAnalytics = () => {
    // Initialize Firebase Analytics or other analytics service
    log.debug('Analytics initialized');
  };

  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        platform: Platform.OS,
        timestamp: Date.now(),
      },
    };

    // Send to analytics service
    log.debug('Analytics Event', { event });
    
    // In a real app, you would send this to your analytics service
    // Example: Firebase Analytics
    // analytics().logEvent(eventName, properties);
  };

  const trackScreen = (screenName: string, properties?: Record<string, any>) => {
    trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  };

  const trackUserAction = (action: string, properties?: Record<string, any>) => {
    trackEvent('user_action', {
      action,
      ...properties,
    });
  };

  const trackPurchase = (transactionId: string, value: number, currency: string = 'INR', items?: any[]) => {
    trackEvent('purchase', {
      transaction_id: transactionId,
      value,
      currency,
      items,
    });
  };

  const trackSubscription = (planId: string, planName: string, value: number, duration: string) => {
    trackEvent('subscription', {
      plan_id: planId,
      plan_name: planName,
      value,
      duration,
    });
  };

  const trackOrder = (orderId: string, orderValue: number, items: any[]) => {
    trackEvent('order_created', {
      order_id: orderId,
      order_value: orderValue,
      items_count: items.length,
      items,
    });
  };

  const trackLogin = (method: string = 'email') => {
    trackEvent('login', {
      method,
    });
  };

  const trackRegister = (method: string = 'email') => {
    trackEvent('sign_up', {
      method,
    });
  };

  const trackLogout = () => {
    trackEvent('logout');
  };

  const setUserProperties = (properties: UserProperties) => {
    // Set user properties in analytics service
    log.debug('User Properties Set', { properties });
    
    // In a real app, you would set these in your analytics service
    // Example: Firebase Analytics
    // analytics().setUserId(properties.userId);
    // analytics().setUserProperties(properties);
  };

  const trackError = (error: Error, context?: string) => {
    trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      context,
    });
  };

  const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
    trackEvent('performance', {
      metric,
      value,
      unit,
    });
  };

  const trackFeatureUsage = (feature: string, properties?: Record<string, any>) => {
    trackEvent('feature_usage', {
      feature,
      ...properties,
    });
  };

  const trackSearch = (query: string, resultsCount: number) => {
    trackEvent('search', {
      search_term: query,
      results_count: resultsCount,
    });
  };

  const trackNavigation = (from: string, to: string, method: string = 'tap') => {
    trackEvent('navigation', {
      from_screen: from,
      to_screen: to,
      method,
    });
  };

  return {
    trackEvent,
    trackScreen,
    trackUserAction,
    trackPurchase,
    trackSubscription,
    trackOrder,
    trackLogin,
    trackRegister,
    trackLogout,
    setUserProperties,
    trackError,
    trackPerformance,
    trackFeatureUsage,
    trackSearch,
    trackNavigation,
  };
}
