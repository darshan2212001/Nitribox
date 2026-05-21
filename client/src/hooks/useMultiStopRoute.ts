import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useRealtime } from './use-realtime';
import { useToast } from './use-toast';

interface DeliveryStop {
  sequence: number;
  order_id: string;
  client_name: string;
  client_phone?: string;
  address: string;
  coordinates: { lat: number; lng: number };
  eta_minutes: number;
  distance_from_start_km: number;
  distance_to_next_km?: number;
  status: 'next' | 'upcoming' | 'completed';
  priority: string;
}

interface OptimizedRoute {
  total_distance_km: number;
  total_duration_minutes: number;
  stops: DeliveryStop[];
  route_polyline: string;
  optimized_at: string;
  estimated_completion: string;
}

interface ActiveRouteResponse {
  agent_id: string;
  agent_name: string;
  optimized_route: OptimizedRoute;
}

export function useMultiStopRoute(agentId: string | null) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch active route
  const {
    data: routeData,
    isLoading,
    error,
    refetch: refetchRoute
  } = useQuery<ActiveRouteResponse>({
    queryKey: ['/api/delivery-optimization', agentId, 'active-route'],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID required');
      const response = await fetch(`/api/delivery-optimization/${agentId}/active-route`);
      if (!response.ok) {
        if (response.status === 404) {
          // No active deliveries - return null-like structure
          return null;
        }
        throw new Error('Failed to fetch active route');
      }
      return response.json();
    },
    enabled: !!agentId,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2
  });

  // Real-time updates
  useRealtime({
    events: [
      'route_optimized',
      'stop_completed',
      'route_recalculated',
      'next_stop_changed',
      'delivery.location_update'
    ],
    onEvent: (event) => {
      if (event.data.agent_id === agentId || !agentId) {
        switch (event.type) {
          case 'route_optimized':
          case 'route_recalculated':
            // Refetch route when it's optimized or recalculated
            refetchRoute();
            toast({
              title: 'Route Updated',
              description: 'Your delivery route has been optimized',
            });
            break;
          case 'stop_completed':
            // Refetch route when a stop is completed
            refetchRoute();
            toast({
              title: 'Delivery Completed',
              description: 'Route updated with remaining deliveries',
            });
            break;
          case 'next_stop_changed':
            refetchRoute();
            break;
          case 'delivery.location_update':
            // Update current location if it's for this agent
            if (event.data.delivery_agent_id === agentId) {
              setCurrentLocation({
                lat: parseFloat(event.data.latitude),
                lng: parseFloat(event.data.longitude)
              });
            }
            break;
        }
      }
    },
    showToast: false
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('GPS Error:', error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Complete a stop
  const completeStopMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes?: string }) => {
      if (!agentId) throw new Error('Agent ID required');
      const response = await apiRequest(
        'PATCH',
        `/api/delivery-optimization/${agentId}/complete-stop`,
        { order_id: orderId, delivery_notes: notes }
      );
      return await response.json();
    },
    onSuccess: () => {
      // Refetch route after completing stop
      refetchRoute();
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete delivery',
        variant: 'destructive'
      });
    }
  });

  // Optimize route manually
  const optimizeRouteMutation = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('Agent ID required');
      const response = await apiRequest(
        'POST',
        `/api/delivery-optimization/${agentId}/optimize`
      );
      return await response.json();
    },
    onSuccess: () => {
      refetchRoute();
      toast({
        title: 'Route Optimized',
        description: 'Your delivery route has been recalculated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to optimize route',
        variant: 'destructive'
      });
    }
  });

  // Get next stop
  const getNextStop = useCallback(async () => {
    if (!agentId) return null;
    try {
      const response = await fetch(`/api/delivery-optimization/${agentId}/next-stop`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.next_stop;
    } catch (error) {
      console.error('Error fetching next stop:', error);
      return null;
    }
  }, [agentId]);

  // Complete stop helper
  const completeStop = useCallback(
    (orderId: string, notes?: string) => {
      completeStopMutation.mutate({ orderId, notes });
    },
    [completeStopMutation]
  );

  // Optimize route helper
  const optimizeRoute = useCallback(() => {
    optimizeRouteMutation.mutate();
  }, [optimizeRouteMutation]);

  return {
    // Route data
    route: routeData?.optimized_route,
    agentName: routeData?.agent_name,
    isLoading,
    error,

    // Current location
    currentLocation,

    // Actions
    completeStop,
    optimizeRoute,
    getNextStop,
    refetchRoute,

    // Mutation states
    isCompleting: completeStopMutation.isPending,
    isOptimizing: optimizeRouteMutation.isPending
  };
}

export default useMultiStopRoute;
