import { useState, useEffect } from "react";
import { Package, TrendingUp, MapPin, Navigation, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/StatsCard";
import MapPlaceholder from "@/components/MapPlaceholder";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { deliveryWS } from "@/lib/websocket";
import { pageTransitionVariants } from "@/lib/animations";

export default function DeliveryPortalEnhanced() {
  const [activeTab, setActiveTab] = useState<"available" | "active" | "completed">("available");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

  // Fetch orders assigned to this delivery agent
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Listen for WebSocket location updates
  useEffect(() => {
    const unsubscribe = deliveryWS.on("location_update", (data) => {
      console.log("[Delivery] Received location update:", data);
      // Invalidate tracking queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking"] });
    });

    return unsubscribe;
  }, []);

  // Get current GPS location and broadcast updates
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          
          // Broadcast location update via WebSocket
          if (selectedOrderId && trackingId) {
            deliveryWS.send("location_update", {
              orderId: selectedOrderId,
              trackingId,
              lat: newLocation.lat,
              lng: newLocation.lng,
              timestamp: new Date().toISOString(),
            });
            
            // Also update via API for persistence
            apiRequest(`/api/delivery-tracking/${trackingId}`, "PATCH", {
              currentLatitude: newLocation.lat.toString(),
              currentLongitude: newLocation.lng.toString(),
            }).catch(console.error);
          }
        },
        (error) => console.warn("GPS Location unavailable:", error.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [selectedOrderId, trackingId]);

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "picked_up") {
        updates.pickedUpAt = new Date().toISOString();
      } else if (status === "delivered") {
        updates.deliveredAt = new Date().toISOString();
      }
      return await apiRequest(`/api/orders/${id}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  // Create delivery tracking
  const createTracking = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/delivery-tracking", "POST", data);
    },
    onSuccess: (data) => {
      // Save the tracking ID to enable real-time GPS updates
      if (data?.id) {
        setTrackingId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-tracking"] });
    },
  });

  const handlePickup = (orderId: string) => {
    // Reset tracking ID to prevent stale ID reuse
    setTrackingId(null);
    
    updateOrderStatus.mutate({ id: orderId, status: "picked_up" });
    setSelectedOrderId(orderId);
    
    // Create initial tracking
    if (currentLocation) {
      createTracking.mutate({
        orderId,
        deliveryAgentId: "agent-1",
        currentLatitude: currentLocation.lat.toString(),
        currentLongitude: currentLocation.lng.toString(),
        destinationLatitude: "12.9716",
        destinationLongitude: "77.5946",
        status: "en_route",
      });
    }
  };

  const handleDelivered = (orderId: string) => {
    updateOrderStatus.mutate({ id: orderId, status: "delivered" });
    // Clear tracking state to stop GPS broadcasts
    setTrackingId(null);
    setSelectedOrderId(null);
  };

  const availableOrders = orders.filter((o: any) => o.kitchenStatus === "assigned" && o.status === "pending");
  const activeOrders = orders.filter((o: any) => o.status === "picked_up");
  const completedOrders = orders.filter((o: any) => o.status === "delivered");

  const selectedOrder = selectedOrderId ? orders.find((o: any) => o.id === selectedOrderId) : activeOrders[0];

  return (
    <motion.div
      {...pageTransitionVariants}
      className="min-h-screen bg-background"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-white py-8 mb-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Delivery Dashboard</h1>
          <p className="text-white/90">Navigate, track & complete deliveries</p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <StatsCard
            title="Today's Deliveries"
            value={orders.length.toString()}
            subtitle="Total orders"
            icon={Package}
          />
          <StatsCard
            title="Completed"
            value={completedOrders.length.toString()}
            subtitle={`${availableOrders.length + activeOrders.length} remaining`}
            icon={TrendingUp}
          />
          <StatsCard
            title="GPS Status"
            value={currentLocation ? "Active" : "Inactive"}
            subtitle={currentLocation ? "Location tracked" : "Waiting for GPS"}
            icon={MapPin}
          />
        </motion.div>

        {/* Live Navigation Map */}
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold text-foreground mb-4">Live Navigation</h2>
            <MapPlaceholder
              height="400px"
              route={true}
              center={currentLocation || { lat: 12.9716, lng: 77.5946 }}
              markers={[
                { lat: 12.9716, lng: 77.5946, label: selectedOrder.clientName }
              ]}
            />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivering to</p>
                <p className="font-semibold text-foreground">{selectedOrder.clientName}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.clientAddress}</p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                data-testid="button-call-customer"
              >
                <Phone className="w-4 h-4" />
                Call Customer
              </Button>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2 border-b border-border overflow-x-auto">
          <Button
            variant={activeTab === "available" ? "default" : "ghost"}
            onClick={() => setActiveTab("available")}
            className="rounded-b-none"
            data-testid="tab-available"
          >
            Available ({availableOrders.length})
          </Button>
          <Button
            variant={activeTab === "active" ? "default" : "ghost"}
            onClick={() => setActiveTab("active")}
            className="rounded-b-none"
            data-testid="tab-active"
          >
            Active ({activeOrders.length})
          </Button>
          <Button
            variant={activeTab === "completed" ? "default" : "ghost"}
            onClick={() => setActiveTab("completed")}
            className="rounded-b-none"
            data-testid="tab-completed"
          >
            Completed ({completedOrders.length})
          </Button>
        </div>

        <div className="space-y-4">
          {activeTab === "available" && availableOrders.map((order: any, index: number) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl shadow-md p-6 hover-elevate"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Badge className="bg-blue-500 text-white mb-2">Ready for Pickup</Badge>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{order.dietPlan}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{order.mealType}</p>
                  <p className="text-sm text-foreground">{order.clientName}</p>
                  <p className="text-xs text-muted-foreground">{order.clientAddress}</p>
                </div>
                <Button
                  onClick={() => handlePickup(order.id)}
                  disabled={updateOrderStatus.isPending || !currentLocation}
                  data-testid={`button-pickup-${index}`}
                  className="gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Start Delivery
                </Button>
              </div>
            </motion.div>
          ))}

          {activeTab === "active" && activeOrders.map((order: any, index: number) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl shadow-md p-6 hover-elevate border-2 border-primary"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <Badge className="bg-green-500 text-white mb-2 animate-pulse">In Transit</Badge>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{order.dietPlan}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{order.mealType}</p>
                  <p className="text-sm text-foreground">{order.clientName}</p>
                  <p className="text-xs text-muted-foreground">{order.clientAddress}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setSelectedOrderId(order.id)}
                    variant="outline"
                    data-testid={`button-view-map-${index}`}
                    className="gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    View Map
                  </Button>
                  <Button
                    onClick={() => handleDelivered(order.id)}
                    disabled={updateOrderStatus.isPending}
                    data-testid={`button-complete-${index}`}
                  >
                    Mark Delivered
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

          {activeTab === "completed" && completedOrders.map((order: any, index: number) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-xl shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Badge className="bg-gray-500 text-white mb-2">Delivered</Badge>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{order.dietPlan}</h3>
                  <p className="text-sm text-muted-foreground">{order.clientName}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.deliveredAt && new Date(order.deliveredAt).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}

          {activeTab === "available" && availableOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No orders available for pickup</p>
            </div>
          )}

          {activeTab === "active" && activeOrders.length === 0 && (
            <div className="text-center py-12">
              <Navigation className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active deliveries</p>
            </div>
          )}

          {activeTab === "completed" && completedOrders.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No completed deliveries today</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
