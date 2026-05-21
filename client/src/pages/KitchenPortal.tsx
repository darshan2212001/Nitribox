import { useState, useEffect, useMemo } from "react";
import { ChefHat, Clock, Package, TrendingUp, Users, AlertCircle, Eye, CheckSquare, Square, Filter, ArrowUpDown, Truck, MapPin, Phone, Utensils, MessageSquare, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatsCard from "@/components/StatsCard";
import { useRealtime } from "@/hooks/use-realtime";
import { useToast } from "@/hooks/use-toast";
import { pageTransitionVariants } from "@/lib/animations";
import { portalThemes } from "@/lib/ui-config";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import PortalNavigation, { getKitchenNavigationItems } from "@/components/PortalNavigation";
import EmptyState from "@/components/EmptyState";

interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  status: "pending" | "preparing" | "packed" | "ready" | "assigned" | "completed";
  priority: "high" | "medium" | "low";
  estimatedTime?: number;
  createdAt: string;
  items?: string[];
  mealType?: string;
  dietPlan?: string;
  specialInstructions?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  deliveryAgentId?: string;
  deliveryAgentName?: string;
  assignedAt?: string;
  preparedAt?: string;
  packedAt?: string;
  notes?: string;
}

export default function KitchenPortal() {
  const [selectedTab, setSelectedTab] = useState<"overview" | "production" | "packing" | "dispatch" | "queue" | "preparing" | "packed" | "ready">("overview");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [preparationStartTimes, setPreparationStartTimes] = useState<Map<string, number>>(new Map());
  const [filters, setFilters] = useState({
    mealType: "all",
    priority: "all",
    search: "",
  });
  const [sortBy, setSortBy] = useState<"priority" | "time" | "client">("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const { user } = useAuth();
  const theme = portalThemes.kitchen;

  // Type-safe tab change handler
  const handleTabChange = (tab: string) => {
    const validTabs: Array<typeof selectedTab> = ["overview", "production", "packing", "dispatch", "queue", "preparing", "packed", "ready"];
    if (validTabs.includes(tab as typeof selectedTab)) {
      setSelectedTab(tab as typeof selectedTab);
      setSelectedOrders(new Set()); // Clear selection on tab change
    }
  };
  
  // Additional filters for new views
  const [viewFilters, setViewFilters] = useState({
    mealType: "all" as "all" | "breakfast" | "lunch" | "dinner",
    areaId: "all" as string,
    timeSlot: "all" as string,
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch all kitchen orders
  const { data: allOrdersData, isLoading: ordersLoading, error: ordersError, refetch } = useQuery({
    queryKey: ["/api/kitchen/orders"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 2,
    retryDelay: 1000,
    onError: (error: any) => {
      toast({
        title: "Failed to Load Orders",
        description: error?.message || "Unable to fetch orders. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Transform orders data
  const allOrders = Array.isArray(allOrdersData) ? allOrdersData.map((order: any) => ({
    id: order.id,
    orderNumber: order.id?.substring(0, 8).toUpperCase() || "N/A",
    clientName: order.clientName || order.client_name || "Unknown",
    status: (order.status || order.kitchen_status || "pending") as Order["status"],
    priority: (order.priority || "medium") as Order["priority"],
    estimatedTime: order.estimated_time || 30,
    createdAt: order.created_at || order.createdAt || new Date().toISOString(),
    items: order.items || [],
    mealType: order.meal_type || order.mealType,
    dietPlan: order.diet_plan || order.dietPlan,
    specialInstructions: order.special_instructions || order.notes || order.specialInstructions,
    clientAddress: order.clientAddress || order.client_address,
    clientPhone: order.clientPhone || order.client_phone,
    clientEmail: order.clientEmail || order.client_email,
    deliveryAgentId: order.deliveryAgentId || order.delivery_agent_id,
    deliveryAgentName: order.deliveryAgentName || order.delivery_agent_name,
    assignedAt: order.assignedAt || order.assigned_at,
    preparedAt: order.preparedAt || order.prepared_at,
    packedAt: order.packedAt || order.packed_at,
    notes: order.notes,
  })) : [];
  
  // Fetch kitchen stats
  const { data: kitchenStatsData } = useQuery({
    queryKey: ["/api/kitchen/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch areas for filtering
  const { data: areasData, error: areasError } = useQuery({
    queryKey: ["/api/areas?is_active=true"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch production view
  const { data: productionData, isLoading: productionLoading, error: productionError, refetch: refetchProduction } = useQuery({
    queryKey: ["/api/kitchen/production-view", viewFilters.mealType, viewFilters.areaId, viewFilters.date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewFilters.mealType !== "all") params.append("meal_type", viewFilters.mealType);
      if (viewFilters.areaId !== "all") params.append("area_id", viewFilters.areaId);
      if (viewFilters.date) params.append("target_date", viewFilters.date);
      try {
        const res = await apiRequest("GET", `/api/kitchen/production-view?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch production view: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch production view");
      }
    },
    enabled: selectedTab === "production",
    retry: 2,
    retryDelay: 1000,
  });

  // Handle production view error
  useEffect(() => {
    if (productionError) {
      toast({
        title: "Failed to Load Production View",
        description: productionError instanceof Error ? productionError.message : "Unable to fetch production data. Please try again.",
        variant: "destructive",
      });
    }
  }, [productionError, toast]);

  // Fetch packing view
  const { data: packingData, isLoading: packingLoading, error: packingError, refetch: refetchPacking } = useQuery({
    queryKey: ["/api/kitchen/packing-view", viewFilters.mealType, viewFilters.areaId, viewFilters.date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewFilters.mealType !== "all") params.append("meal_type", viewFilters.mealType);
      if (viewFilters.areaId !== "all") params.append("area_id", viewFilters.areaId);
      if (viewFilters.date) params.append("target_date", viewFilters.date);
      try {
        const res = await apiRequest("GET", `/api/kitchen/packing-view?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch packing view: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch packing view");
      }
    },
    enabled: selectedTab === "packing",
    retry: 2,
    retryDelay: 1000,
  });

  // Handle packing view error
  useEffect(() => {
    if (packingError) {
      toast({
        title: "Failed to Load Packing View",
        description: packingError instanceof Error ? packingError.message : "Unable to fetch packing data. Please try again.",
        variant: "destructive",
      });
    }
  }, [packingError, toast]);

  // Fetch dispatch view
  const { data: dispatchData, isLoading: dispatchLoading, error: dispatchError, refetch: refetchDispatch } = useQuery({
    queryKey: ["/api/kitchen/dispatch-view", viewFilters.mealType, viewFilters.date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewFilters.mealType !== "all") params.append("meal_type", viewFilters.mealType);
      if (viewFilters.date) params.append("target_date", viewFilters.date);
      try {
        const res = await apiRequest("GET", `/api/kitchen/dispatch-view?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch dispatch view: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch dispatch view");
      }
    },
    enabled: selectedTab === "dispatch",
    retry: 2,
    retryDelay: 1000,
  });

  // Handle dispatch view error
  useEffect(() => {
    if (dispatchError) {
      toast({
        title: "Failed to Load Dispatch View",
        description: dispatchError instanceof Error ? dispatchError.message : "Unable to fetch dispatch data. Please try again.",
        variant: "destructive",
      });
    }
  }, [dispatchError, toast]);

  // Real-time updates
  useRealtime({
    events: [
      "order.created",
      "order.updated",
      "kitchen_order_status_update",
      "order_status_changed",
      "meal.preparing",
      "meal.packed",
      "meal.delivered",
      "daily.meals_assigned",
      "kitchen_queue_updated",
      "delivery_assigned",
      "batch.created",
      "batch.ready_for_pickup",
      "batch.assigned",
      "order.picked_up",
      "order.delivered",
      "batch.pickup_complete",
      "batch.completed",
      "order.label_printed",
      "order.label_scanned",
    ],
    channels: ["kitchen"],
    userRole: "kitchen",
    userId: user?.id || undefined,
    invalidateQueries: [
      ["/api/kitchen/orders"],
      ["/api/kitchen/stats"],
      ["/api/kitchen/production-view"],
      ["/api/kitchen/packing-view"],
      ["/api/kitchen/dispatch-view"]
    ],
    onEvent: (event) => {
      refetch();
      if (selectedTab === "production") {
        refetchProduction();
      }
      if (selectedTab === "packing") {
        refetchPacking();
      }
      if (selectedTab === "dispatch") {
        refetchDispatch();
      }
      
      if (event.type === 'meal.preparing' || event.type === 'MEAL_PREPARING') {
        // Track preparation start time
        const orderId = event.data?.order_id || event.data?.orderId;
        if (orderId) {
          setPreparationStartTimes(prev => new Map(prev).set(orderId, Date.now()));
        }
        const clientName = event.data?.client_name || event.data?.clientName || "";
        toast({
          title: "🍳 Preparation Started",
          description: `Order ${orderId?.substring(0, 8).toUpperCase() || ""}${clientName ? ` for ${clientName}` : ""} is being prepared`,
        });
      } else if (event.type === 'meal.packed' || event.type === 'MEAL_PACKED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        const clientName = event.data?.client_name || event.data?.clientName || "";
        toast({
          title: "📦 Order Packed",
          description: `Order ${orderId?.substring(0, 8).toUpperCase() || ""}${clientName ? ` for ${clientName}` : ""} is packed and ready`,
        });
      } else if (event.type === 'order.created' || event.type === 'ORDER_CREATED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        const clientName = event.data?.client_name || event.data?.clientName || "";
        toast({
          title: "📦 New Order",
          description: `New order ${orderId?.substring(0, 8).toUpperCase() || ""}${clientName ? ` for ${clientName}` : ""} added to queue`,
        });
      } else if (event.type === 'delivery_assigned' || event.type === 'DELIVERY_ASSIGNED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        const agentName = event.data?.delivery_agent_name || event.data?.deliveryAgentName || "delivery agent";
        toast({
          title: "🚚 Delivery Assigned",
          description: `Order ${orderId?.substring(0, 8).toUpperCase() || ""} assigned to ${agentName}`,
        });
      } else if (event.type === 'order.label_printed' || event.type === 'ORDER_LABEL_PRINTED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        toast({
          title: "🏷️ Label Printed",
          description: `Label printed for order ${orderId?.substring(0, 8).toUpperCase() || ""}`,
        });
      } else if (event.type === 'order.label_scanned' || event.type === 'ORDER_LABEL_SCANNED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        toast({
          title: "✅ Label Scanned",
          description: `Order ${orderId?.substring(0, 8).toUpperCase() || ""} scanned and ready for pickup`,
        });
      } else if (event.type === 'batch.created' || event.type === 'BATCH_CREATED') {
        const batchId = event.data?.batch_id || event.data?.batchId || "";
        toast({
          title: "📦 Batch Created",
          description: `New batch ${batchId?.substring(0, 8).toUpperCase() || ""} created`,
        });
      } else if (event.type === 'batch.ready_for_pickup' || event.type === 'BATCH_READY_FOR_PICKUP') {
        const batchId = event.data?.batch_id || event.data?.batchId || "";
        toast({
          title: "✅ Batch Ready",
          description: `Batch ${batchId?.substring(0, 8).toUpperCase() || ""} is ready for pickup`,
        });
      }
    },
    showToast: false,
  });

  // Update order status mutations
  const startPreparingMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("PATCH", `/api/kitchen/orders/${orderId}/start-preparing`);
      return await res.json();
    },
    onSuccess: (data, orderId) => {
      setPreparationStartTimes(prev => new Map(prev).set(orderId, Date.now()));
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/stats"] });
      toast({ title: "Order Started", description: "Order is now being prepared" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to start preparing order",
        variant: "destructive"
      });
    }
  });

  const markPackedMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("PATCH", `/api/kitchen/meal/${orderId}/mark-packed`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/stats"] });
      toast({ title: "Order Packed", description: "Order is packed and ready for pickup" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark order packed",
        variant: "destructive"
      });
    }
  });

  const markReadyMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("PATCH", `/api/kitchen/orders/${orderId}/mark-ready`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/stats"] });
      toast({ title: "Order Ready", description: "Delivery agents have been notified" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark order ready",
        variant: "destructive"
      });
    }
  });

  const notifyDeliveryMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Use mark-ready endpoint which already notifies delivery agents
      const res = await apiRequest("PATCH", `/api/kitchen/orders/${orderId}/mark-ready`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/stats"] });
      toast({ title: "Delivery Agents Notified", description: "All delivery agents have been notified about this order" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to notify delivery agents",
        variant: "destructive"
      });
    }
  });

  const bulkMarkPackedMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const promises = orderIds.map(id => 
        apiRequest("PATCH", `/api/kitchen/meal/${id}/mark-packed`)
      );
      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      setSelectedOrders(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/stats"] });
      toast({ title: "Orders Packed", description: `${selectedOrders.size} orders marked as packed` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark orders as packed",
        variant: "destructive"
      });
    }
  });

  const bulkMarkReadyMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const promises = orderIds.map(id => 
        apiRequest("PATCH", `/api/kitchen/orders/${id}/mark-ready`)
      );
      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      setSelectedOrders(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/stats"] });
      toast({ title: "Orders Ready", description: `${selectedOrders.size} orders marked as ready` });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark orders as ready",
        variant: "destructive"
      });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}`, {
        notes: note,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      toast({ title: "Note Added", description: "Note has been added to the order" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive"
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "preparing":
        return "bg-blue-500";
      case "packed":
        return "bg-purple-500";
      case "ready":
        return "bg-green-500";
      case "assigned":
        return "bg-indigo-500";
      case "completed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Apply filters
    if (filters.mealType !== "all") {
      filtered = filtered.filter(o => o.mealType === filters.mealType);
    }
    if (filters.priority !== "all") {
      filtered = filtered.filter(o => o.priority === filters.priority);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(o => 
        o.clientName.toLowerCase().includes(searchLower) ||
        o.orderNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case "time":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "client":
          comparison = a.clientName.localeCompare(b.clientName);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [allOrders, filters, sortBy, sortOrder]);

  const queueOrders = filteredAndSortedOrders.filter((o) => o.status === "pending");
  const preparingOrders = filteredAndSortedOrders.filter((o) => o.status === "preparing");
  const packedOrders = filteredAndSortedOrders.filter((o) => o.status === "packed");
  const readyOrders = filteredAndSortedOrders.filter((o) => o.status === "ready" || o.status === "assigned");

  // Calculate preparation time for an order
  const getPreparationTime = (order: Order) => {
    if (order.status !== "preparing") return null;
    const startTime = preparationStartTimes.get(order.id) || (order.preparedAt ? new Date(order.preparedAt).getTime() : Date.now());
    const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60); // minutes
    return elapsed;
  };

  // Use stats from API if available, otherwise calculate from orders
  const stats = kitchenStatsData ? {
    total: (kitchenStatsData as any).total_active || allOrders.length,
    queue: (kitchenStatsData as any).pending_orders || queueOrders.length,
    preparing: (kitchenStatsData as any).preparing_orders || preparingOrders.length,
    packed: packedOrders.length,
    ready: (kitchenStatsData as any).ready_orders || readyOrders.length,
    completedToday: (kitchenStatsData as any).completed_today || 0,
  } : {
    total: allOrders.length,
    queue: queueOrders.length,
    preparing: preparingOrders.length,
    packed: packedOrders.length,
    ready: readyOrders.length,
    completedToday: 0,
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (orders: Order[]) => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrderDetails(order);
    setShowOrderDetails(true);
  };

  const handleBulkMarkPacked = () => {
    if (selectedOrders.size === 0) return;
    bulkMarkPackedMutation.mutate(Array.from(selectedOrders));
  };

  const handleBulkMarkReady = () => {
    if (selectedOrders.size === 0) return;
    bulkMarkReadyMutation.mutate(Array.from(selectedOrders));
  };

  const handleAddNote = (orderId: string, note: string) => {
    if (!note.trim()) return;
    addNoteMutation.mutate({ orderId, note });
  };

  const navigationItems = getKitchenNavigationItems(handleTabChange);

  return (
    <div className="min-h-screen bg-background flex">
      <PortalNavigation
        items={navigationItems}
        activeItem={selectedTab}
        portalTheme={theme}
        variant="sidebar"
      />
      
      <div className="flex-1 lg:ml-64">
        <motion.div
          variants={pageTransitionVariants}
          initial="hidden"
          animate="visible"
          className={`min-h-screen ${theme.background} ${theme.text} p-4 sm:p-6 lg:p-8`}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${theme.headerText}`}>Kitchen Portal</h1>
            <p className={theme.textColor}>Manage and track order preparation</p>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatsCard
            title="Total Orders"
            value={stats.total}
            icon={ChefHat}
            trend={stats.total > 0 ? "+" : ""}
            color={theme.primary}
          />
          <StatsCard
            title="In Queue"
            value={stats.queue}
            icon={Clock}
            color={theme.secondary}
          />
          <StatsCard
            title="Preparing"
            value={stats.preparing}
            icon={Package}
            color={theme.accent}
          />
          <StatsCard
            title="Packed"
            value={stats.packed}
            icon={Package}
            color="purple"
          />
          <StatsCard
            title="Ready"
            value={stats.ready}
            icon={TrendingUp}
            color={theme.success}
          />
        </div>

        {/* Filters and Bulk Actions */}
        <Card className="mb-4 rounded-2xl shadow-sm border border-border">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-2 flex-1">
                <Input
                  placeholder="Search by order number or client..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="max-w-xs"
                />
                <Select 
                  value={selectedTab === "production" || selectedTab === "packing" || selectedTab === "dispatch" ? viewFilters.mealType : filters.mealType} 
                  onValueChange={(v) => {
                    if (selectedTab === "production" || selectedTab === "packing" || selectedTab === "dispatch") {
                      setViewFilters(prev => ({ ...prev, mealType: v as any }));
                    } else {
                      setFilters(prev => ({ ...prev, mealType: v }));
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Meal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meals</SelectItem>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
                {(selectedTab === "production" || selectedTab === "packing" || selectedTab === "dispatch") && (
                  <Select 
                    value={viewFilters.areaId} 
                    onValueChange={(v) => setViewFilters(prev => ({ ...prev, areaId: v }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {Array.isArray(areasData) && areasData.length > 0 && areasData.map((area: any) => (
                        area?.id && area?.name ? (
                          <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {(selectedTab === "production" || selectedTab === "packing" || selectedTab === "dispatch") && (
                  <Input
                    type="date"
                    value={viewFilters.date}
                    onChange={(e) => setViewFilters(prev => ({ ...prev, date: e.target.value }))}
                    className="w-[140px]"
                  />
                )}
                {selectedTab !== "production" && selectedTab !== "packing" && selectedTab !== "dispatch" && (
                  <>
                    <Select value={filters.priority} onValueChange={(v) => setFilters(prev => ({ ...prev, priority: v }))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      {sortOrder === "asc" ? "Asc" : "Desc"}
                    </Button>
                  </>
                )}
              </div>
              {selectedOrders.size > 0 && (selectedTab === "queue" || selectedTab === "preparing" || selectedTab === "packed" || selectedTab === "ready") && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkPacked}
                    disabled={bulkMarkPackedMutation.isPending}
                  >
                    Mark {selectedOrders.size} as Packed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkReady}
                    disabled={bulkMarkReadyMutation.isPending}
                  >
                    Mark {selectedOrders.size} as Ready
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="production">Production</TabsTrigger>
                <TabsTrigger value="packing">Packing</TabsTrigger>
                <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
                <TabsTrigger value="queue">Queue ({stats.queue})</TabsTrigger>
                <TabsTrigger value="preparing">Preparing ({stats.preparing})</TabsTrigger>
                <TabsTrigger value="packed">Packed ({stats.packed})</TabsTrigger>
                <TabsTrigger value="ready">Ready ({stats.ready})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Active</p>
                            <p className="text-2xl font-bold text-primary">{stats.total}</p>
                          </div>
                          <ChefHat className="w-8 h-8 text-primary opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">In Queue</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.queue}</p>
                          </div>
                          <Clock className="w-8 h-8 text-yellow-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Preparing</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.preparing}</p>
                          </div>
                          <Package className="w-8 h-8 text-blue-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-purple-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Packed</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.packed}</p>
                          </div>
                          <Package className="w-8 h-8 text-purple-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Ready</p>
                            <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
                
                {stats.completedToday > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Completed Today</p>
                            <p className="text-2xl font-bold text-gray-700">{stats.completedToday}</p>
                          </div>
                          <Users className="w-8 h-8 text-primary opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                
                {queueOrders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-border">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
                        <CardTitle>Recent Queue Orders</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {queueOrders.slice(0, 5).map((order, idx) => (
                            <motion.div
                              key={order.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.8 + idx * 0.1 }}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                                <p className="text-sm text-muted-foreground">{order.clientName}</p>
                              </div>
                              <Badge className={`${getPriorityColor(order.priority)} text-white`}>
                                {order.priority}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="production" className="space-y-4 mt-4">
                {productionLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading production view...</p>
                    </div>
                  </div>
                ) : productionError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
                    <p className="text-destructive mb-4 font-medium">Failed to load production view</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {productionError instanceof Error ? productionError.message : "Unable to fetch production data"}
                    </p>
                    <Button onClick={() => refetchProduction()} variant="outline" className="hover:bg-gray-100">
                      Retry
                    </Button>
                  </div>
                ) : productionData === undefined || productionData === null ? (
                  <EmptyState
                    icon={ChefHat}
                    title="No Production Data Available"
                    description="Unable to load production data. Please try refreshing the page."
                  />
                ) : Array.isArray(productionData) && productionData.length === 0 ? (
                  <EmptyState
                    icon={ChefHat}
                    title="No Dishes to Prepare"
                    description="There are no dishes scheduled for preparation. Check back later for new orders."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full border-collapse bg-white">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr className="border-b">
                          <th className="text-left p-4 font-semibold text-gray-700">Dish Name</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Meal</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Total Portions</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Customizations</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Allergen Notes</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(productionData) && productionData.map((dish: any, idx: number) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-colors"
                          >
                            <td className="p-4 font-medium text-gray-900">{dish.dish_name || dish.dishName}</td>
                            <td className="p-4">
                              <Badge variant="outline" className="capitalize">{dish.meal_type || dish.mealType}</Badge>
                            </td>
                            <td className="p-4 font-semibold text-lg text-primary">{dish.total_portions || dish.totalPortions || 0}</td>
                            <td className="p-4 text-sm">
                              {Object.keys(dish.customizations_summary || dish.customizationsSummary || {}).length > 0 ? (
                                <div className="space-y-1">
                                  {Object.entries(dish.customizations_summary || dish.customizationsSummary || {}).map(([key, value]: [string, any]) => (
                                    <div key={key} className="text-xs bg-gray-50 px-2 py-1 rounded">
                                      {key}: {value}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">None</span>
                              )}
                            </td>
                            <td className="p-4 text-sm">
                              {(dish.allergen_notes || dish.allergenNotes) && (dish.allergen_notes || dish.allergenNotes).length > 0 ? (
                                <div className="space-y-1">
                                  {(dish.allergen_notes || dish.allergenNotes).map((note: string, i: number) => (
                                    <Badge key={i} variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                      {note}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">None</span>
                              )}
                            </td>
                            <td className="p-4">
                              <Badge className={`${dish.status === "in_prep" || dish.status === "inPrep" ? "bg-blue-600" : dish.status === "ready" ? "bg-green-600" : "bg-gray-500"} text-white`}>
                                {dish.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // TODO: Expand to show individual orders
                                  toast({ 
                                    title: "Individual Orders", 
                                    description: `${(dish.individual_orders || dish.individualOrders || []).length} orders for this dish` 
                                  });
                                }}
                                className="hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View ({(dish.individual_orders || dish.individualOrders || []).length})
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="packing" className="space-y-4 mt-4">
                {packingLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading packing view...</p>
                    </div>
                  </div>
                ) : packingError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
                    <p className="text-destructive mb-4 font-medium">Failed to load packing view</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {packingError instanceof Error ? packingError.message : "Unable to fetch packing data"}
                    </p>
                    <Button onClick={() => refetchPacking()} variant="outline" className="hover:bg-gray-100">
                      Retry
                    </Button>
                  </div>
                ) : packingData === undefined || packingData === null ? (
                  <EmptyState
                    icon={Package}
                    title="No Packing Data Available"
                    description="Unable to load packing data. Please try refreshing the page."
                  />
                ) : Array.isArray(packingData) && packingData.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No Orders to Pack"
                    description="All orders have been packed. Check back later for new orders."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full border-collapse bg-white">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr className="border-b">
                          <th className="text-left p-4 font-semibold text-gray-700">User</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Area</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Meal</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Dish</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Customizations</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Ready By</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Label</th>
                          <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(packingData) && packingData.map((order: any, idx: number) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-colors"
                          >
                            <td className="p-4">
                              <div>
                                <div className="font-medium text-gray-900">{order.user_name || order.userName}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <Phone className="w-3 h-3" />
                                  {order.user_phone || order.userPhone || "N/A"}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{order.area || order.areaName || "N/A"}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="capitalize">{order.meal_type || order.mealType}</Badge>
                            </td>
                            <td className="p-4 font-medium">{order.dish_name || order.dishName}</td>
                            <td className="p-4 text-sm text-gray-600 max-w-xs">
                              <div className="truncate" title={order.customizations || "None"}>
                                {order.customizations || <span className="text-gray-400 italic">None</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className={`${getStatusColor(order.status)} text-white`}>
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm">
                              {order.ready_by || order.readyBy ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(order.ready_by || order.readyBy).toLocaleTimeString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="p-4">
                              {order.label_printed || order.labelPrinted ? (
                                <Badge className="bg-green-600 text-white">Printed</Badge>
                              ) : (
                                <Badge variant="outline">Not Printed</Badge>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const orderId = order.order_id || order.orderId;
                                      await apiRequest("POST", `/api/kitchen/orders/${orderId}/print-label`);
                                      toast({ title: "Label Printed", description: "Label marked as printed" });
                                      refetchPacking();
                                    } catch (error: any) {
                                      toast({ 
                                        title: "Error", 
                                        description: error?.message || "Failed to print label", 
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  className="hover:bg-gray-100"
                                >
                                  Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const orderId = order.order_id || order.orderId;
                                      await apiRequest("POST", `/api/kitchen/orders/${orderId}/scan-label`);
                                      toast({ title: "Label Scanned", description: "Order ready for pickup" });
                                      refetchPacking();
                                    } catch (error: any) {
                                      toast({ 
                                        title: "Error", 
                                        description: error?.message || "Failed to scan label", 
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                  disabled={!(order.label_printed || order.labelPrinted)}
                                  className="hover:bg-gray-100"
                                >
                                  Scan
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dispatch" className="space-y-4 mt-4">
                {dispatchLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading dispatch view...</p>
                    </div>
                  </div>
                ) : dispatchError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
                    <p className="text-destructive mb-4 font-medium">Failed to load dispatch view</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {dispatchError instanceof Error ? dispatchError.message : "Unable to fetch dispatch data"}
                    </p>
                    <Button onClick={() => refetchDispatch()} variant="outline" className="hover:bg-gray-100">
                      Retry
                    </Button>
                  </div>
                ) : dispatchData === undefined || dispatchData === null ? (
                  <EmptyState
                    icon={Truck}
                    title="No Dispatch Data Available"
                    description="Unable to load dispatch data. Please try refreshing the page."
                  />
                ) : Array.isArray(dispatchData) && dispatchData.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="No Batches to Dispatch"
                    description="There are no batches ready for dispatch. Packed orders will be grouped into batches."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {Array.isArray(dispatchData) && dispatchData.map((batch: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-green-50/30">
                          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
                            <CardTitle className="flex items-center justify-between">
                              <span className="font-semibold">{batch.area_name || batch.areaName} - {batch.meal_type || batch.mealType}</span>
                              <Badge className={`${(batch.status === "ready_for_pickup" || batch.status === "readyForPickup") ? "bg-green-600" : "bg-gray-500"} text-white`}>
                                {batch.status}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-5 md:p-6 space-y-4">
                            <div className="text-sm">
                              <p className="text-muted-foreground mb-1">Timeslot:</p>
                              <p className="font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {(batch.timeslot?.start || batch.timeslotStart) ? new Date(batch.timeslot?.start || batch.timeslotStart).toLocaleTimeString() : "N/A"} - 
                                {(batch.timeslot?.end || batch.timeslotEnd) ? new Date(batch.timeslot?.end || batch.timeslotEnd).toLocaleTimeString() : "N/A"}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="p-2 bg-gray-50 rounded-lg">
                                <p className="text-muted-foreground text-xs">Total Orders</p>
                                <p className="font-semibold text-lg text-gray-900">{batch.total_orders || batch.totalOrders || 0}</p>
                              </div>
                              <div className="p-2 bg-green-50 rounded-lg">
                                <p className="text-muted-foreground text-xs">Ready</p>
                                <p className="font-semibold text-lg text-green-600">{batch.ready_count || batch.readyCount || 0}</p>
                              </div>
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <p className="text-muted-foreground text-xs">Packed</p>
                                <p className="font-semibold text-lg text-blue-600">{batch.packed_count || batch.packedCount || 0}</p>
                              </div>
                              <div className="p-2 bg-purple-50 rounded-lg">
                                <p className="text-muted-foreground text-xs">Picked</p>
                                <p className="font-semibold text-lg text-purple-600">{batch.picked_count || batch.pickedCount || 0}</p>
                              </div>
                            </div>

                            {(batch.assigned_rider || batch.assignedRider) && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-muted-foreground mb-1">Assigned Rider</p>
                                <p className="font-medium text-blue-900">{(batch.assigned_rider || batch.assignedRider).name}</p>
                                <p className="text-xs mt-1">
                                  <Badge variant="outline" className={`${(batch.assigned_rider || batch.assignedRider).is_online || (batch.assigned_rider || batch.assignedRider).isOnline ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}`}>
                                    {(batch.assigned_rider || batch.assignedRider).status}
                                  </Badge>
                                </p>
                              </div>
                            )}

                            {(batch.eta_to_kitchen || batch.etaToKitchen) && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ETA to Kitchen: {new Date(batch.eta_to_kitchen || batch.etaToKitchen).toLocaleTimeString()}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 hover:bg-gray-100"
                                onClick={() => {
                                  // TODO: Show orders list modal
                                  toast({ 
                                    title: "Orders List", 
                                    description: `${(batch.orders_list || batch.ordersList || []).length} orders in this batch` 
                                  });
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Orders
                              </Button>
                              {(batch.assigned_rider || batch.assignedRider) && (
                                <Button
                                  size="sm"
                                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                                  onClick={async () => {
                                    try {
                                      const batchId = batch.batch_id || batch.batchId;
                                      await apiRequest("POST", `/api/batches/${batchId}/notify-rider`);
                                      toast({ title: "Rider Notified", description: "Delivery agent has been notified" });
                                      refetchDispatch();
                                    } catch (error: any) {
                                      toast({ 
                                        title: "Error", 
                                        description: error?.message || "Failed to notify rider", 
                                        variant: "destructive" 
                                      });
                                    }
                                  }}
                                >
                                  <Truck className="w-4 h-4 mr-2" />
                                  Notify
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="queue" className="space-y-4 mt-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  </div>
                ) : queueOrders.length === 0 ? (
                  <EmptyState
                    icon={ChefHat}
                    title="No Orders in Queue"
                    description="The order queue is empty. New orders will appear here when they're ready for preparation."
                  />
                ) : (
                  queueOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                        <CardContent className="p-4 md:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={() => handleSelectOrder(order.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                                  <Badge className={`${getPriorityColor(order.priority)} text-white`}>
                                    {order.priority}
                                  </Badge>
                                  <Badge className={`${getStatusColor(order.status)} text-white`}>
                                    {order.status}
                                  </Badge>
                                  {order.mealType && (
                                    <Badge variant="outline" className="capitalize">{order.mealType}</Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-700">{order.clientName}</p>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Created: {new Date(order.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                                className="hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Details
                              </Button>
                              <Button
                                onClick={() => startPreparingMutation.mutate(order.id)}
                                disabled={startPreparingMutation.isPending}
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                              >
                                <ChefHat className="w-4 h-4 mr-2" />
                                {startPreparingMutation.isPending ? "Starting..." : "Start Preparing"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="preparing" className="space-y-4 mt-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  </div>
                ) : preparingOrders.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No Orders Being Prepared"
                    description="There are currently no orders in preparation. Start preparing orders from the queue."
                  />
                ) : (
                  preparingOrders.map((order) => {
                    const prepTime = getPreparationTime(order);
                    const progress = prepTime ? Math.min((prepTime / (order.estimatedTime || 30)) * 100, 100) : 50;
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-blue-50/30">
                          <CardContent className="p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <Checkbox
                                  checked={selectedOrders.has(order.id)}
                                  onCheckedChange={() => handleSelectOrder(order.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                                    <Badge className={`${getPriorityColor(order.priority)} text-white`}>
                                      {order.priority}
                                    </Badge>
                                    {order.mealType && (
                                      <Badge variant="outline" className="capitalize">{order.mealType}</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-gray-700">{order.clientName}</p>
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                      <span className="font-medium">Preparation Progress</span>
                                      {prepTime !== null && (
                                        <span className="font-semibold">{prepTime} min / {order.estimatedTime || 30} min</span>
                                      )}
                                    </div>
                                    <Progress value={progress} className="w-full h-2" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(order)}
                                  className="hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Details
                                </Button>
                                <Button
                                  onClick={() => markPackedMutation.mutate(order.id)}
                                  disabled={markPackedMutation.isPending}
                                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  {markPackedMutation.isPending ? "Marking..." : "Mark as Packed"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="packed" className="space-y-4 mt-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  </div>
                ) : packedOrders.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No Orders Packed"
                    description="No orders have been packed yet. Pack orders from the preparing tab."
                  />
                ) : (
                  packedOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-purple-50/30">
                        <CardContent className="p-4 md:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={() => handleSelectOrder(order.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                                  <Badge className="bg-purple-600 text-white">Packed</Badge>
                                  <Badge className={`${getPriorityColor(order.priority)} text-white`}>
                                    {order.priority}
                                  </Badge>
                                  {order.mealType && (
                                    <Badge variant="outline" className="capitalize">{order.mealType}</Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-700">{order.clientName}</p>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Packed: {order.packedAt ? new Date(order.packedAt).toLocaleString() : "Just now"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                                className="hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Details
                              </Button>
                              <Button
                                onClick={() => markReadyMutation.mutate(order.id)}
                                disabled={markReadyMutation.isPending}
                                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                {markReadyMutation.isPending ? "Notifying..." : "Notify Delivery"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="ready" className="space-y-4 mt-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  </div>
                ) : readyOrders.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No Orders Ready for Pickup"
                    description="No orders are ready for delivery pickup. Packed orders will appear here."
                  />
                ) : (
                  readyOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-green-50/30">
                        <CardContent className="p-4 md:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={selectedOrders.has(order.id)}
                                onCheckedChange={() => handleSelectOrder(order.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-lg">#{order.orderNumber}</h3>
                                  <Badge className="bg-green-600 text-white">Ready</Badge>
                                  {order.deliveryAgentName && (
                                    <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                                      <Truck className="w-3 h-3" />
                                      {order.deliveryAgentName}
                                    </Badge>
                                  )}
                                  {order.mealType && (
                                    <Badge variant="outline" className="capitalize">{order.mealType}</Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-700">{order.clientName}</p>
                                <div className="mt-1 space-y-1">
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Ready: {order.packedAt ? new Date(order.packedAt).toLocaleString() : new Date(order.createdAt).toLocaleString()}
                                  </p>
                                  {order.deliveryAgentName && order.assignedAt && (
                                    <p className="text-xs text-blue-600 flex items-center gap-1">
                                      <Truck className="w-3 h-3" />
                                      Assigned to {order.deliveryAgentName} at {new Date(order.assignedAt).toLocaleString()}
                                    </p>
                                  )}
                                  {!order.deliveryAgentName && (
                                    <p className="text-xs text-orange-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Waiting for delivery agent pickup
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(order)}
                                className="hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Details
                              </Button>
                              {!order.deliveryAgentName && (
                                <Button
                                  variant="outline"
                                  onClick={() => notifyDeliveryMutation.mutate(order.id)}
                                  disabled={notifyDeliveryMutation.isPending}
                                  className="w-full sm:w-auto border-blue-600 text-blue-600 hover:bg-blue-50"
                                >
                                  <Truck className="w-4 h-4 mr-2" />
                                  {notifyDeliveryMutation.isPending ? "Notifying..." : "Notify Delivery"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrderDetails?.orderNumber}</DialogTitle>
            <DialogDescription>
              Complete information about this order
            </DialogDescription>
          </DialogHeader>
          {selectedOrderDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedOrderDetails.status)}>
                    {selectedOrderDetails.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Badge className={getPriorityColor(selectedOrderDetails.priority)}>
                    {selectedOrderDetails.priority}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Client Information</Label>
                <div className="mt-1 space-y-1">
                  <p className="font-medium">{selectedOrderDetails.clientName}</p>
                  {selectedOrderDetails.clientEmail && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {selectedOrderDetails.clientPhone || "N/A"}
                    </p>
                  )}
                  {selectedOrderDetails.clientEmail && (
                    <p className="text-sm text-gray-600">{selectedOrderDetails.clientEmail}</p>
                  )}
                  {selectedOrderDetails.clientAddress && (
                    <p className="text-sm text-gray-600 flex items-start gap-2">
                      <MapPin className="w-3 h-3 mt-0.5" />
                      {selectedOrderDetails.clientAddress}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Meal Information</Label>
                <div className="mt-1 space-y-1">
                  {selectedOrderDetails.mealType && (
                    <p className="text-sm">
                      <span className="font-medium">Meal Type:</span> {selectedOrderDetails.mealType}
                    </p>
                  )}
                  {selectedOrderDetails.dietPlan && (
                    <p className="text-sm">
                      <span className="font-medium">Diet Plan:</span> {selectedOrderDetails.dietPlan}
                    </p>
                  )}
                </div>
              </div>

              {selectedOrderDetails.specialInstructions && (
                <div>
                  <Label className="text-xs text-muted-foreground">Special Instructions</Label>
                  <p className="text-sm mt-1 p-2 bg-yellow-50 rounded border border-yellow-200">
                    {selectedOrderDetails.specialInstructions}
                  </p>
                </div>
              )}

              {selectedOrderDetails.deliveryAgentName && (
                <div>
                  <Label className="text-xs text-muted-foreground">Delivery Agent</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{selectedOrderDetails.deliveryAgentName}</span>
                    {selectedOrderDetails.assignedAt && (
                      <span className="text-xs text-gray-500">
                        (Assigned: {new Date(selectedOrderDetails.assignedAt).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Timeline</Label>
                <div className="mt-1 space-y-1 text-sm">
                  <p>Created: {new Date(selectedOrderDetails.createdAt).toLocaleString()}</p>
                  {selectedOrderDetails.preparedAt && (
                    <p>Started Preparing: {new Date(selectedOrderDetails.preparedAt).toLocaleString()}</p>
                  )}
                  {selectedOrderDetails.packedAt && (
                    <p>Packed: {new Date(selectedOrderDetails.packedAt).toLocaleString()}</p>
                  )}
                  {selectedOrderDetails.assignedAt && (
                    <p>Assigned: {new Date(selectedOrderDetails.assignedAt).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Workflow Status Indicator and Actions */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-3 block">Order Workflow</Label>
                
                {/* Visual Workflow Progress */}
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`flex items-center gap-1 ${selectedOrderDetails.status === "pending" ? "text-yellow-600 font-semibold" : selectedOrderDetails.status === "preparing" || selectedOrderDetails.status === "packed" || selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "text-gray-400" : ""}`}>
                    <div className={`w-2 h-2 rounded-full ${selectedOrderDetails.status === "pending" ? "bg-yellow-500" : selectedOrderDetails.status === "preparing" || selectedOrderDetails.status === "packed" || selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "bg-gray-300" : "bg-gray-200"}`} />
                    Pending
                  </div>
                  <div className="w-8 h-px bg-gray-300" />
                  <div className={`flex items-center gap-1 ${selectedOrderDetails.status === "preparing" ? "text-blue-600 font-semibold" : selectedOrderDetails.status === "packed" || selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "text-gray-400" : ""}`}>
                    <div className={`w-2 h-2 rounded-full ${selectedOrderDetails.status === "preparing" ? "bg-blue-500" : selectedOrderDetails.status === "packed" || selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "bg-gray-300" : "bg-gray-200"}`} />
                    Preparing
                  </div>
                  <div className="w-8 h-px bg-gray-300" />
                  <div className={`flex items-center gap-1 ${selectedOrderDetails.status === "packed" ? "text-purple-600 font-semibold" : selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "text-gray-400" : ""}`}>
                    <div className={`w-2 h-2 rounded-full ${selectedOrderDetails.status === "packed" ? "bg-purple-500" : selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "bg-gray-300" : "bg-gray-200"}`} />
                    Packed
                  </div>
                  <div className="w-8 h-px bg-gray-300" />
                  <div className={`flex items-center gap-1 ${selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "text-green-600 font-semibold" : ""}`}>
                    <div className={`w-2 h-2 rounded-full ${selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned" ? "bg-green-500" : "bg-gray-200"}`} />
                    Ready
                  </div>
                </div>

                {/* Current Status Display */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Current Status:</p>
                  <Badge className={getStatusColor(selectedOrderDetails.status)}>
                    {selectedOrderDetails.status.charAt(0).toUpperCase() + selectedOrderDetails.status.slice(1)}
                  </Badge>
                </div>

                {/* Workflow Action Buttons */}
                <div className="space-y-3">
                  {selectedOrderDetails.status === "pending" && (
                    <div>
                      <Button
                        onClick={() => {
                          startPreparingMutation.mutate(selectedOrderDetails.id);
                          setShowOrderDetails(false);
                        }}
                        disabled={startPreparingMutation.isPending}
                        className="w-full"
                      >
                        <ChefHat className="w-4 h-4 mr-2" />
                        Start Preparing Meal
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This will mark the order as being prepared and start the preparation timer.
                      </p>
                    </div>
                  )}
                  
                  {selectedOrderDetails.status === "preparing" && (
                    <div>
                      <Button
                        onClick={() => {
                          markPackedMutation.mutate(selectedOrderDetails.id);
                          setShowOrderDetails(false);
                        }}
                        disabled={markPackedMutation.isPending}
                        className="w-full"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Finished Cooking - Mark as Packed
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This will mark the meal as packed and ready for delivery agent pickup.
                      </p>
                    </div>
                  )}
                  
                  {selectedOrderDetails.status === "packed" && (
                    <div>
                      <Button
                        onClick={() => {
                          markReadyMutation.mutate(selectedOrderDetails.id);
                          setShowOrderDetails(false);
                        }}
                        disabled={markReadyMutation.isPending}
                        className="w-full"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Ready for Pickup - Notify Delivery
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This will notify all delivery agents that the order is ready for pickup.
                      </p>
                    </div>
                  )}
                  
                  {(selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned") && !selectedOrderDetails.deliveryAgentName && (
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          notifyDeliveryMutation.mutate(selectedOrderDetails.id);
                          setShowOrderDetails(false);
                        }}
                        disabled={notifyDeliveryMutation.isPending}
                        className="w-full"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Notify Delivery Agents Again
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Re-send notification to all delivery agents about this order.
                      </p>
                    </div>
                  )}

                  {(selectedOrderDetails.status === "ready" || selectedOrderDetails.status === "assigned") && selectedOrderDetails.deliveryAgentName && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">Delivery Agent Assigned</p>
                      <p className="text-xs text-blue-700">
                        {selectedOrderDetails.deliveryAgentName} has been assigned to this order.
                        {selectedOrderDetails.assignedAt && (
                          <span> Assigned at {new Date(selectedOrderDetails.assignedAt).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Add Note</Label>
                <div className="mt-1 flex gap-2">
                  <Textarea
                    placeholder="Add a note about this order..."
                    className="flex-1"
                    id="order-note"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const noteInput = document.getElementById("order-note") as HTMLTextAreaElement;
                      if (noteInput?.value) {
                        handleAddNote(selectedOrderDetails.id, noteInput.value);
                        noteInput.value = "";
                      }
                    }}
                    disabled={addNoteMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
                {selectedOrderDetails.notes && (
                  <p className="text-sm mt-2 p-2 bg-gray-50 rounded border">
                    <span className="font-medium">Current Notes:</span> {selectedOrderDetails.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
