import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Phone, Navigation, Truck, RefreshCw, Package } from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { pageTransitionVariants, viewportConfig } from '@/lib/animations';
import { GoogleMapProvider } from '@/components/maps/GoogleMapProvider';
import RealTimeDeliveryMap from '@/components/maps/RealTimeDeliveryMap';

interface DeliveryLocation {
  latitude: string;
  longitude: string;
  timestamp: string;
}

interface DeliveryTrackingItem {
  id: string;
  order_id: string;
  delivery_agent_id?: string;
  delivery_agent?: {
    id: string;
    name: string;
    phone?: string;
  };
  latitude: string;
  longitude: string;
  destination_latitude?: string;
  destination_longitude?: string;
  status: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  distance_km?: number;
  last_updated?: string;
  created_at?: string;
  order_details?: {
    meal_type?: string;
    diet_plan?: string;
    status?: string;
    client_address?: string;
    client_name?: string;
    client_phone?: string;
  };
}

interface LiveDeliveryTrackerProps {
  deliveries?: DeliveryTrackingItem[];
  onRefresh?: () => void;
}

export function LiveDeliveryTracker({
  deliveries = [],
  onRefresh
}: LiveDeliveryTrackerProps) {
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [currentLocations, setCurrentLocations] = useState<Record<string, DeliveryLocation>>({});
  const { toast } = useToast();

  // Filter active deliveries (not delivered)
  const activeDeliveries = useMemo(() => {
    return deliveries.filter(d => 
      d.status && 
      d.status !== 'delivered' && 
      d.status !== 'completed' &&
      d.latitude && 
      d.longitude
    );
  }, [deliveries]);

  // Set first active delivery as selected by default
  useEffect(() => {
    if (activeDeliveries.length > 0 && !selectedDelivery) {
      setSelectedDelivery(activeDeliveries[0].order_id);
    }
  }, [activeDeliveries, selectedDelivery]);

  // Get selected delivery data
  const selectedDeliveryData = useMemo(() => {
    if (!selectedDelivery) return null;
    return activeDeliveries.find(d => d.order_id === selectedDelivery) || null;
  }, [selectedDelivery, activeDeliveries]);

  // Subscribe to real-time delivery updates
  useRealtime({
    events: [
      'delivery.location_update',
      'delivery.completed',
      'meal.delivered'
    ],
    onEvent: (event) => {
      const orderId = event.data?.order_id || event.data?.orderId;
      if (orderId && event.type === 'delivery.location_update') {
        setCurrentLocations(prev => ({
          ...prev,
          [orderId]: {
            latitude: event.data.latitude || event.data.lat,
            longitude: event.data.longitude || event.data.lng,
            timestamp: event.timestamp || new Date().toISOString()
          }
        }));
      } else if (orderId && (event.type === 'delivery.completed' || event.type === 'meal.delivered')) {
        toast({
          title: "🎉 Delivery Complete!",
          description: `Order ${orderId.substring(0, 8)}... has been delivered successfully`,
        });
        // Remove from current locations
        setCurrentLocations(prev => {
          const updated = { ...prev };
          delete updated[orderId];
          return updated;
        });
      }
    },
    showToast: false
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
      case 'packed':
        return 'bg-secondary text-secondary-foreground';
      case 'in_transit':
      case 'in-transit':
        return 'bg-primary/20 text-primary';
      case 'delivered':
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return 'Assigned';
      case 'packed':
        return 'Packed';
      case 'in_transit':
      case 'in-transit':
        return 'In Transit';
      case 'delivered':
      case 'completed':
        return 'Delivered';
      default:
        return status || 'Unknown';
    }
  };

  const formatETA = (etaString?: string) => {
    if (!etaString) return null;
    try {
      const eta = new Date(etaString);
      const now = new Date();
      const diffMs = eta.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins > 0) {
        return `${diffMins} minutes`;
      } else if (diffMins > -5) {
        return 'Arriving soon';
      } else {
        return 'Delayed';
      }
    } catch {
      return null;
    }
  };

  // Prepare map data for selected delivery
  const mapData = useMemo(() => {
    if (!selectedDeliveryData) return null;

    const currentLocation = currentLocations[selectedDeliveryData.order_id] || {
      latitude: selectedDeliveryData.latitude,
      longitude: selectedDeliveryData.longitude,
      timestamp: selectedDeliveryData.last_updated || selectedDeliveryData.created_at || new Date().toISOString()
    };

    const destination = selectedDeliveryData.destination_latitude && selectedDeliveryData.destination_longitude
      ? {
          lat: parseFloat(selectedDeliveryData.destination_latitude),
          lng: parseFloat(selectedDeliveryData.destination_longitude)
        }
      : null;

    return {
      order: {
        id: selectedDeliveryData.order_id,
        clientName: selectedDeliveryData.order_details?.client_name || `Order ${selectedDeliveryData.order_id.substring(0, 8)}`,
        clientAddress: selectedDeliveryData.order_details?.client_address || 'Address not available',
        clientPhone: selectedDeliveryData.order_details?.client_phone || '',
        destination: destination || { lat: 19.0760, lng: 72.8777 }, // Default to Mumbai
        status: selectedDeliveryData.status as 'assigned' | 'in_transit' | 'delivered',
        estimatedDeliveryTime: selectedDeliveryData.estimated_delivery_time
      },
      deliveryAgentLocation: {
        lat: parseFloat(currentLocation.latitude),
        lng: parseFloat(currentLocation.longitude),
        timestamp: currentLocation.timestamp,
        status: (selectedDeliveryData.status === 'in_transit' || selectedDeliveryData.status === 'in-transit' ? 'en_route' : 'assigned') as 'en_route' | 'assigned'
      }
    };
  }, [selectedDeliveryData, currentLocations]);

  if (activeDeliveries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-card-border shadow-lg backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                <Package className="w-10 h-10 text-primary/60" />
              </div>
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-foreground mb-3"
            >
              No Active Deliveries
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground text-center max-w-md leading-relaxed mb-6"
            >
              You don't have any active deliveries at the moment. Your orders will appear here once they're assigned for delivery.
            </motion.p>
            {onRefresh && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  className="mt-2 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <Tabs value={selectedDelivery || ''} onValueChange={setSelectedDelivery} className="w-full">
        {activeDeliveries.length > 1 && (
          <TabsList className="grid w-full gap-2 mb-6 p-1 bg-muted/30 rounded-xl border border-muted/50 shadow-sm" style={{ gridTemplateColumns: `repeat(${activeDeliveries.length}, minmax(0, 1fr))` }}>
            {activeDeliveries.map((delivery) => (
              <TabsTrigger
                key={delivery.order_id}
                value={delivery.order_id}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 rounded-lg font-medium"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Order {delivery.order_id.substring(0, 8)}</span>
                <span className="sm:hidden">{delivery.order_id.substring(0, 6)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {activeDeliveries.map((delivery) => (
          <TabsContent key={delivery.order_id} value={delivery.order_id} className="mt-0">
            <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-card-border shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-3">
                    <motion.div
                      animate={(delivery.status === 'in_transit' || delivery.status === 'in-transit') ? { 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="p-2 rounded-lg bg-primary/10"
                    >
                      <Truck className="w-5 h-5 text-primary" />
                    </motion.div>
                    <span>Live Delivery Tracking</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(delivery.status)} border-2 font-semibold px-3 py-1 shadow-sm`}
                    >
                      {getStatusLabel(delivery.status)}
                    </Badge>
                    {onRefresh && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onRefresh}
                        className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Delivery Agent Info */}
                {delivery.delivery_agent && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-5 border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm"
                        >
                          <Truck className="w-5 h-5 text-primary" />
                        </motion.div>
                        <div>
                          <p className="font-semibold text-foreground text-base">{delivery.delivery_agent.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Delivery Agent
                          </p>
                        </div>
                      </div>
                      {delivery.delivery_agent.phone && (
                        <Button
                          size="sm"
                          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
                          onClick={() => {
                            window.location.href = `tel:${delivery.delivery_agent.phone}`;
                          }}
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Delivery Address */}
                {delivery.order_details?.client_address && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-muted/30 rounded-xl p-4 border border-muted/50 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Delivery Address</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-8 leading-relaxed">{delivery.order_details.client_address}</p>
                  </motion.div>
                )}

                {/* ETA and Status */}
                {(delivery.estimated_delivery_time || delivery.status === 'in_transit' || delivery.status === 'in-transit') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {delivery.estimated_delivery_time && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Estimated Time</p>
                            <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                              {formatETA(delivery.estimated_delivery_time) || 'Calculating...'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {delivery.distance_km && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Navigation className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Distance</p>
                            <p className="text-base font-bold text-purple-700 dark:text-purple-300">
                              {delivery.distance_km.toFixed(1)} km
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Real-time Delivery Map */}
                {mapData && mapData.order.id === delivery.order_id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="rounded-2xl overflow-hidden border-2 border-muted/50 shadow-2xl relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none z-10 rounded-2xl" />
                    <GoogleMapProvider>
                      <RealTimeDeliveryMap
                        selectedOrder={mapData.order}
                        deliveryAgentLocation={mapData.deliveryAgentLocation}
                        height="450px"
                        showRoute={delivery.status === 'in_transit' || delivery.status === 'in-transit'}
                        showETA={!!delivery.estimated_delivery_time}
                        onLocationUpdate={(location) => {
                          setCurrentLocations(prev => ({
                            ...prev,
                            [delivery.order_id]: {
                              latitude: location.lat.toString(),
                              longitude: location.lng.toString(),
                              timestamp: location.timestamp
                            }
                          }));
                        }}
                      />
                    </GoogleMapProvider>
                  </motion.div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-muted/50">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={(delivery.status === 'in_transit' || delivery.status === 'in-transit') ? { 
                        opacity: [1, 0.5, 1],
                        scale: [1, 1.2, 1]
                      } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className={`relative w-3 h-3 rounded-full ${
                        (delivery.status === 'in_transit' || delivery.status === 'in-transit') ? 'bg-primary' : 
                        (delivery.status === 'delivered' || delivery.status === 'completed') ? 'bg-emerald-500' : 'bg-muted-foreground'
                      }`}
                    >
                      {(delivery.status === 'in_transit' || delivery.status === 'in-transit') && (
                        <motion.div
                          animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-primary"
                        />
                      )}
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">
                      {delivery.status === 'assigned' && 'Agent assigned, waiting for pickup'}
                      {(delivery.status === 'in_transit' || delivery.status === 'in-transit') && 'Live tracking active'}
                      {(delivery.status === 'delivered' || delivery.status === 'completed') && 'Delivery completed successfully'}
                      {!delivery.status && 'Status unknown'}
                    </span>
                  </div>
                  {delivery.last_updated && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(delivery.last_updated).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
}

export default LiveDeliveryTracker;
