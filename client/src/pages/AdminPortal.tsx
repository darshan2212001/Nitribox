import { Users, Utensils, TrendingUp, DollarSign, Database, Activity, AlertTriangle, Clock, MapPin, RefreshCw, ShoppingCart, Package, Truck, ChefHat } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { pageTransitionVariants, viewportConfig } from "@/lib/animations";
import { useRealtime } from "@/hooks/use-realtime";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { portalThemes } from "@/lib/ui-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PortalNavigation, { getAdminNavigationItems } from "@/components/PortalNavigation";
import { useAuth } from "@/hooks/useAuth";
import PaymentRefunds from "@/components/PaymentRefunds";
import NutritionistDetailsModal from "@/components/NutritionistDetailsModal";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import NutritionistAllocation from "@/components/admin/NutritionistAllocation";

export default function AdminPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "meal-plans" | "nutritionists" | "clients" | "orders" | "reports" | "settings" | "payments" | "nutritionist-allocation">("dashboard");
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [nutritionistDialogOpen, setNutritionistDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingMealPlan, setEditingMealPlan] = useState<any>(null);
  const [editMealDialogOpen, setEditMealDialogOpen] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState<any>(null);
  const [showNutritionistDetailsModal, setShowNutritionistDetailsModal] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<string | null>(null);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [editingNutritionist, setEditingNutritionist] = useState<any>(null);
  const [editNutritionistDialogOpen, setEditNutritionistDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'meal-plan' | 'nutritionist' | null; id: string | null }>({ type: null, id: null });
  const theme = portalThemes.admin;

  // Type-safe tab change handler
  const handleTabChange = (tab: string) => {
    const validTabs: Array<typeof activeTab> = ["dashboard", "meal-plans", "nutritionists", "clients", "orders", "reports", "settings", "payments", "nutritionist-allocation"];
    if (validTabs.includes(tab as typeof activeTab)) {
      console.log("[Navigation] Changing tab to:", tab);
      setActiveTab(tab as typeof activeTab);
    } else {
      console.warn("[Navigation] Invalid tab value:", tab);
    }
  };
  const [liveOperations, setLiveOperations] = useState<{
    totalMealsToday: number;
    mealsPrepared: number;
    mealsInTransit: number;
    mealsDelivered: number;
    skippedMeals: number;
    avgDeliveryTime: number;
    activeDeliveryAgents: number;
    systemAlerts: Array<{ id: number; type: string; message: string; timestamp: string }>;
  }>({
    totalMealsToday: 0,
    mealsPrepared: 0,
    mealsInTransit: 0,
    mealsDelivered: 0,
    skippedMeals: 0,
    avgDeliveryTime: 0,
    activeDeliveryAgents: 0,
    systemAlerts: []
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Enhanced real-time updates for admin portal
  useRealtime({
    events: [
      "meal_plan_created", "meal_plan_updated", "meal_plan_deleted",
      "MEAL_PLAN_CREATED", "MEAL_PLAN_UPDATED", "MEAL_PLAN_DELETED",
      "client_created", "client_updated",
      "CLIENT_CREATED", "CLIENT_UPDATED",
      "session_created", "session_updated",
      "SESSION_CREATED", "SESSION_UPDATED",
      "order_created", "order_updated",
      "ORDER_CREATED", "ORDER_UPDATED",
      "progress_log_created",
      "PROGRESS_LOG_CREATED",
      "daily.meals_assigned",
      "meal.preparing", "meal.packed", "meal.delivered", "meal.skipped",
      "MEAL_PREPARING", "MEAL_PACKED", "MEAL_DELIVERED", "MEAL_SKIPPED",
      "delivery.assigned", "delivery.completed",
      "DELIVERY_ASSIGNED", "DELIVERY_COMPLETED",
      "weekly.report_ready",
      "subscription.created", "subscription.updated",
      "SUBSCRIPTION_CREATED", "SUBSCRIPTION_UPDATED",
      "consultation.scheduled", "consultation_booked",
      "CONSULTATION_SCHEDULED", "CONSULTATION_BOOKED",
      "payment.completed", "payment.created",
      "PAYMENT_COMPLETED", "PAYMENT_CREATED",
      "batch.created", "batch.ready_for_pickup", "batch.completed",
      "BATCH_CREATED", "BATCH_READY_FOR_PICKUP", "BATCH_COMPLETED",
      "order.label_printed", "order.label_scanned",
      "ORDER_LABEL_PRINTED", "ORDER_LABEL_SCANNED"
    ],
    channels: ["admin"], // Admin uses role-based channel, not user-specific
    userRole: "admin",
    userId: undefined, // Admin doesn't need user-specific channel
    invalidateQueries: [
      ["/api/meal-plans"],
      ["/api/clients"],
      ["/api/sessions"],
      ["/api/orders"],
      ["/api/progress-logs"],
      ["/api/daily-meals/today"],
      ["/api/delivery-tracking"],
      ["/api/subscriptions"],
      ["/api/consultations"],
      ["/api/payments"],
      ["/api/admin/dashboard"],
      ["/api/nutritionists"]
    ],
    onEvent: (event) => {
      setLastUpdate(new Date());
      
      // Handle subscription events (including payments)
      if (event.type === 'subscription.created' || event.type === 'subscription.updated') {
        const eventData = event.data || {};
        const subscriptionId = eventData.subscription_id || eventData.subscriptionId;
        const allocationStatus = eventData.allocation_status || eventData.allocationStatus;
        const paymentStatus = eventData.payment_status || eventData.paymentStatus;
        const paymentId = eventData.payment_id || eventData.paymentId;
        const amount = eventData.amount;
        
        // Handle payment notifications
        if (paymentId || paymentStatus === 'completed') {
          toast({
            title: "💳 New Payment Received",
            description: amount 
              ? `Payment of ₹${amount.toLocaleString('en-IN')} received${subscriptionId ? ` for subscription ${subscriptionId.substring(0, 8)}...` : ''}`
              : `Payment completed${subscriptionId ? ` for subscription ${subscriptionId.substring(0, 8)}...` : ''}`,
          });
        }
        
        // Handle pending allocation notifications
        if (allocationStatus === 'pending_allocation' || eventData.action === 'new_pending_allocation') {
          toast({
            title: "👤 New Subscription Pending Allocation",
            description: `New subscription${subscriptionId ? ` ${subscriptionId.substring(0, 8)}...` : ''} requires nutritionist allocation`,
            action: activeTab !== 'nutritionist-allocation' ? (
              <Button 
                size="sm" 
                onClick={() => setActiveTab('nutritionist-allocation')}
              >
                Allocate Now
              </Button>
            ) : undefined,
          });
        }
        
        // Invalidate subscription queries
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      }
      
      // Handle consultation scheduled events
      if (event.type === 'consultation.scheduled' || event.type === 'consultation_booked') {
        const eventData = event.data || {};
        const date = eventData.date;
        const timeSlot = eventData.time_slot || eventData.timeSlot;
        const clientId = eventData.client_id || eventData.clientId;
        
        toast({
          title: "📅 New Consultation Scheduled",
          description: `Consultation${date ? ` on ${new Date(date).toLocaleDateString()}` : ''}${timeSlot ? ` at ${timeSlot}` : ''}${clientId ? ` for client ${clientId.substring(0, 8)}...` : ''}`,
        });
        
        // Invalidate consultation queries
        queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      }
      
      // Update live operations based on events
      const eventType = event.type;
      if (eventType === 'meal.preparing' || eventType === 'MEAL_PREPARING') {
        setLiveOperations(prev => ({
          ...prev,
          mealsPrepared: prev.mealsPrepared + 1
        }));
        const orderId = event.data?.order_id || event.data?.orderId || "";
        toast({
          title: "🍳 Meal Preparation Started",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""} is being prepared`,
        });
      } else if (eventType === 'meal.packed' || eventType === 'MEAL_PACKED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        toast({
          title: "📦 Meal Packed",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""} has been packed`,
        });
      } else if (eventType === 'meal.delivered' || eventType === 'MEAL_DELIVERED') {
        setLiveOperations(prev => ({
          ...prev,
          mealsDelivered: prev.mealsDelivered + 1,
          mealsInTransit: Math.max(0, prev.mealsInTransit - 1)
        }));
        const orderId = event.data?.order_id || event.data?.orderId || "";
        const clientName = event.data?.client_name || event.data?.clientName || "";
        toast({
          title: "✅ Meal Delivered",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""}${clientName ? ` to ${clientName}` : ""} has been delivered`,
        });
      } else if (eventType === 'meal.skipped' || eventType === 'MEAL_SKIPPED') {
        setLiveOperations(prev => ({
          ...prev,
          skippedMeals: prev.skippedMeals + 1,
          systemAlerts: [...prev.systemAlerts.slice(-4), {
            id: Date.now(),
            type: 'warning',
            message: `Meal skipped: ${event.data?.client_name || event.data?.clientName || event.data?.client_id || event.data?.clientId || 'unknown'}`,
            timestamp: new Date().toISOString()
          }]
        }));
        const clientName = event.data?.client_name || event.data?.clientName || "";
        const mealType = event.data?.meal_type || event.data?.mealType || "";
        toast({
          title: "⚠️ Meal Skipped",
          description: `${clientName || "Client"} skipped their ${mealType || "meal"}`,
          variant: "destructive",
        });
      } else if (eventType === 'delivery.assigned' || eventType === 'DELIVERY_ASSIGNED') {
        setLiveOperations(prev => ({
          ...prev,
          mealsInTransit: prev.mealsInTransit + 1,
          activeDeliveryAgents: prev.activeDeliveryAgents + 1
        }));
        const orderId = event.data?.order_id || event.data?.orderId || "";
        const agentName = event.data?.delivery_agent_name || event.data?.deliveryAgentName || "";
        toast({
          title: "🚚 Delivery Assigned",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""} assigned to ${agentName || "delivery agent"}`,
        });
      } else if (eventType === 'batch.ready_for_pickup' || eventType === 'BATCH_READY_FOR_PICKUP') {
        const batchId = event.data?.batch_id || event.data?.batchId || "";
        toast({
          title: "📦 Batch Ready for Pickup",
          description: `Batch ${batchId ? batchId.substring(0, 8).toUpperCase() : ""} is ready for pickup`,
        });
      } else if (eventType === 'batch.completed' || eventType === 'BATCH_COMPLETED') {
        const batchId = event.data?.batch_id || event.data?.batchId || "";
        toast({
          title: "✅ Batch Completed",
          description: `Batch ${batchId ? batchId.substring(0, 8).toUpperCase() : ""} has been completed`,
        });
      } else if (eventType === 'order.label_printed' || eventType === 'ORDER_LABEL_PRINTED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        toast({
          title: "🏷️ Label Printed",
          description: `Label printed for order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""}`,
        });
      } else if (eventType === 'order.label_scanned' || eventType === 'ORDER_LABEL_SCANNED') {
        const orderId = event.data?.order_id || event.data?.orderId || "";
        toast({
          title: "✅ Label Scanned",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""} label scanned`,
        });
      }
    },
    showToast: false // We handle toasts manually
  });

  // Auto-refresh operations data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-meals/today"] });
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Form states
  const [mealForm, setMealForm] = useState({
    title: "",
    description: "",
    category: "",
    currentPrice: "",
    features: "",
    imageUrl: "",
  });

  const [editMealForm, setEditMealForm] = useState({
    title: "",
    description: "",
    category: "",
    currentPrice: "",
    features: "",
    imageUrl: "",
    isActive: true,
  });

  const [nutritionistForm, setNutritionistForm] = useState({
    name: "",
    email: "",
    specialization: "",
    experience: "",
  });

  const [editNutritionistForm, setEditNutritionistForm] = useState({
    name: "",
    email: "",
    specialization: "",
    experience: "",
    phone: "",
    bio: "",
    city: "",
    tagline: "",
    qualifications: "",
    isAvailable: true,
  });

  const [clientForm, setClientForm] = useState({
    userId: "",
    nutritionistId: "",
    weightStart: "",
    weightGoal: "",
    height: "",
    age: "",
    gender: "",
    dietaryPreferences: "",
  });

  // Fetch admin dashboard data from API
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard");
      return await response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch meal plans from API
  const { data: mealPlansData, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["/api/meal-plans"],
  });

  // Fetch nutritionists from API
  const { data: nutritionistsData } = useQuery({
    queryKey: ["/api/nutritionists"],
  });

  // Fetch clients from API (for total users)
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Fetch orders from API (for recent orders)
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Use dashboard stats if available, fallback to manual calculation
  const dashboardStats = dashboardData?.statistics || {};
  const totalUsers = dashboardStats.total_users || dashboardStats.totalUsers || (Array.isArray(clientsData) ? clientsData.length : 0);
  const totalOrders = dashboardStats.total_orders || dashboardStats.totalOrders || 0;
  const totalMealPlans = dashboardStats.total_meal_plans || dashboardStats.totalMealPlans || (Array.isArray(mealPlansData) ? mealPlansData.length : 0);
  const totalNutritionists = dashboardStats.total_nutritionists || dashboardStats.totalNutritionists || (Array.isArray(nutritionistsData) ? nutritionistsData.length : 0);
  const activeOrders = dashboardStats.active_orders || dashboardStats.activeOrders || {};
  
  const activeMealPlans = Array.isArray(mealPlansData) 
    ? mealPlansData.filter((plan: any) => plan.isActive || plan.is_active).length 
    : 0;
  
  // Use recent orders from dashboard if available, otherwise calculate from ordersData
  const recentOrders = dashboardData?.recent_activity?.recent_orders || dashboardData?.recentActivity?.recentOrders || 
    (Array.isArray(ordersData) 
      ? [...ordersData]
          .sort((a: any, b: any) => new Date(b.orderedAt || b.ordered_at || b.createdAt || b.created_at).getTime() - new Date(a.orderedAt || a.ordered_at || a.createdAt || a.created_at).getTime())
          .slice(0, 5)
          .map((order: any) => ({
            id: order.id,
            clientName: order.clientName || order.client_name || order.clientName || "Unknown",
            dietPlan: order.dietPlan || order.diet_plan || "N/A",
            mealType: order.mealType || order.meal_type || "N/A",
            price: order.price || order.total_amount || order.totalAmount || order.currentPrice || order.current_price || 0,
            status: order.status || "pending",
            orderedAt: order.orderedAt || order.ordered_at || order.createdAt || order.created_at
          }))
      : []);
  
  const recentUsers = dashboardData?.recent_activity?.recent_users || dashboardData?.recentActivity?.recentUsers || [];

  // Seed database mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seed-database");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Database Seeded",
        description: "Sample data has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to seed database";
      toast({
        title: "Seeding Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Create meal plan mutation
  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/meal-plans", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Created",
        description: "New meal plan has been added successfully",
      });
      setMealDialogOpen(false);
      setMealForm({
        title: "",
        description: "",
        category: "",
        currentPrice: "",
        features: "",
        imageUrl: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to create meal plan";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update meal plan mutation
  const updateMealMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/meal-plans/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Updated",
        description: "Meal plan has been updated successfully",
      });
      setEditMealDialogOpen(false);
      setEditingMealPlan(null);
      setEditMealForm({
        title: "",
        description: "",
        category: "",
        currentPrice: "",
        features: "",
        imageUrl: "",
        isActive: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to update meal plan";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle edit meal plan
  const handleEditMealPlan = (plan: any) => {
    setEditingMealPlan(plan);
    setEditMealForm({
      title: plan.title || "",
      description: plan.description || "",
      category: plan.category || "",
      currentPrice: plan.currentPrice?.toString() || plan.current_price?.toString() || "",
      features: plan.features || "",
      imageUrl: plan.imageUrl || plan.image_url || "",
      isActive: plan.isActive !== undefined ? plan.isActive : plan.is_active !== undefined ? plan.is_active : true,
    });
    setEditMealDialogOpen(true);
  };

  // Handle update meal plan submit
  const handleUpdateMealSubmit = () => {
    if (!editingMealPlan) return;

    // Validate required fields
    if (!editMealForm.title || editMealForm.title.trim().length < 3) {
      toast({
        title: "Validation Error",
        description: "Title must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!editMealForm.description || editMealForm.description.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Description must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!editMealForm.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(editMealForm.currentPrice);
    if (!editMealForm.currentPrice || isNaN(price) || price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Submit with proper field mapping
    updateMealMutation.mutate({
      id: editingMealPlan.id,
      data: {
        title: editMealForm.title.trim(),
        description: editMealForm.description.trim(),
        category: editMealForm.category,
        current_price: price,
        original_price: price, // Keep original price same as current for updates
        features: editMealForm.features?.trim() || undefined,
        image_url: editMealForm.imageUrl?.trim() || undefined,
        is_active: editMealForm.isActive,
      },
    });
  };

  // Create nutritionist mutation
  const createNutritionistMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/nutritionists", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutritionist Added",
        description: "New nutritionist has been added successfully",
      });
      setNutritionistDialogOpen(false);
      setNutritionistForm({
        name: "",
        email: "",
        specialization: "",
        experience: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionists"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to add nutritionist";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update nutritionist mutation
  const updateNutritionistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/nutritionists/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutritionist Updated",
        description: "Nutritionist has been updated successfully",
      });
      setEditNutritionistDialogOpen(false);
      setEditingNutritionist(null);
      setEditNutritionistForm({
        name: "",
        email: "",
        specialization: "",
        experience: "",
        phone: "",
        bio: "",
        city: "",
        tagline: "",
        qualifications: "",
        isAvailable: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionists"] });
      if (selectedNutritionist) {
        queryClient.invalidateQueries({ queryKey: [`/api/nutritionists/${selectedNutritionist.id}`] });
      }
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to update nutritionist";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle edit nutritionist
  const handleEditNutritionist = (nutritionist: any) => {
    setEditingNutritionist(nutritionist);
    setEditNutritionistForm({
      name: nutritionist.name || "",
      email: nutritionist.email || "",
      specialization: nutritionist.specialization || "",
      experience: (nutritionist.experienceYears || nutritionist.experience_years || 0).toString(),
      phone: nutritionist.phone || "",
      bio: nutritionist.bio || "",
      city: nutritionist.city || "",
      tagline: nutritionist.tagline || "",
      qualifications: nutritionist.qualifications || "",
      isAvailable: nutritionist.isAvailable !== undefined ? nutritionist.isAvailable : nutritionist.is_available !== undefined ? nutritionist.is_available : true,
    });
    setEditNutritionistDialogOpen(true);
  };

  // Handle update nutritionist submit
  const handleUpdateNutritionistSubmit = () => {
    if (!editingNutritionist) return;
    updateNutritionistMutation.mutate({
      id: editingNutritionist.id,
      data: {
        name: editNutritionistForm.name,
        email: editNutritionistForm.email,
        specialization: editNutritionistForm.specialization,
        experienceYears: parseInt(editNutritionistForm.experience),
        phone: editNutritionistForm.phone || undefined,
        bio: editNutritionistForm.bio || undefined,
        city: editNutritionistForm.city || undefined,
        tagline: editNutritionistForm.tagline || undefined,
        qualifications: editNutritionistForm.qualifications || undefined,
        isAvailable: editNutritionistForm.isAvailable,
      },
    });
  };

  // Delete meal plan mutation
  const deleteMealPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/meal-plans/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Deleted",
        description: "Meal plan has been deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setItemToDelete({ type: null, id: null });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to delete meal plan";
      toast({
        title: "Deletion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete nutritionist mutation
  const deleteNutritionistMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/nutritionists/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutritionist Deleted",
        description: "Nutritionist has been deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setItemToDelete({ type: null, id: null });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionists"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to delete nutritionist";
      toast({
        title: "Deletion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!itemToDelete.id || !itemToDelete.type) return;
    if (itemToDelete.type === 'meal-plan') {
      deleteMealPlanMutation.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'nutritionist') {
      deleteNutritionistMutation.mutate(itemToDelete.id);
    }
  };

  // Handle delete click
  const handleDeleteClick = (type: 'meal-plan' | 'nutritionist', id: string) => {
    setItemToDelete({ type, id });
    setDeleteConfirmOpen(true);
  };

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Added",
        description: "New client has been added successfully",
      });
      setClientDialogOpen(false);
      setClientForm({
        userId: "",
        nutritionistId: "",
        weightStart: "",
        weightGoal: "",
        height: "",
        age: "",
        gender: "",
        dietaryPreferences: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.detail || "Failed to add client";
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Handle meal form submit
  const handleMealSubmit = () => {
    // Validate required fields
    if (!mealForm.title || mealForm.title.trim().length < 3) {
      toast({
        title: "Validation Error",
        description: "Title must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!mealForm.description || mealForm.description.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Description must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!mealForm.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(mealForm.currentPrice);
    if (!mealForm.currentPrice || isNaN(price) || price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Submit with proper field mapping (schema accepts both camelCase and snake_case via populate_by_name)
    createMealMutation.mutate({
      title: mealForm.title.trim(),
      description: mealForm.description.trim(),
      category: mealForm.category,
      current_price: price,
      original_price: price,
      image_url: mealForm.imageUrl?.trim() || undefined,
      features: mealForm.features?.trim() || undefined,
      is_active: true,
      rating: 0,
      review_count: 0,
    });
  };

  // Handle nutritionist form submit
  const handleNutritionistSubmit = () => {
    createNutritionistMutation.mutate({
      name: nutritionistForm.name,
      email: nutritionistForm.email,
      specialization: nutritionistForm.specialization,
      experienceYears: parseInt(nutritionistForm.experience),
      rating: 0,
      reviewCount: 0,
    });
  };

  // Handle client form submit
  const handleClientSubmit = () => {
    createClientMutation.mutate({
      ...clientForm,
      weightStart: parseFloat(clientForm.weightStart),
      weightCurrent: parseFloat(clientForm.weightStart),
      weightGoal: parseFloat(clientForm.weightGoal),
      height: parseFloat(clientForm.height),
      age: parseInt(clientForm.age),
    });
  };
  return (
    <div className="min-h-screen bg-background flex">
      <PortalNavigation
        items={getAdminNavigationItems(handleTabChange)}
        activeItem={activeTab}
        portalTheme={theme}
        variant="sidebar"
      />
      
      <div className="flex-1 lg:ml-64 mt-16 lg:mt-0">
        <motion.div
          {...pageTransitionVariants}
          className={`min-h-screen ${theme.background} ${theme.text}`}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={`${theme.gradient} text-white py-6 md:py-8 mb-6 md:mb-8`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 md:mb-2">{theme.title}</h1>
              <p className="text-white/90 text-sm sm:text-base">{theme.subtitle}</p>
            </div>
          </motion.div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 md:pb-8 space-y-6 md:space-y-8">
      {activeTab === "dashboard" && (
        <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <StatsCard
            title="Total Users"
            value={dashboardLoading ? "..." : String(totalUsers)}
            subtitle="Active clients"
            icon={Users}
          />
          <StatsCard
            title="Total Orders"
            value={dashboardLoading ? "..." : String(totalOrders)}
            subtitle={`${activeOrders.pending || activeOrders.pendingOrders || 0} pending`}
            icon={ShoppingCart}
          />
          <StatsCard
            title="Meal Plans"
            value={dashboardLoading ? "..." : String(totalMealPlans)}
            subtitle={`${activeMealPlans} active plans`}
            icon={Utensils}
          />
          <StatsCard
            title="Nutritionists"
            value={dashboardLoading ? "..." : String(totalNutritionists)}
            subtitle="Active nutritionists"
            icon={Users}
          />
        </motion.div>

        {/* Live Operations Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-6"
        >
          <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="font-bold">Live Operations Board</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600 font-medium">Live Updates</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Last update: {lastUpdate.toLocaleTimeString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/daily-meals/today"] });
                      setLastUpdate(new Date());
                    }}
                    className="hover:bg-gray-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Meals Prepared</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-800">
                    {liveOperations.mealsPrepared}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    Today
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">In Transit</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-800">
                    {liveOperations.mealsInTransit}
                  </div>
                  <div className="text-sm text-orange-700 mt-1">
                    Active deliveries
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-green-50 to-green-100/50 p-4 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Delivered</span>
                  </div>
                  <div className="text-3xl font-bold text-green-800">
                    {liveOperations.mealsDelivered}
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Completed today
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">Skipped</span>
                  </div>
                  <div className="text-3xl font-bold text-red-800">
                    {liveOperations.skippedMeals}
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    Need attention
                  </div>
                </motion.div>
              </div>

              {/* System Alerts */}
              {liveOperations.systemAlerts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Recent System Alerts</h4>
                  {liveOperations.systemAlerts.map((alert, idx) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100/50 rounded-lg border border-red-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-800">{alert.message}</span>
                      </div>
                      <span className="text-xs text-red-600 font-medium">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Master Dashboard Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-6"
        >
          <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                <span className="font-bold">Master Dashboard Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Kitchen Performance */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    Kitchen Performance
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Preparation Rate</span>
                        <span className="font-semibold text-gray-900">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">On-Time Delivery</span>
                        <span className="font-semibold text-gray-900">87%</span>
                      </div>
                      <Progress value={87} className="h-2" />
                    </div>
                  </div>
                </motion.div>

                {/* Delivery Performance */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100/50 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    Delivery Performance
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Avg Delivery Time</span>
                        <span className="font-semibold text-gray-900">22 min</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Active Agents</span>
                        <span className="font-semibold text-gray-900">{liveOperations.activeDeliveryAgents || 0}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Client Satisfaction */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gray-50 p-4 rounded-lg"
                >
                  <h4 className="font-semibold text-gray-900 mb-3">Client Satisfaction</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Meal Completion</span>
                      <span className="font-medium">94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>Avg Rating</span>
                      <span className="font-medium">4.8/5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Retention Rate</span>
                      <span className="font-medium">89%</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Seed Database Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Management
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seed the production database with sample meal plans, nutritionists, and client data
              </p>
            </div>
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full hover-elevate active-elevate-2"
              data-testid="button-seed-database"
            >
              {seedMutation.isPending ? "Seeding..." : "Seed Database"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Meal Menu Management
              </h2>
              <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" data-testid="button-add-meal">
                    Add Meal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Meal Plan</DialogTitle>
                    <DialogDescription>
                      Create a new meal plan for your customers
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="meal-name">Meal Plan Title</Label>
                      <Input
                        id="meal-name"
                        placeholder="e.g., Weight Loss Special"
                        value={mealForm.title}
                        onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })}
                        data-testid="input-meal-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="meal-description">Description</Label>
                      <Textarea
                        id="meal-description"
                        placeholder="Describe the meal plan..."
                        value={mealForm.description}
                        onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                        data-testid="input-meal-description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="diet-category">Category</Label>
                      <Select value={mealForm.category} onValueChange={(value) => setMealForm({ ...mealForm, category: value })}>
                        <SelectTrigger id="diet-category" data-testid="select-diet-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight-loss">Weight Loss</SelectItem>
                          <SelectItem value="weight-gain">Weight Gain</SelectItem>
                          <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                          <SelectItem value="diabetes">Diabetes</SelectItem>
                          <SelectItem value="heart-health">Heart Health</SelectItem>
                          <SelectItem value="general-wellness">General Wellness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price (₹)</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="15000"
                        value={mealForm.currentPrice}
                        onChange={(e) => setMealForm({ ...mealForm, currentPrice: e.target.value })}
                        data-testid="input-price"
                      />
                    </div>
                    <div>
                      <Label htmlFor="features">Features (comma-separated)</Label>
                      <Input
                        id="features"
                        placeholder="e.g., Low calorie, High fiber, Portion controlled"
                        value={mealForm.features}
                        onChange={(e) => setMealForm({ ...mealForm, features: e.target.value })}
                        data-testid="input-features"
                      />
                    </div>
                    <div>
                      <Label htmlFor="image-url">Image URL</Label>
                      <Input
                        id="image-url"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={mealForm.imageUrl}
                        onChange={(e) => setMealForm({ ...mealForm, imageUrl: e.target.value })}
                        data-testid="input-image-url"
                      />
                    </div>
                    <Button 
                      onClick={handleMealSubmit} 
                      disabled={createMealMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" 
                      data-testid="button-save-meal"
                    >
                      {createMealMutation.isPending ? "Saving..." : "Save Meal Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {mealPlansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-border rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(mealPlansData) ? mealPlansData : []).slice(0, 5).map((plan: any) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-semibold text-foreground">{plan.title}</p>
                      <p className="text-sm text-muted-foreground">₹{plan.currentPrice.toLocaleString()}/month</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full" 
                        data-testid={`button-edit-meal-${plan.id}`}
                        onClick={() => handleEditMealPlan(plan)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleDeleteClick('meal-plan', plan.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold text-foreground mb-6">
              Recent Orders
            </h2>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 border border-border rounded-lg animate-pulse"
                  >
                    <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </motion.div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No Recent Orders"
                description="Recent orders will appear here. Orders are created when clients complete their checkout process."
              />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any, idx: number) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-4 border border-border rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{order.clientName || order.client_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(order.dietPlan || order.diet_plan || "N/A")} - {(order.mealType || order.meal_type || "N/A")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">₹{(order.price || order.currentPrice || order.current_price || 0).toLocaleString('en-IN')}</p>
                      <Badge className={`${order.status === 'delivered' ? 'bg-green-600' : 'bg-yellow-600'} text-white mt-1`}>
                        {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>

        {/* User Management Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Nutritionist Management
              </h2>
              <Dialog open={nutritionistDialogOpen} onOpenChange={setNutritionistDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" data-testid="button-add-nutritionist">
                    Add Nutritionist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Nutritionist</DialogTitle>
                    <DialogDescription>
                      Add a nutritionist to your team
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nutritionist-name">Name</Label>
                      <Input
                        id="nutritionist-name"
                        placeholder="e.g., Dr. Priya Sharma"
                        value={nutritionistForm.name}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, name: e.target.value })}
                        data-testid="input-nutritionist-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionist-email">Email</Label>
                      <Input
                        id="nutritionist-email"
                        type="email"
                        placeholder="priya@zyael.com"
                        value={nutritionistForm.email}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, email: e.target.value })}
                        data-testid="input-nutritionist-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionist-specialization">Specialization</Label>
                      <Input
                        id="nutritionist-specialization"
                        placeholder="e.g., Weight Management"
                        value={nutritionistForm.specialization}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, specialization: e.target.value })}
                        data-testid="input-nutritionist-specialization"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nutritionist-experience">Experience (years)</Label>
                      <Input
                        id="nutritionist-experience"
                        type="number"
                        placeholder="10"
                        value={nutritionistForm.experience}
                        onChange={(e) => setNutritionistForm({ ...nutritionistForm, experience: e.target.value })}
                        data-testid="input-nutritionist-experience"
                      />
                    </div>
                    <Button 
                      onClick={handleNutritionistSubmit} 
                      disabled={createNutritionistMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" 
                      data-testid="button-save-nutritionist"
                    >
                      {createNutritionistMutation.isPending ? "Saving..." : "Save Nutritionist"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-center py-4">
              {Array.isArray(nutritionistsData) ? `${nutritionistsData.length} nutritionists in your team` : "Loading..."}
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportConfig}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Client Management
              </h2>
              <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" data-testid="button-add-client">
                    Add Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Add a new client to the platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="client-user-id">User ID</Label>
                      <Input
                        id="client-user-id"
                        placeholder="e.g., user-001"
                        value={clientForm.userId}
                        onChange={(e) => setClientForm({ ...clientForm, userId: e.target.value })}
                        data-testid="input-client-user-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="client-nutritionist">Nutritionist</Label>
                      <Select value={clientForm.nutritionistId} onValueChange={(value) => setClientForm({ ...clientForm, nutritionistId: value })}>
                        <SelectTrigger id="client-nutritionist" data-testid="select-client-nutritionist">
                          <SelectValue placeholder="Select nutritionist" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(nutritionistsData) && nutritionistsData.map((nutritionist: any) => (
                            <SelectItem key={nutritionist.id} value={nutritionist.id}>
                              {nutritionist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client-weight-start">Start Weight (kg)</Label>
                        <Input
                          id="client-weight-start"
                          type="number"
                          placeholder="85"
                          value={clientForm.weightStart}
                          onChange={(e) => setClientForm({ ...clientForm, weightStart: e.target.value })}
                          data-testid="input-client-weight-start"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-weight-goal">Goal Weight (kg)</Label>
                        <Input
                          id="client-weight-goal"
                          type="number"
                          placeholder="75"
                          value={clientForm.weightGoal}
                          onChange={(e) => setClientForm({ ...clientForm, weightGoal: e.target.value })}
                          data-testid="input-client-weight-goal"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="client-height">Height (cm)</Label>
                        <Input
                          id="client-height"
                          type="number"
                          placeholder="175"
                          value={clientForm.height}
                          onChange={(e) => setClientForm({ ...clientForm, height: e.target.value })}
                          data-testid="input-client-height"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-age">Age</Label>
                        <Input
                          id="client-age"
                          type="number"
                          placeholder="32"
                          value={clientForm.age}
                          onChange={(e) => setClientForm({ ...clientForm, age: e.target.value })}
                          data-testid="input-client-age"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-gender">Gender</Label>
                        <Select value={clientForm.gender} onValueChange={(value) => setClientForm({ ...clientForm, gender: value })}>
                          <SelectTrigger id="client-gender" data-testid="select-client-gender">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="client-dietary">Dietary Preferences</Label>
                      <Input
                        id="client-dietary"
                        placeholder="e.g., Vegetarian"
                        value={clientForm.dietaryPreferences}
                        onChange={(e) => setClientForm({ ...clientForm, dietaryPreferences: e.target.value })}
                        data-testid="input-client-dietary"
                      />
                    </div>
                    <Button 
                      onClick={handleClientSubmit} 
                      disabled={createClientMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2" 
                      data-testid="button-save-client"
                    >
                      {createClientMutation.isPending ? "Saving..." : "Save Client"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-muted-foreground text-center py-4">
              {totalUsers} clients on the platform
            </p>
          </motion.section>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-bold text-foreground mb-6">
            Analytics Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">87%</p>
              <p className="text-sm text-muted-foreground">
                Customer Satisfaction
              </p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">4.8</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-3xl font-bold text-primary mb-2">94%</p>
              <p className="text-sm text-muted-foreground">Meal Completion</p>
            </div>
          </div>
        </motion.section>
        </>
      )}

      {activeTab === "meal-plans" && (
        <motion.div
          key="meal-plans"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <CardTitle className="font-bold">Meal Plans Management</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">All Meal Plans</h3>
                <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-md">
                      Add Meal Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Meal Plan</DialogTitle>
                      <DialogDescription>
                        Create a new meal plan for your customers
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="meal-name">Meal Plan Title</Label>
                        <Input
                          id="meal-name"
                          placeholder="e.g., Weight Loss Special"
                          value={mealForm.title}
                          onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="meal-description">Description</Label>
                        <Textarea
                          id="meal-description"
                          placeholder="Describe the meal plan..."
                          value={mealForm.description}
                          onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="diet-category">Category</Label>
                        <Select value={mealForm.category} onValueChange={(value) => setMealForm({ ...mealForm, category: value })}>
                          <SelectTrigger id="diet-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weight-loss">Weight Loss</SelectItem>
                            <SelectItem value="weight-gain">Weight Gain</SelectItem>
                            <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                            <SelectItem value="diabetes">Diabetes</SelectItem>
                            <SelectItem value="heart-health">Heart Health</SelectItem>
                            <SelectItem value="general-wellness">General Wellness</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="price">Price (₹)</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="15000"
                          value={mealForm.currentPrice}
                          onChange={(e) => setMealForm({ ...mealForm, currentPrice: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="features">Features (comma-separated)</Label>
                        <Input
                          id="features"
                          placeholder="e.g., Low calorie, High fiber, Portion controlled"
                          value={mealForm.features}
                          onChange={(e) => setMealForm({ ...mealForm, features: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="image-url">Image URL</Label>
                        <Input
                          id="image-url"
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={mealForm.imageUrl}
                          onChange={(e) => setMealForm({ ...mealForm, imageUrl: e.target.value })}
                          data-testid="input-image-url"
                        />
                      </div>
                      <Button 
                        onClick={handleMealSubmit} 
                        disabled={createMealMutation.isPending}
                        className="w-full bg-primary text-primary-foreground rounded-full"
                      >
                        {createMealMutation.isPending ? "Saving..." : "Save Meal Plan"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Edit Meal Plan Dialog */}
              <Dialog open={editMealDialogOpen} onOpenChange={setEditMealDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Meal Plan</DialogTitle>
                    <DialogDescription>
                      Update meal plan details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-meal-name">Meal Plan Title</Label>
                      <Input
                        id="edit-meal-name"
                        placeholder="e.g., Weight Loss Special"
                        value={editMealForm.title}
                        onChange={(e) => setEditMealForm({ ...editMealForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-meal-description">Description</Label>
                      <Textarea
                        id="edit-meal-description"
                        placeholder="Describe the meal plan..."
                        value={editMealForm.description}
                        onChange={(e) => setEditMealForm({ ...editMealForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-diet-category">Category</Label>
                      <Select value={editMealForm.category} onValueChange={(value) => setEditMealForm({ ...editMealForm, category: value })}>
                        <SelectTrigger id="edit-diet-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight-loss">Weight Loss</SelectItem>
                          <SelectItem value="weight-gain">Weight Gain</SelectItem>
                          <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                          <SelectItem value="diabetes">Diabetes</SelectItem>
                          <SelectItem value="heart-health">Heart Health</SelectItem>
                          <SelectItem value="general-wellness">General Wellness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-price">Price (₹)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        placeholder="15000"
                        value={editMealForm.currentPrice}
                        onChange={(e) => setEditMealForm({ ...editMealForm, currentPrice: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-features">Features (comma-separated)</Label>
                      <Input
                        id="edit-features"
                        placeholder="e.g., Low calorie, High fiber, Portion controlled"
                        value={editMealForm.features}
                        onChange={(e) => setEditMealForm({ ...editMealForm, features: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-image-url">Image URL</Label>
                      <Input
                        id="edit-image-url"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={editMealForm.imageUrl}
                        onChange={(e) => setEditMealForm({ ...editMealForm, imageUrl: e.target.value })}
                        data-testid="input-edit-image-url"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit-is-active"
                        checked={editMealForm.isActive}
                        onChange={(e) => setEditMealForm({ ...editMealForm, isActive: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="edit-is-active">Active</Label>
                    </div>
                    <Button 
                      onClick={handleUpdateMealSubmit} 
                      disabled={updateMealMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full"
                    >
                      {updateMealMutation.isPending ? "Updating..." : "Update Meal Plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {mealPlansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading meal plans...</p>
                  </div>
                </div>
              ) : !Array.isArray(mealPlansData) || mealPlansData.length === 0 ? (
                <EmptyState
                  icon={Utensils}
                  title="No Meal Plans Found"
                  description="Create your first meal plan to get started. Meal plans help clients choose the right nutrition program for their goals."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mealPlansData.map((plan: any, idx: number) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
                          <CardTitle className="text-lg font-bold">{plan.title || plan.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{plan.description || plan.desc}</p>
                          <p className="text-xl font-bold text-primary mb-4">₹{(plan.currentPrice || plan.current_price || plan.originalPrice || plan.original_price || 0).toLocaleString('en-IN')}/month</p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 hover:bg-gray-100"
                              onClick={() => handleEditMealPlan(plan)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="rounded-lg"
                              onClick={() => handleDeleteClick('meal-plan', plan.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "nutritionists" && (
        <motion.div
          key="nutritionists"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <CardTitle className="font-bold">Nutritionists Management</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">All Nutritionists</h3>
                <Dialog open={nutritionistDialogOpen} onOpenChange={setNutritionistDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-md">
                      Add Nutritionist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Nutritionist</DialogTitle>
                      <DialogDescription>
                        Add a nutritionist to your team
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nutritionist-name">Name</Label>
                        <Input
                          id="nutritionist-name"
                          placeholder="e.g., Dr. Priya Sharma"
                          value={nutritionistForm.name}
                          onChange={(e) => setNutritionistForm({ ...nutritionistForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="nutritionist-email">Email</Label>
                        <Input
                          id="nutritionist-email"
                          type="email"
                          placeholder="priya@zyael.com"
                          value={nutritionistForm.email}
                          onChange={(e) => setNutritionistForm({ ...nutritionistForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="nutritionist-specialization">Specialization</Label>
                        <Input
                          id="nutritionist-specialization"
                          placeholder="e.g., Weight Management"
                          value={nutritionistForm.specialization}
                          onChange={(e) => setNutritionistForm({ ...nutritionistForm, specialization: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="nutritionist-experience">Experience (years)</Label>
                        <Input
                          id="nutritionist-experience"
                          type="number"
                          placeholder="10"
                          value={nutritionistForm.experience}
                          onChange={(e) => setNutritionistForm({ ...nutritionistForm, experience: e.target.value })}
                        />
                      </div>
                      <Button 
                        onClick={handleNutritionistSubmit} 
                        disabled={createNutritionistMutation.isPending}
                        className="w-full bg-primary text-primary-foreground rounded-full"
                      >
                        {createNutritionistMutation.isPending ? "Saving..." : "Save Nutritionist"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {!Array.isArray(nutritionistsData) || nutritionistsData.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Nutritionists Found"
                  description="Add nutritionists to your team. Nutritionists help clients achieve their health goals through personalized meal plans and consultations."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nutritionistsData.map((nutritionist: any, idx: number) => (
                    <motion.div
                      key={nutritionist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-blue-50/30">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
                          <CardTitle className="text-lg font-bold">{nutritionist.name || nutritionist.fullName || "Unknown"}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                          <p className="text-sm text-muted-foreground mb-2 font-medium">{nutritionist.specialization || nutritionist.speciality || "General Nutrition"}</p>
                          <p className="text-sm text-gray-600">{(nutritionist.experienceYears || nutritionist.experience_years || nutritionist.experience || 0)} years experience</p>
                          <div className="flex gap-2 mt-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 hover:bg-gray-100"
                              onClick={() => {
                                setSelectedNutritionist(nutritionist);
                                setShowNutritionistDetailsModal(true);
                              }}
                            >
                              View Details
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="rounded-lg"
                              onClick={() => handleDeleteClick('nutritionist', nutritionist.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Edit Nutritionist Dialog */}
              <Dialog open={editNutritionistDialogOpen} onOpenChange={setEditNutritionistDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Nutritionist</DialogTitle>
                    <DialogDescription>
                      Update nutritionist details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-nutritionist-name">Name</Label>
                      <Input
                        id="edit-nutritionist-name"
                        placeholder="e.g., Dr. Priya Sharma"
                        value={editNutritionistForm.name}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-email">Email</Label>
                      <Input
                        id="edit-nutritionist-email"
                        type="email"
                        placeholder="priya@zyael.com"
                        value={editNutritionistForm.email}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-phone">Phone</Label>
                      <Input
                        id="edit-nutritionist-phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={editNutritionistForm.phone}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-specialization">Specialization</Label>
                      <Input
                        id="edit-nutritionist-specialization"
                        placeholder="e.g., Weight Management"
                        value={editNutritionistForm.specialization}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, specialization: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-experience">Experience (years)</Label>
                      <Input
                        id="edit-nutritionist-experience"
                        type="number"
                        placeholder="10"
                        value={editNutritionistForm.experience}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, experience: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-bio">Bio</Label>
                      <Textarea
                        id="edit-nutritionist-bio"
                        placeholder="Nutritionist bio..."
                        value={editNutritionistForm.bio}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, bio: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-tagline">Tagline</Label>
                      <Input
                        id="edit-nutritionist-tagline"
                        placeholder="e.g., Your health partner"
                        value={editNutritionistForm.tagline}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, tagline: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-qualifications">Qualifications</Label>
                      <Textarea
                        id="edit-nutritionist-qualifications"
                        placeholder="e.g., M.Sc. Nutrition, Certified Dietitian"
                        value={editNutritionistForm.qualifications}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, qualifications: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-nutritionist-city">City</Label>
                      <Input
                        id="edit-nutritionist-city"
                        placeholder="e.g., Mumbai"
                        value={editNutritionistForm.city}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, city: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit-nutritionist-available"
                        checked={editNutritionistForm.isAvailable}
                        onChange={(e) => setEditNutritionistForm({ ...editNutritionistForm, isAvailable: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="edit-nutritionist-available">Available</Label>
                    </div>
                    <Button 
                      onClick={handleUpdateNutritionistSubmit} 
                      disabled={updateNutritionistMutation.isPending}
                      className="w-full bg-primary text-primary-foreground rounded-full"
                    >
                      {updateNutritionistMutation.isPending ? "Updating..." : "Update Nutritionist"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "clients" && (
        <motion.div
          key="clients"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <CardTitle className="font-bold">Clients Management</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">All Clients</h3>
                <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-md">
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                      <DialogDescription>
                        Add a new client to the platform
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="client-user-id">User ID</Label>
                        <Input
                          id="client-user-id"
                          placeholder="e.g., user-001"
                          value={clientForm.userId}
                          onChange={(e) => setClientForm({ ...clientForm, userId: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-nutritionist">Nutritionist</Label>
                        <Select value={clientForm.nutritionistId} onValueChange={(value) => setClientForm({ ...clientForm, nutritionistId: value })}>
                          <SelectTrigger id="client-nutritionist">
                            <SelectValue placeholder="Select nutritionist" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(nutritionistsData) && nutritionistsData.map((nutritionist: any) => (
                              <SelectItem key={nutritionist.id} value={nutritionist.id}>
                                {nutritionist.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="client-weight-start">Start Weight (kg)</Label>
                          <Input
                            id="client-weight-start"
                            type="number"
                            placeholder="85"
                            value={clientForm.weightStart}
                            onChange={(e) => setClientForm({ ...clientForm, weightStart: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="client-weight-goal">Goal Weight (kg)</Label>
                          <Input
                            id="client-weight-goal"
                            type="number"
                            placeholder="75"
                            value={clientForm.weightGoal}
                            onChange={(e) => setClientForm({ ...clientForm, weightGoal: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleClientSubmit} 
                        disabled={createClientMutation.isPending}
                        className="w-full bg-primary text-primary-foreground rounded-full"
                      >
                        {createClientMutation.isPending ? "Saving..." : "Save Client"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {clientsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading clients...</p>
                  </div>
                </div>
              ) : !Array.isArray(clientsData) || clientsData.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Clients Found"
                  description="Clients will appear here once they sign up and complete their subscription. You can also manually add clients using the button above."
                />
              ) : (
                <div className="space-y-3">
                  {clientsData.map((client: any, idx: number) => (
                    <motion.div
                      key={client.id || client.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="rounded-xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-lg text-gray-900">{client.name || client.fullName || `Client ${client.id || client.user_id}`}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {(client.weightStart || client.weight_start || client.weightStartKg) && (client.weightGoal || client.weight_goal || client.weightGoalKg) && 
                                  `${client.weightStart || client.weight_start || client.weightStartKg}kg → ${client.weightGoal || client.weight_goal || client.weightGoalKg}kg`}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="hover:bg-gray-100"
                              onClick={() => {
                                setSelectedClientForDetails(client.id || client.user_id);
                                setShowClientDetailsModal(true);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "orders" && (
        <motion.div
          key="orders"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
              <CardTitle className="font-bold">Orders Management</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                </div>
              ) : !Array.isArray(ordersData) || ordersData.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="No Orders Found"
                  description="Orders will appear here once clients complete their checkout and payment. All orders are tracked in real-time."
                />
              ) : (
                <div className="space-y-3">
                  {ordersData.map((order: any, idx: number) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="rounded-xl shadow-sm border border-border hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50/50">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-lg text-gray-900">Order #{order.id?.substring(0, 8).toUpperCase() || order.id}</p>
                              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(order.created_at || order.createdAt || order.orderedAt || Date.now()).toLocaleString()}
                              </p>
                              {(order.clientName || order.client_name) && (
                                <p className="text-sm text-muted-foreground mt-1">Client: {order.clientName || order.client_name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-primary">₹{(order.total_amount || order.totalAmount || order.price || order.currentPrice || order.current_price || 0).toLocaleString('en-IN')}</p>
                                <Badge className={`${order.status === 'delivered' ? 'bg-green-600' : order.status === 'pending' ? 'bg-yellow-600' : 'bg-blue-600'} text-white mt-1`}>
                                  {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                                </Badge>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="hover:bg-gray-100"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDetailsModal(true);
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "reports" && (
        <motion.div
          key="reports"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex gap-4">
                  <div>
                    <Label htmlFor="report-start-date">Start Date</Label>
                    <Input
                      id="report-start-date"
                      type="date"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-end-date">End Date</Label>
                    <Input
                      id="report-end-date"
                      type="date"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => toast({ title: "Export CSV", description: "CSV export functionality coming soon" })}>
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={() => toast({ title: "Export PDF", description: "PDF export functionality coming soon" })}>
                    Export PDF
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary mb-2">
                    {dashboardStats.customer_satisfaction || dashboardStats.customerSatisfaction || "87"}%
                  </p>
                  <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                </div>
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary mb-2">
                    {dashboardStats.average_rating || dashboardStats.averageRating || "4.8"}
                  </p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="text-center p-6 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary mb-2">
                    {dashboardStats.meal_completion || dashboardStats.mealCompletion || "94"}%
                  </p>
                  <p className="text-sm text-muted-foreground">Meal Completion</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-4">Chart visualization coming soon</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Order Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-4">Chart visualization coming soon</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "settings" && (
        <motion.div
          key="settings"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="app-name">Application Name</Label>
                      <Input id="app-name" placeholder="ZyaeL NutriBox" defaultValue="ZyaeL NutriBox" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="maintenance-mode" className="rounded" />
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="email-notifications" className="rounded" defaultChecked />
                      <Label htmlFor="email-notifications">Enable Email Notifications</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="sms-notifications" className="rounded" />
                      <Label htmlFor="sms-notifications">Enable SMS Notifications</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input id="session-timeout" type="number" defaultValue="30" />
                    </div>
                    <div>
                      <Label htmlFor="password-policy">Password Policy</Label>
                      <Select defaultValue="standard">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (8+ characters)</SelectItem>
                          <SelectItem value="strong">Strong (12+ characters, mixed case, numbers)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-primary text-primary-foreground rounded-full" onClick={() => toast({ title: "Settings Saved", description: "Settings have been saved successfully" })}>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "payments" && (
        <motion.div
          key="payments"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <PaymentRefunds />
        </motion.div>
      )}

      {activeTab === "nutritionist-allocation" && (
        <motion.div
          key="nutritionist-allocation"
          {...pageTransitionVariants}
          className="space-y-6"
        >
          <NutritionistAllocation />
        </motion.div>
      )}

      {/* Modals */}
      {selectedNutritionist && (
        <NutritionistDetailsModal
          isOpen={showNutritionistDetailsModal}
          onClose={() => {
            setShowNutritionistDetailsModal(false);
            setSelectedNutritionist(null);
          }}
          nutritionistId={selectedNutritionist.id}
          nutritionistName={selectedNutritionist.name}
          onEdit={(id) => {
            setEditingNutritionist(selectedNutritionist);
            setEditNutritionistDialogOpen(true);
            setShowNutritionistDetailsModal(false);
          }}
        />
      )}

      {selectedClientForDetails && (
        <ClientDetailsModal
          isOpen={showClientDetailsModal}
          onClose={() => {
            setShowClientDetailsModal(false);
            setSelectedClientForDetails(null);
          }}
          clientId={selectedClientForDetails}
        />
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={showOrderDetailsModal} onOpenChange={setShowOrderDetailsModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details #{selectedOrder.id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{selectedOrder.clientName || selectedOrder.client_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedOrder.clientEmail || selectedOrder.client_email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedOrder.clientPhone || selectedOrder.client_phone || "N/A"}</span>
                    </div>
                    {selectedOrder.clientAddress && (
                      <div>
                        <span className="text-muted-foreground">Address:</span>
                        <p className="text-sm mt-1">{selectedOrder.clientAddress || selectedOrder.client_address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={selectedOrder.status === 'delivered' ? 'default' : 'secondary'}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kitchen Status:</span>
                      <Badge variant="outline">{selectedOrder.kitchenStatus || selectedOrder.kitchen_status || "N/A"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meal Type:</span>
                      <span className="font-medium">{selectedOrder.mealType || selectedOrder.meal_type || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{selectedOrder.quantity || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-semibold text-primary">₹{selectedOrder.total_amount?.toLocaleString() || selectedOrder.price?.toLocaleString() || "0"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {selectedOrder.dietPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Diet Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedOrder.dietPlan || selectedOrder.diet_plan}</p>
                  </CardContent>
                </Card>
              )}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete.type === 'meal-plan' ? 'meal plan' : 'nutritionist'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false);
              setItemToDelete({ type: null, id: null });
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMealPlanMutation.isPending || deleteNutritionistMutation.isPending}
            >
              {deleteMealPlanMutation.isPending || deleteNutritionistMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </motion.div>
      </div>
    </div>
  );
}
