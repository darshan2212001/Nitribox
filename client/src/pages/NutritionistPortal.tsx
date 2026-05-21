import { Calendar, Users, AlertTriangle, Activity, Search, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { pageTransitionVariants, viewportConfig } from "@/lib/animations";
import { useRealtime } from "@/hooks/use-realtime";
import ClientProgressCard from "@/components/ClientProgressCard";
import StatsCard from "@/components/StatsCard";
import MealPlanGenerator from "@/components/MealPlanGenerator";
import ClientProgressDashboard from "@/components/ClientProgressDashboard";
import ClientAnalytics from "@/components/ClientAnalytics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { portalThemes } from "@/lib/ui-config";
import { useAuth } from "@/hooks/useAuth";
import PortalNavigation, { getNutritionistNavigationItems } from "@/components/PortalNavigation";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import BookingCalendar from "@/components/BookingCalendar";
import NutritionistAnalytics from "@/components/NutritionistAnalytics";
import NutritionistMessaging from "@/components/NutritionistMessaging";
import NotificationSettings from "@/components/NotificationSettings";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import SessionDetailModal from "@/components/SessionDetailModal";
import EmptyState from "@/components/EmptyState";
import AssignedUsersList from "@/components/nutritionist/AssignedUsersList";
import UserDetailView from "@/components/nutritionist/UserDetailView";

// Component to fetch and transform client progress data
function ClientProgressWithReports({ 
  clients, 
  sessionsData,
  onViewClientDetails, 
  onScheduleConsultation, 
  onUpdateNotes 
}: {
  clients: any[];
  sessionsData?: any[];
  onViewClientDetails: (clientId: string) => void;
  onScheduleConsultation: (clientId: string) => void;
  onUpdateNotes: (clientId: string, notes: string) => void;
}) {
  // Fetch weekly reports for all clients
  const clientReportsQueries = useQuery({
    queryKey: ["client-progress-reports", clients.map(c => c.id || c.user_id)],
    queryFn: async () => {
      const reports = await Promise.all(
        clients.map(async (client) => {
          try {
            const res = await apiRequest("GET", `/api/reports/weekly/client/${client.id || client.user_id}`);
            const data = await res.json();
            return { clientId: client.id || client.user_id, reports: Array.isArray(data) ? data : [] };
          } catch {
            return { clientId: client.id || client.user_id, reports: [] };
          }
        })
      );
      return reports;
    },
    enabled: clients.length > 0,
  });

  // Transform clients to ClientProgress format
  const progressClients = useMemo(() => {
    if (!clientReportsQueries.data) return [];
    
    return clients.map(client => {
      const clientReports = clientReportsQueries.data?.find(r => r.clientId === (client.id || client.user_id))?.reports || [];
      const latestReport = clientReports[0]; // Reports are ordered by week_number desc
      
      // Find upcoming session
      const upcomingSession = Array.isArray(sessionsData) 
        ? sessionsData.find((s: any) => (s.client_id || s.clientId) === (client.id || client.user_id) && (s.status === "scheduled" || s.status === "confirmed"))
        : null;

      const totalDelivered = latestReport?.total_meals_delivered || 0;
      const totalConsumed = latestReport?.meals_consumed || 0;
      const completionRate = totalDelivered > 0 ? Math.round((totalConsumed / totalDelivered) * 100) : 0;

      return {
        client_id: client.id || client.user_id,
        client_name: client.clientName,
        subscription_id: client.subscription?.id || "",
        week_number: latestReport?.week_number || 1,
        total_meals_delivered: totalDelivered,
        meals_consumed: totalConsumed,
        meals_skipped: latestReport?.meals_skipped || 0,
        total_calories: latestReport?.total_calories || 0,
        avg_calories_per_day: latestReport?.avg_calories_per_day || 0,
        weight_change: latestReport?.weight_change,
        current_weight: client.weightProgress?.current,
        target_weight: client.weightProgress?.start, // Using start as target for now
        completion_rate: completionRate,
        last_consultation: upcomingSession ? new Date(upcomingSession.date || upcomingSession.sessionDate).toISOString() : undefined,
        next_consultation: upcomingSession ? new Date(upcomingSession.date || upcomingSession.sessionDate).toISOString() : undefined,
        nutritionist_notes: latestReport?.nutritionist_notes,
        goals_achieved: [],
        concerns: [],
      };
    });
  }, [clients, clientReportsQueries.data, sessionsData]);

  return (
    <ClientProgressDashboard
      clients={progressClients}
      onViewClientDetails={onViewClientDetails}
      onScheduleConsultation={onScheduleConsultation}
      onUpdateNotes={onUpdateNotes}
    />
  );
}

// Image mapping for clients
const clientImages = [
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
];

interface SkipAlert {
  id: number;
  clientId: string;
  clientName: string;
  mealType: string;
  reason: string;
  timestamp: string;
  orderId?: string;
}

interface LiveClientStats {
  mealsConsumed: number;
  lastActivity: string;
}

export default function NutritionistPortal() {
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "sessions" | "meal-plans" | "progress" | "alerts" | "analytics" | "messaging" | "settings">("overview");
  const [skipAlerts, setSkipAlerts] = useState<SkipAlert[]>([]);
  const [liveClientStats, setLiveClientStats] = useState<Record<string, LiveClientStats>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClientForConsultation, setSelectedClientForConsultation] = useState<{ clientId: string; clientName: string } | null>(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<{ clientId: string; clientName: string } | null>(null);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ sessionId: string; clientName: string } | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedClientForMessaging, setSelectedClientForMessaging] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem("nutritionist_notification_settings");
    return saved ? JSON.parse(saved) : {
      mealSkipped: { toast: true, sound: false, desktop: true },
      mealConsumed: { toast: false, sound: false, desktop: false },
      consultationScheduled: { toast: true, sound: true, desktop: true },
      weeklyReportReady: { toast: true, sound: false, desktop: true },
      quietHours: { enabled: false, start: "22:00", end: "08:00" }
    };
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const theme = portalThemes.nutritionist;

  // Type-safe tab change handler
  const handleTabChange = (tab: string) => {
    const validTabs: Array<typeof activeTab> = ["overview", "clients", "sessions", "meal-plans", "progress", "alerts", "analytics", "messaging", "settings"];
    if (validTabs.includes(tab as typeof activeTab)) {
      console.log("[Navigation] Changing tab to:", tab);
      setActiveTab(tab as typeof activeTab);
    } else {
      console.warn("[Navigation] Invalid tab value:", tab);
    }
  };

  // Fetch nutritionist record to get nutritionist_id
  const { data: nutritionistData, isLoading: nutritionistLoading } = useQuery({
    queryKey: [`/api/nutritionists`, user?.id],
    queryFn: async () => {
      const res = await getQueryFn({ on401: "returnNull" })(`/api/nutritionists`);
      if (!res) return null;
      const data = Array.isArray(res) ? res : [res];
      // Support both camelCase and snake_case field names
      return data.find((n: any) => 
        (n.user_id || n.userId) === user?.id || 
        n.email === user?.email
      ) || null;
    },
    enabled: !!user?.id,
  });

  // Fetch clients from API - filtered by nutritionist
  const { data: clientsData, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: [`/api/clients`, user?.id, nutritionistData?.id],
    queryFn: async () => {
      // Use nutritionist_user_id query parameter if available
      const url = nutritionistData?.id 
        ? `/api/clients?nutritionist_user_id=${user?.id}`
        : `/api/clients`;
      return getQueryFn({ on401: "returnNull" })(url);
    },
    enabled: !!user?.id,
  });

  if (clientsError) {
    console.error('Failed to fetch clients:', clientsError);
  }

  // Fetch consultations (sessions) from API for this nutritionist
  // Note: The endpoint expects nutritionist_id (Nutritionist.id), not user_id
  // Moved here before clients useMemo to fix initialization order
  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: [`/api/consultations/nutritionist/${nutritionistData?.id || user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id && !!nutritionistData?.id,
  });

  if (sessionsError) {
    console.error('Failed to fetch sessions:', sessionsError);
  }

      // Fetch subscriptions from API
      // Moved here before clients useMemo to fix initialization order
      const { data: subscriptionsData, error: subscriptionsError } = useQuery({
    queryKey: [`/api/subscriptions`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  if (subscriptionsError) {
    console.error('Failed to fetch subscriptions:', subscriptionsError);
  }

  // Prepare clients with formatted data
  const clients = useMemo(() => {
    if (!Array.isArray(clientsData)) return [];
    
    return clientsData.map((client: any, index: number) => {
      // Find upcoming session for this client
      const upcomingSession = Array.isArray(sessionsData) 
        ? sessionsData.find((s: any) => (s.client_id || s.clientId) === (client.id || client.user_id) && (s.status === "scheduled" || s.status === "confirmed"))
        : null;

      // Get client's subscription
      const subscription = Array.isArray(subscriptionsData) 
        ? subscriptionsData.find((sub: any) => (sub.client_id || sub.clientId) === client.id)
        : null;

      // Calculate meal completion from orders (if available)
      // This would need to be fetched separately or included in client data
      const mealCompletion = 90; // Placeholder - would calculate from actual data

      return {
        id: client.id,
        user_id: client.user_id,
        clientName: client.name || `Client ${index + 1}`,
        clientImage: clientImages[index % clientImages.length],
        nextSession: upcomingSession 
          ? new Date(upcomingSession.date || upcomingSession.sessionDate).toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit' 
            })
          : "Not scheduled",
        mealCompletion,
        avgCalories: { 
          current: client.current_calories || 1450, 
          target: client.target_calories || 1500 
        },
        proteinIntake: client.protein_intake || 80,
        waterIntake: { 
          current: client.water_intake || 2.5, 
          target: client.water_target || 3 
        },
        weightProgress: { 
          start: client.weight_start || client.weightStart || 0, 
          current: client.weight_current || client.weightCurrent || 0 
        },
        email: client.email,
        phone: client.phone,
        subscription: subscription,
      };
    });
  }, [clientsData, sessionsData, subscriptionsData]);

  // Enhanced real-time updates for nutritionist portal
  // Subscribe to client channels for assigned clients
  const clientChannels = useMemo(() => {
    if (!clients.length) return [];
    return clients.map(c => `client_${c.id || c.user_id}`);
  }, [clients]);

  useRealtime({
    events: [
      "client_created", "client_updated", "session_created", "session_updated", 
      "progress_log_created", "consultation_booked",
      "subscription.created", "subscription.updated",
      "daily_meals.generated", "meal_plan.updated",
      "meal.consumed", "meal.skipped", "weekly.report_ready",
      "consultation.scheduled", "consultation.reminder", "consultation.completed"
    ],
    channels: clientChannels, // Subscribe to client channels for assigned clients
    userRole: "nutritionist",
    userId: user?.id || undefined,
    invalidateQueries: [
      ["/api/clients"], 
      ["/api/consultations"], 
      ["/api/progress-logs"], 
      ["/api/subscriptions"], 
      ["/api/daily-meals/today"], 
      ["/api/reports/weekly"]
    ],
    onEvent: (event) => {
      const shouldNotify = (eventType: string) => {
        if (!notificationSettings[eventType]) return true;
        const settings = notificationSettings[eventType];
        if (settings.quietHours && notificationSettings.quietHours?.enabled) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const [startH, startM] = notificationSettings.quietHours.start.split(':').map(Number);
          const [endH, endM] = notificationSettings.quietHours.end.split(':').map(Number);
          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;
          const currentTimeMinutes = hours * 60 + minutes;
          if (startTime > endTime) {
            // Overnight quiet hours
            if (currentTimeMinutes >= startTime || currentTimeMinutes < endTime) {
              return false;
            }
          } else {
            if (currentTimeMinutes >= startTime && currentTimeMinutes < endTime) {
              return false;
            }
          }
        }
        return true;
      };

      // Handle skip alerts
      if (event.type === 'meal.skipped') {
        const alert: SkipAlert = {
          id: Date.now(),
          clientId: event.data.client_id || event.data.clientId || "unknown",
          clientName: event.data.client_name || event.data.clientName || `Client ${event.data.client_id}`,
          mealType: event.data.meal_type || event.data.mealType || "unknown",
          reason: event.data.reason || 'No reason provided',
          timestamp: event.timestamp || new Date().toISOString(),
          orderId: event.data.order_id || event.data.orderId
        };
        
        setSkipAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
        
        if (shouldNotify("mealSkipped") && notificationSettings.mealSkipped?.toast) {
          toast({
            title: "⚠️ Meal Skipped Alert",
            description: `${alert.clientName} skipped their ${alert.mealType}`,
            variant: "destructive"
          });
        }

        if (shouldNotify("mealSkipped") && notificationSettings.mealSkipped?.sound) {
          // Play sound notification
          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(() => {}); // Ignore errors
        }

        if (shouldNotify("mealSkipped") && notificationSettings.mealSkipped?.desktop && 'Notification' in window) {
          new Notification("Meal Skipped Alert", {
            body: `${alert.clientName} skipped their ${alert.mealType}`,
            icon: '/favicon.ico'
          });
        }
      }

      // Handle consumption updates
      if (event.type === 'meal.consumed') {
        const clientId = event.data.client_id || event.data.clientId || "unknown";
        setLiveClientStats(prev => ({
          ...prev,
          [clientId]: {
            mealsConsumed: (prev[clientId]?.mealsConsumed || 0) + 1,
            lastActivity: event.timestamp || new Date().toISOString()
          }
        }));

        if (shouldNotify("mealConsumed") && notificationSettings.mealConsumed?.toast) {
          toast({
            title: "✓ Meal Consumed",
            description: `Client consumed a meal`,
          });
        }
      }

      // Handle weekly reports
      if (event.type === 'weekly.report_ready') {
        if (shouldNotify("weeklyReportReady") && notificationSettings.weeklyReportReady?.toast) {
          toast({
            title: "📊 Weekly Report Ready",
            description: `Weekly report for client is ready`,
          });
        }
      }

      // Handle consultation scheduled
      if (event.type === 'consultation.scheduled' || event.type === 'consultation_booked') {
        const eventData = event.data || {};
        const consultationId = eventData.consultation_id || eventData.consultationId || eventData.id;
        const clientId = eventData.client_id || eventData.clientId;
        const date = eventData.date;
        const timeSlot = eventData.time_slot || eventData.timeSlot;
        
        if (shouldNotify("consultationScheduled") && notificationSettings.consultationScheduled?.toast) {
          toast({
            title: "📅 New Consultation Scheduled",
            description: `Consultation${date ? ` on ${new Date(date).toLocaleDateString()}` : ''}${timeSlot ? ` at ${timeSlot}` : ''}${clientId ? ` with client ${clientId.substring(0, 8)}...` : ''}`,
          });
        }
        
        // Invalidate consultation queries
        queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
        queryClient.invalidateQueries({ queryKey: [`/api/consultations/nutritionist/${nutritionistData?.id || user?.id}`] });
      }
      
      // Handle subscription allocation when nutritionist is assigned
      if (event.type === 'subscription.updated' || event.type === 'allocation.assigned') {
        const eventData = event.data || {};
        const nutritionistId = eventData.nutritionist_id || eventData.nutritionistId;
        const subscriptionId = eventData.subscription_id || eventData.subscriptionId;
        const allocationStatus = eventData.allocation_status || eventData.allocationStatus;
        
        // Check if this nutritionist was assigned
        if (nutritionistId === nutritionistData?.id && allocationStatus === 'assigned') {
          if (shouldNotify("consultationScheduled")) {
            toast({
              title: "👤 New Client Assigned",
              description: `You have been assigned to a new subscription${subscriptionId ? ` ${subscriptionId.substring(0, 8)}...` : ''}`,
            });
          }
          
          // Invalidate subscriptions and clients queries
          queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        }
      }
    },
    showToast: false // We handle toasts manually
  });

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter((client: any) => 
      client.clientName.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    );
  }, [clients, clientSearchQuery]);

  // Prepare upcoming sessions from API data
  const upcomingSessions = useMemo(() => {
    if (!Array.isArray(sessionsData)) return [];
    
    return sessionsData
      .filter((session: any) => session.status === "scheduled" || session.status === "confirmed")
      .sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.sessionDate).getTime();
        const dateB = new Date(b.date || b.sessionDate).getTime();
        return dateA - dateB;
      })
      .slice(0, 5)
      .map((session: any) => {
        const sessionDate = new Date(session.date || session.sessionDate);
        const today = new Date();
        const isToday = sessionDate.toDateString() === today.toDateString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = sessionDate.toDateString() === tomorrow.toDateString();
        
        // Find client name
        const client = clients.find((c: any) => (c.id || c.user_id) === (session.client_id || session.clientId));
        const clientName = client?.clientName || `Client`;
        
        return {
          id: session.id,
          clientId: session.client_id || session.clientId,
          clientName,
          description: session.notes || "Progress Review",
          day: isToday ? "Today" : isTomorrow ? "Tomorrow" : sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: sessionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          date: sessionDate,
        };
      });
  }, [sessionsData, clients]);

  // Stats
  const activeClientsCount = clients.length;
  const sessionsToday = useMemo(() => {
    if (!Array.isArray(sessionsData)) return 0;
    const today = new Date();
    return sessionsData.filter((session: any) => {
      const sessionDate = new Date(session.date || session.sessionDate);
      return sessionDate.toDateString() === today.toDateString() && 
             (session.status === "scheduled" || session.status === "confirmed");
    }).length;
  }, [sessionsData]);

  // Handler functions
  const handleGenerateMealPlan = async (clientId: string, plan: any) => {
    try {
      // Get subscription for this client
      const subscriptions = Array.isArray(subscriptionsData) ? subscriptionsData : [];
      const clientSubscription = subscriptions.find((sub: any) => (sub.client_id || sub.clientId) === clientId);
      
      if (!clientSubscription) {
        toast({
          title: "Error",
          description: "No active subscription found for this client. Please create a subscription first.",
          variant: "destructive",
        });
        return;
      }

      // Generate 30-day meal schedule
      const startDate = new Date();
      const schedule = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        schedule.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          breakfast_item: plan.meals?.breakfast || "Oats with fruits",
          breakfast_calories: Math.floor(plan.calories * 0.25),
          lunch_item: plan.meals?.lunch || "Grilled chicken with vegetables",
          lunch_calories: Math.floor(plan.calories * 0.40),
          dinner_item: plan.meals?.dinner || "Baked fish with salad",
          dinner_calories: Math.floor(plan.calories * 0.35),
          notes: plan.notes || plan.nutritionist_notes || "",
        });
      }

      if (!nutritionistData?.id) {
        toast({
          title: "Error",
          description: "Nutritionist profile not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      await apiRequest("POST", "/api/daily-meals/generate", {
        subscription_id: clientSubscription.id,
        client_id: clientId,
        nutritionist_id: nutritionistData.id,
        schedule: schedule,
      });

      toast({
        title: "Success",
        description: `30-day meal plan generated successfully for client`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/daily-meals/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate meal plan",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMealPlan = async (_clientId: string, _plan: any) => {
    try {
      toast({
        title: "Info",
        description: "To update a meal plan, please select a specific day from the calendar",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update meal plan",
        variant: "destructive",
      });
    }
  };

  const handleViewClientDetails = (clientId: string) => {
    const client = clients.find((c: any) => (c.id || c.user_id) === clientId);
    setSelectedClientForDetails({
      clientId: client?.user_id || clientId,
      clientName: client?.clientName || "Client",
    });
    setShowClientDetailsModal(true);
  };

  const handleScheduleConsultation = (clientId: string) => {
    const client = clients.find((c: any) => (c.id || c.user_id) === clientId);
    const clientName = client?.clientName || "Client";
    
    setSelectedClientForConsultation({
      clientId: client?.user_id || clientId,
      clientName,
    });
    setShowConsultationModal(true);
  };

  const handleUpdateNotes = async (clientId: string, notes: string) => {
    try {
      // Get the latest weekly report for this client
      const reportsRes = await apiRequest("GET", `/api/reports/weekly/client/${clientId}`);
      const reports = await reportsRes.json();
      if (Array.isArray(reports) && reports.length > 0) {
        const latestReport = reports[0];
        await apiRequest("PATCH", `/api/reports/weekly/${latestReport.id}`, {
          nutritionist_notes: notes,
        });
        toast({
          title: "Success",
          description: "Client notes updated successfully",
        });
        queryClient.invalidateQueries({ queryKey: [`/api/reports/weekly/client/${clientId}`] });
      } else {
        toast({
          title: "Info",
          description: "No weekly report found. Notes will be saved when report is generated.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update client notes",
        variant: "destructive",
      });
    }
  };

  const handleContactClient = async (clientId: string) => {
    const client = clients.find((c: any) => (c.id || c.user_id) === clientId);
    setSelectedClientForMessaging(client?.user_id || clientId);
    setActiveTab("messaging");
    toast({
      title: "Contact Client",
      description: `Opening messaging for ${client?.clientName || clientId}`,
    });
  };

  const handleAdjustPlan = async (_clientId: string) => {
    setActiveTab("meal-plans");
    // The MealPlanGenerator will handle pre-selected client via props
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Save notification settings to localStorage
  useEffect(() => {
    localStorage.setItem("nutritionist_notification_settings", JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  return (
    <div className="min-h-screen bg-background flex">
      <PortalNavigation
        items={getNutritionistNavigationItems(handleTabChange)}
        activeItem={activeTab}
        portalTheme={theme}
        variant="sidebar"
      />
      
      <div className="flex-1 lg:ml-64 mt-16 lg:mt-0">
        <motion.div
          {...pageTransitionVariants}
          className="min-h-screen bg-background text-foreground"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={`${theme.gradient} text-white ${theme.headerHeight || 'py-6 md:py-8'} mb-6 md:mb-8 shadow-md`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 md:mb-2">{theme.title}</h1>
              <p className="text-white/90 text-sm sm:text-base">{theme.subtitle}</p>
            </div>
          </motion.div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 md:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 md:mb-8"
            >
              <StatsCard
                title="Active Clients"
                value={clientsLoading ? "..." : String(activeClientsCount)}
                subtitle="Total clients"
                icon={Users}
              />
              <StatsCard
                title="Sessions Today"
                value={sessionsLoading ? "..." : String(sessionsToday)}
                subtitle="Scheduled sessions"
                icon={Calendar}
              />
              <StatsCard
                title="Skip Alerts"
                value={String(skipAlerts.length)}
                subtitle="Recent alerts"
                icon={AlertTriangle}
                trend={skipAlerts.length > 0 ? { value: `${skipAlerts.length}`, isPositive: false } : undefined}
              />
            </motion.div>

            {/* Skip Alerts Banner */}
            {skipAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Recent Skip Alerts</h3>
                  <Badge variant="destructive" className="ml-auto">
                    {skipAlerts.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {skipAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-800">
                        <strong>{alert.clientName}</strong> skipped {alert.mealType}
                        {alert.reason && ` - ${alert.reason}`}
                      </span>
                      <span className="text-red-600">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {skipAlerts.length > 3 && (
                    <p className="text-xs text-red-600">
                      +{skipAlerts.length - 3} more alerts
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-6 lg:grid-cols-9">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="meal-plans">Meal Plans</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="alerts">
                  Alerts {skipAlerts.length > 0 && <Badge variant="destructive" className="ml-1">{skipAlerts.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="messaging">Messaging</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8">
                {selectedUserId ? (
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-4">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedUserId(null)}
                      >
                        ← Back to Assigned Users
                      </Button>
                    </div>
                    <UserDetailView userId={selectedUserId} />
                  </motion.section>
                ) : (
                  <>
                    <motion.section
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={viewportConfig}
                      transition={{ duration: 0.6 }}
                    >
                      <h2 className="text-2xl font-bold text-foreground mb-6">Assigned Users</h2>
                      <AssignedUsersList onUserSelect={setSelectedUserId} />
                    </motion.section>
                    <motion.section
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={viewportConfig}
                      transition={{ duration: 0.6 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-foreground">Active Clients</h2>
                        <Button variant="outline" className="rounded-full" onClick={() => setActiveTab("clients")}>
                          View All
                        </Button>
                      </div>
                  {clientsLoading || nutritionistLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-gradient-to-br from-card via-card/95 to-card/90 rounded-xl shadow-md p-6 animate-pulse border border-muted/50"
                        >
                          <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </motion.div>
                      ))}
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="bg-gradient-to-br from-card via-card/95 to-card/90 border-card-border shadow-lg">
                        <CardContent className="p-12 text-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4"
                          >
                            <Users className="w-8 h-8 text-muted-foreground" />
                          </motion.div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Clients Found</h3>
                          <p className="text-sm text-muted-foreground">You don't have any clients assigned yet. Clients will appear here once they are assigned to you by the admin.</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClients.slice(0, 6).map((client: any) => (
                        <ClientProgressCard
                          key={client.id || client.user_id}
                          {...client}
                          onViewDetails={() => handleViewClientDetails(client.id || client.user_id)}
                        />
                      ))}
                    </div>
                  )}
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportConfig}
                  transition={{ duration: 0.6 }}
                  className="bg-white rounded-xl shadow-md p-6"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    Upcoming Sessions
                  </h3>
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                          <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingSessions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No upcoming sessions scheduled
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingSessions.map((session: any, index: number) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent rounded-xl border border-primary/10 hover:border-primary/20 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => {
                            setSelectedSession({
                              sessionId: session.id,
                              clientName: session.clientName,
                            });
                            setShowSessionModal(true);
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${session.day === 'Today' ? 'bg-primary/20' : 'bg-muted/50'}`}>
                              <Calendar className={`w-4 h-4 ${session.day === 'Today' ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{session.clientName}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{session.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${session.day === 'Today' ? 'text-primary' : 'text-foreground'}`}>
                              {session.day}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{session.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.section>
                  </>
                )}
              </TabsContent>

              <TabsContent value="clients" className="space-y-6">
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportConfig}
                  transition={{ duration: 0.6 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">All Clients</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search clients..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </div>

                  {clientsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="rounded-2xl shadow-sm border border-border animate-pulse">
                          <CardContent className="p-5 md:p-6">
                            <div className="h-5 bg-muted rounded mb-3 w-1/2"></div>
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-muted rounded w-1/2"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title={clientSearchQuery ? "No Clients Found" : "No Clients"}
                      description={clientSearchQuery ? "Try a different search term." : "You don't have any clients assigned yet."}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClients.map((client: any) => (
                        <ClientProgressCard
                          key={client.id || client.user_id}
                          {...client}
                          onViewDetails={() => handleViewClientDetails(client.id || client.user_id)}
                        />
                      ))}
                    </div>
                  )}
                </motion.section>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportConfig}
                  transition={{ duration: 0.6 }}
                  className="bg-white rounded-xl shadow-md p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-foreground">
                      All Sessions
                    </h3>
                    <Button onClick={() => {
                      // Open clients tab and show a message to select a client
                      setActiveTab("clients");
                      toast({
                        title: "Select a Client",
                        description: "Please select a client from the Clients tab to schedule a session",
                      });
                    }}>
                      Schedule New Session
                    </Button>
                  </div>
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                          <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : !Array.isArray(sessionsData) || sessionsData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No sessions found
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sessionsData.map((session: any, index: number) => {
                        const client = clients.find((c: any) => (c.id || c.user_id) === (session.client_id || session.clientId));
                        const clientName = client?.clientName || `Client`;
                        return (
                          <div
                            key={session.id || index}
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedSession({
                                sessionId: session.id,
                                clientName: clientName,
                              });
                              setShowSessionModal(true);
                            }}
                          >
                            <div>
                              <p className="font-semibold text-foreground">{clientName}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(session.date || session.sessionDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                              {session.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{session.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant={session.status === 'completed' ? 'default' : session.status === 'scheduled' ? 'secondary' : 'outline'}>
                                {session.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.section>
              </TabsContent>

              <TabsContent value="meal-plans" className="space-y-6">
                <MealPlanGenerator
                  clients={Array.isArray(clientsData) ? clientsData : []}
                  onGeneratePlan={handleGenerateMealPlan}
                  onUpdatePlan={handleUpdateMealPlan}
                  preSelectedClientId={selectedClientForDetails?.clientId}
                  editMode={!!selectedClientForDetails}
                />
              </TabsContent>

              <TabsContent value="progress" className="space-y-6">
                <ClientProgressWithReports
                  clients={clients}
                  sessionsData={Array.isArray(sessionsData) ? sessionsData : []}
                  onViewClientDetails={handleViewClientDetails}
                  onScheduleConsultation={handleScheduleConsultation}
                  onUpdateNotes={handleUpdateNotes}
                />
                {clients.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Client Analytics</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {clients.slice(0, 2).map((client: any) => (
                        <ClientAnalytics
                          key={client.id || client.user_id}
                          clientId={client.id || client.user_id}
                          weeks={4}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="alerts" className="space-y-6">
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportConfig}
                  transition={{ duration: 0.6 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground">Skip Alerts Dashboard</h2>
                    <Button 
                      variant="outline" 
                      onClick={() => setSkipAlerts([])}
                      disabled={skipAlerts.length === 0}
                    >
                      Clear All Alerts
                    </Button>
                  </div>

                  {skipAlerts.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50 shadow-lg">
                        <CardContent className="p-12 text-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
                          >
                            <AlertTriangle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">No Skip Alerts</h3>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">All clients are following their meal plans! 🎉</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <div className="grid gap-4">
                      {skipAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 shadow-md hover:shadow-lg transition-shadow">
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 mt-0.5">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-bold text-red-900 dark:text-red-100 text-base">
                                      {alert.clientName} - {alert.mealType.charAt(0).toUpperCase() + alert.mealType.slice(1)}
                                    </h4>
                                    <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                                      <strong className="font-semibold">Reason:</strong> {alert.reason}
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(alert.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    onClick={() => handleContactClient(alert.clientId)}
                                  >
                                    Contact
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                    onClick={() => handleAdjustPlan(alert.clientId)}
                                  >
                                    Adjust Plan
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Live Client Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Live Client Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.keys(liveClientStats).length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                          >
                            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground font-medium">No recent activity</p>
                            <p className="text-sm text-muted-foreground mt-1">Client activity will appear here in real-time</p>
                          </motion.div>
                        ) : (
                          Object.entries(liveClientStats).map(([clientId, stats], index) => {
                            const client = clients.find((c: any) => (c.id || c.user_id) === clientId);
                            return (
                              <motion.div
                                key={clientId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border border-green-200/50 dark:border-green-800/50 shadow-sm hover:shadow-md transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                    <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-foreground block">{client?.clientName || `Client ${clientId.substring(0, 8)}`}</span>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                      {stats.mealsConsumed} meals consumed today
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                                    Active
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" />
                                    {new Date(stats.lastActivity).toLocaleTimeString()}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.section>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <NutritionistAnalytics clients={clients} nutritionistId={nutritionistData?.id} />
              </TabsContent>

              <TabsContent value="messaging" className="space-y-6">
                <NutritionistMessaging 
                  clients={clients} 
                  nutritionistId={nutritionistData?.id}
                  selectedClientId={selectedClientForMessaging}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <NotificationSettings
                  settings={notificationSettings}
                  onSettingsChange={setNotificationSettings}
                />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>

      {/* Consultation Booking Modal */}
      {selectedClientForConsultation && user && nutritionistData && (
        <BookingCalendar
          nutritionistId={nutritionistData.id}
          nutritionistName={user.name || nutritionistData.name || "You"}
          isOpen={showConsultationModal}
          onClose={() => {
            setShowConsultationModal(false);
            setSelectedClientForConsultation(null);
          }}
          onBookingSuccess={() => {
            toast({
              title: "Consultation Scheduled!",
              description: `Consultation with ${selectedClientForConsultation.clientName} has been scheduled.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
            queryClient.invalidateQueries({ queryKey: [`/api/consultations/nutritionist/${nutritionistData.id}`] });
            setShowConsultationModal(false);
            setSelectedClientForConsultation(null);
          }}
        />
      )}

      {/* Client Details Modal */}
      {selectedClientForDetails && (
        <ClientDetailsModal
          isOpen={showClientDetailsModal}
          onClose={() => {
            setShowClientDetailsModal(false);
            setSelectedClientForDetails(null);
          }}
          clientId={selectedClientForDetails.clientId}
          clientName={selectedClientForDetails.clientName}
          onScheduleConsultation={(clientId) => {
            setShowClientDetailsModal(false);
            const client = clients.find((c: any) => (c.id || c.user_id) === clientId);
            setSelectedClientForConsultation({
              clientId: client?.user_id || clientId,
              clientName: client?.clientName || "Client",
            });
            setShowConsultationModal(true);
          }}
          onUpdateMealPlan={(clientId) => {
            setShowClientDetailsModal(false);
            handleAdjustPlan(clientId);
          }}
          onContactClient={(clientId) => {
            setShowClientDetailsModal(false);
            handleContactClient(clientId);
          }}
        />
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          isOpen={showSessionModal}
          onClose={() => {
            setShowSessionModal(false);
            setSelectedSession(null);
          }}
          sessionId={selectedSession.sessionId}
          clientName={selectedSession.clientName}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/consultations/nutritionist/${nutritionistData?.id || user?.id}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
          }}
        />
      )}
    </div>
  );
}
