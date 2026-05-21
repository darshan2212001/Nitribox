import { useEffect, useCallback, useRef } from "react";
import { deliveryWS } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RealtimeEvent {
  type: string;
  data?: any;
  timestamp?: string;
  source?: string;
  [key: string]: any;
}

interface RealtimeOptions {
  events?: string[];
  channels?: string[];
  onEvent?: (event: RealtimeEvent) => void;
  showToast?: boolean;
  invalidateQueries?: string[][];
  autoSubscribe?: boolean;
  userRole?: 'client' | 'nutritionist' | 'kitchen' | 'delivery' | 'admin';
  userId?: string;
}

interface EventHandler {
  [eventType: string]: (event: RealtimeEvent) => void;
}

export function useRealtime(options: RealtimeOptions) {
  const { toast } = useToast();
  const { 
    events = [], 
    channels = [], 
    onEvent, 
    showToast = false, 
    invalidateQueries = [],
    autoSubscribe = true,
    userRole,
    userId
  } = options;

  const eventHandlersRef = useRef<EventHandler>({});
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  // Auto-subscribe to channels based on user role
  const getAutoChannels = useCallback(() => {
    if (!autoSubscribe || !userRole || !userId) return [];
    
    const autoChannels: string[] = [];
    
    switch (userRole) {
      case 'client':
        autoChannels.push(`client_${userId}`);
        break;
      case 'nutritionist':
        autoChannels.push(`nutritionist_${userId}`);
        break;
      case 'kitchen':
        autoChannels.push('kitchen');
        break;
      case 'delivery':
        autoChannels.push(`delivery_${userId}`);
        break;
      case 'admin':
        autoChannels.push('admin');
        break;
    }
    
    return autoChannels;
  }, [autoSubscribe, userRole, userId]);

  // Subscribe to channels
  const subscribeToChannels = useCallback(async (channelsToSubscribe: string[]) => {
    for (const channel of channelsToSubscribe) {
      if (!subscribedChannelsRef.current.has(channel)) {
        await deliveryWS.subscribe(channel);
        subscribedChannelsRef.current.add(channel);
        console.log(`[Realtime] Subscribed to channel: ${channel}`);
      }
    }
  }, []);

  // Unsubscribe from channels
  const unsubscribeFromChannels = useCallback(async (channelsToUnsubscribe: string[]) => {
    for (const channel of channelsToUnsubscribe) {
      if (subscribedChannelsRef.current.has(channel)) {
        await deliveryWS.unsubscribe(channel);
        subscribedChannelsRef.current.delete(channel);
        console.log(`[Realtime] Unsubscribed from channel: ${channel}`);
      }
    }
  }, []);

  // Enhanced event handler with specific event types
  const handleEvent = useCallback(async (event: RealtimeEvent) => {
    console.log(`[Realtime] Received ${event.type}:`, event);

        // Call custom event handler if provided
        if (onEvent) {
          onEvent(event);
        }

    // Call specific event handler if registered
    const specificHandler = eventHandlersRef.current[event.type];
    if (specificHandler) {
      specificHandler(event);
    }

        // Invalidate specified queries
        for (const queryKey of invalidateQueries) {
          await queryClient.invalidateQueries({ queryKey });
        }

        // Show toast notification if enabled
        if (showToast) {
          const toastMessages: { [key: string]: { title: string; description: string } } = {
        // Subscription Events
        'subscription.created': {
          title: "New Subscription",
          description: "A new subscription has been created",
        },
        'subscription.activated': {
          title: "Subscription Activated",
          description: "Your subscription is now active",
        },
        'subscription.paused': {
          title: "Subscription Paused",
          description: "Your subscription has been paused",
        },
        
        // Meal Plan Events
        'meal_plan.generated': {
          title: "Meal Plan Generated",
          description: "Your personalized meal plan is ready",
        },
        'meal_plan.updated': {
          title: "Meal Plan Updated",
          description: "Your meal plan has been modified",
        },
        'daily.meals_assigned': {
          title: "Today's Meals Assigned",
          description: "Your meals for today have been prepared",
        },
        
        // Meal Status Events
        'meal.preparing': {
          title: "Meal Being Prepared",
          description: "Your meal is being prepared in the kitchen",
        },
        'meal.packed': {
          title: "Meal Packed",
          description: "Your meal has been packed and is ready for delivery",
        },
        'meal.assigned': {
          title: "Delivery Assigned",
          description: "A delivery agent has been assigned to your order",
        },
        'meal.in_transit': {
          title: "Meal On The Way",
          description: "Your meal is out for delivery",
        },
        'meal.delivered': {
          title: "Meal Delivered",
          description: "Your meal has been delivered",
        },
        'meal.consumed': {
          title: "Meal Consumed",
          description: "Meal consumption logged successfully",
        },
        'meal.skipped': {
          title: "Meal Skipped",
          description: "Meal marked as skipped",
        },
        
        // Delivery Events
        'delivery.assigned': {
          title: "Delivery Assigned",
          description: "Your delivery has been assigned to an agent",
        },
        'delivery.reassigned': {
          title: "Delivery Reassigned",
          description: "Your delivery has been reassigned to a new agent",
        },
        'delivery.location_update': {
          title: "Delivery Update",
          description: "Your delivery location has been updated",
        },
        'delivery.completed': {
          title: "Delivery Completed",
          description: "Your delivery has been completed",
        },
        
        // Consultation Events
        'consultation.scheduled': {
          title: "Consultation Scheduled",
          description: "A new consultation has been scheduled",
        },
        'consultation.reminder': {
          title: "Consultation Reminder",
          description: "You have a consultation coming up",
        },
        'consultation.completed': {
          title: "Consultation Completed",
          description: "Your consultation has been completed",
        },
        
        // Progress Events
        'progress.logged': {
          title: "Progress Logged",
          description: "New progress has been logged",
        },
        'weekly.report_ready': {
          title: "Weekly Report Ready",
          description: "Your weekly progress report is ready",
        },
        
        // Admin Events
        'announcement.broadcast': {
          title: "Announcement",
          description: event.data?.message || "New announcement from admin",
        },
        
        // Legacy Events (for backward compatibility)
        'meal_plan_created': {
              title: "New Meal Plan",
              description: "A new meal plan has been added",
            },
        'meal_plan_updated': {
              title: "Meal Plan Updated",
              description: "A meal plan has been modified",
            },
        'meal_plan_deleted': {
              title: "Meal Plan Removed",
              description: "A meal plan has been deleted",
            },
        'client_created': {
              title: "New Client",
              description: "A new client has joined",
            },
        'client_updated': {
              title: "Client Updated",
              description: "Client information has been updated",
            },
        'session_created': {
              title: "New Session",
              description: "A new consultation session has been scheduled",
            },
        'session_updated': {
              title: "Session Updated",
              description: "Session details have been modified",
            },
        'progress_log_created': {
              title: "Progress Update",
              description: "New progress has been logged",
            },
        'order_created': {
              title: "New Order",
              description: "A new order has been placed",
            },
        'order_updated': {
              title: "Order Updated",
              description: "Order status has changed",
            },
        'kitchen_queue_updated': {
              title: "Kitchen Update",
              description: "Meal preparation status updated",
            },
        'location_update': {
              title: "Delivery Update",
              description: "Delivery location updated",
            },
          };

      const message = toastMessages[event.type];
          if (message) {
            toast({
              title: message.title,
              description: message.description,
            });
          }
        }
  }, [onEvent, invalidateQueries, showToast, toast]);

  // Register specific event handler
  const registerEventHandler = useCallback((eventType: string, handler: (event: RealtimeEvent) => void) => {
    eventHandlersRef.current[eventType] = handler;
  }, []);

  // Unregister specific event handler
  const unregisterEventHandler = useCallback((eventType: string) => {
    delete eventHandlersRef.current[eventType];
  }, []);

  // Subscribe to events
  useEffect(() => {
    const unsubscribers = events.map((eventType) => {
      return deliveryWS.on(eventType, handleEvent);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [events, handleEvent]);

  // Subscribe to channels
  useEffect(() => {
    const allChannels = [...channels, ...getAutoChannels()];
    // Filter out empty channels
    const validChannels = allChannels.filter(ch => ch && ch.length > 0);
    if (validChannels.length > 0) {
      subscribeToChannels(validChannels);
    }

    return () => {
      if (validChannels.length > 0) {
        unsubscribeFromChannels(validChannels);
      }
    };
  }, [channels, getAutoChannels, subscribeToChannels, unsubscribeFromChannels]);

  return {
    subscribeToChannels,
    unsubscribeFromChannels,
    registerEventHandler,
    unregisterEventHandler,
    subscribedChannels: Array.from(subscribedChannelsRef.current),
  };
}
