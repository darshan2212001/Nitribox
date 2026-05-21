import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Clock, Truck, MapPin, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useRealtime } from "@/hooks/use-realtime";
import { useToast } from "@/hooks/use-toast";
import { pageTransitionVariants } from "@/lib/animations";
import { portalThemes } from "@/lib/ui-config";
import { useAuth } from "@/hooks/useAuth";
import PortalNavigation, { getDeliveryNavigationItems } from "@/components/PortalNavigation";
import EmptyState from "@/components/EmptyState";

// Import delivery components
import BatchCard from "@/components/delivery/BatchCard";
import PickupChecklist from "@/components/delivery/PickupChecklist";
import DeliveryStopsList from "@/components/delivery/DeliveryStopsList";
import StopDetailCard from "@/components/delivery/StopDetailCard";
import QRScanner from "@/components/delivery/QRScanner";
import OTPInput from "@/components/delivery/OTPInput";
import IssueReportModal from "@/components/delivery/IssueReportModal";
import BatchCompletionSummary from "@/components/delivery/BatchCompletionSummary";

type ViewState = "batches" | "batch-details" | "stop-detail";

export default function DeliveryPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const theme = portalThemes.delivery;
  
  // View state
  const [viewState, setViewState] = useState<ViewState>("batches");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Modal states
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [otpInputOpen, setOtpInputOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [verificationOrderId, setVerificationOrderId] = useState<string | null>(null);

  // Online/Offline status
  const [isOnline, setIsOnline] = useState(false);

  // Fetch agent status - will be set from checkin response or default to false
  // We'll get the status from the first checkin call or default to false

  // Fetch today's batches
  const { 
    data: batchesData, 
    isLoading: batchesLoading, 
    error: batchesError,
    refetch: refetchBatches 
  } = useQuery({
    queryKey: ["/api/delivery/batches"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOnline,
    retry: 2,
    retryDelay: 1000,
  });

  // Handle batches error
  useEffect(() => {
    if (batchesError) {
      toast({
        title: "Failed to Load Batches",
        description: batchesError instanceof Error ? batchesError.message : "Unable to fetch batches. Please try again.",
        variant: "destructive",
      });
    }
  }, [batchesError, toast]);

  // Type definitions for batch data
  interface BatchDetails {
    batch_id: string;
    area_name: string;
    meal_type: string;
    timeslot: {
      start: string | null;
      end: string | null;
    };
    total_orders: number;
    ready_count: number;
    picked_count: number;
    status: string;
    status_indicator?: string;
    orders: Array<{
      order_id: string;
      order_number: string;
      user_name: string;
      user_phone: string;
      user_address: string;
      meal_type: string;
      status: string;
      label_scanned: boolean;
      picked: boolean;
      notes?: string;
      special_instructions?: string;
      dish_name?: string;
      payment?: {
        type: string;
        amount: number;
        method: string;
      };
    }>;
  }

  interface BatchesResponse {
    batches: Array<{
      batch_id: string;
      area_name: string;
      meal_type: string;
      timeslot: {
        start: string | null;
        end: string | null;
      };
      total_orders: number;
      ready_count: number;
      picked_count: number;
      status: string;
      status_indicator: string;
    }>;
    summary: {
      total_batches: number;
      total_orders: number;
      completed: number;
      date?: string;
    };
  }

  // Fetch batch details
  const { 
    data: batchDetails, 
    isLoading: batchDetailsLoading,
    error: batchDetailsError,
    refetch: refetchBatchDetails 
  } = useQuery<BatchDetails | null>({
    queryKey: ["/api/delivery/batches", selectedBatchId],
    queryFn: async () => {
      if (!selectedBatchId) return null;
      try {
        const res = await apiRequest("GET", `/api/delivery/batches/${selectedBatchId}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch batch details: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to fetch batch details");
      }
    },
    enabled: !!selectedBatchId && isOnline,
    retry: 2,
    retryDelay: 1000,
  });

  // Handle batch details error
  useEffect(() => {
    if (batchDetailsError) {
      toast({
        title: "Failed to Load Batch Details",
        description: batchDetailsError instanceof Error ? batchDetailsError.message : "Unable to fetch batch details. Please try again.",
        variant: "destructive",
      });
    }
  }, [batchDetailsError, toast]);

  // Toggle online/offline
  const checkinMutation = useMutation({
    mutationFn: async (online: boolean) => {
      const res = await apiRequest("POST", "/api/delivery/checkin", {
        body: JSON.stringify({ online }),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setIsOnline(data.is_online);
      if (data.is_online) {
        refetchBatches();
        toast({
          title: "🟢 Online",
          description: "You're now online and available for batches",
        });
      } else {
        toast({
          title: "🔴 Offline",
          description: "You're now offline",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Mark arrived at kitchen
  const arrivedMutation = useMutation({
    mutationFn: async (batchId: string) => {
      if (!batchId) {
        throw new Error("Batch ID is required");
      }
      try {
        const res = await apiRequest("POST", `/api/delivery/batches/${batchId}/arrived-kitchen`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errorData.detail || `Failed to mark arrival: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to mark arrival at kitchen");
      }
    },
    onSuccess: () => {
      refetchBatchDetails();
      toast({
        title: "Arrived at Kitchen",
        description: "You've marked yourself as arrived",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark arrival at kitchen",
        variant: "destructive",
      });
    },
  });

  // Mark order picked
  const pickupOrderMutation = useMutation({
    mutationFn: async ({ batchId, orderId }: { batchId: string; orderId: string }) => {
      if (!batchId || !orderId) {
        throw new Error("Batch ID and Order ID are required");
      }
      try {
        const res = await apiRequest(
          "POST",
          `/api/delivery/batches/${batchId}/pickup-order/${orderId}`
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errorData.detail || `Failed to mark order as picked: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to mark order as picked");
      }
    },
    onSuccess: () => {
      refetchBatchDetails();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark order as picked",
        variant: "destructive",
      });
    },
  });

  // Mark pickup complete
  const pickupCompleteMutation = useMutation({
    mutationFn: async (batchId: string) => {
      if (!batchId) {
        throw new Error("Batch ID is required");
      }
      try {
        const res = await apiRequest("POST", `/api/delivery/batches/${batchId}/pickup-complete`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errorData.detail || `Failed to complete pickup: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to complete pickup");
      }
    },
    onSuccess: () => {
      refetchBatchDetails();
      toast({
        title: "Pickup Complete",
        description: "All orders picked. Starting delivery route.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to complete pickup",
        variant: "destructive",
      });
    },
  });

  // Mark delivered with verification
  const deliverMutation = useMutation({
    mutationFn: async ({
      orderId,
      verification,
    }: {
      orderId: string;
      verification: { verification_type: string; verification_value?: string; notes?: string };
    }) => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      if (!verification?.verification_type) {
        throw new Error("Verification type is required");
      }
      if (verification.verification_type === "otp" && !verification.verification_value) {
        throw new Error("OTP value is required for OTP verification");
      }
      try {
        const res = await apiRequest("POST", `/api/delivery/orders/${orderId}/delivered`, {
          body: JSON.stringify(verification),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errorData.detail || `Failed to mark order as delivered: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to mark order as delivered");
      }
    },
    onSuccess: () => {
      refetchBatchDetails();
      toast({
        title: "Order Delivered",
        description: "Order marked as delivered successfully",
      });
      // Check if all orders are delivered/failed to show completion summary
      if (batchDetails && Array.isArray(batchDetails.orders)) {
        const allDone =
          batchDetails.orders.every(
            (o) => o?.status === "delivered" || o?.status === "failed"
          ) && batchDetails.orders.length > 0;
        if (allDone) {
          // Will show completion summary in batch details view
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark order as delivered",
        variant: "destructive",
      });
    },
  });

  // Report issue
  const reportIssueMutation = useMutation({
    mutationFn: async ({
      orderId,
      issue,
    }: {
      orderId: string;
      issue: { reason: string; note?: string; photo_url?: string; attempt_again: boolean };
    }) => {
      if (!orderId) {
        throw new Error("Order ID is required");
      }
      if (!issue?.reason) {
        throw new Error("Issue reason is required");
      }
      try {
        const res = await apiRequest("POST", `/api/delivery/orders/${orderId}/report-issue`, {
          body: JSON.stringify(issue),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errorData.detail || `Failed to report issue: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to report issue");
      }
    },
    onSuccess: () => {
      refetchBatchDetails();
      toast({
        title: "Issue Reported",
        description: "Issue has been reported to kitchen",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to report issue",
        variant: "destructive",
      });
    },
  });

  // Complete batch
  const completeBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      if (!batchId) {
        throw new Error("Batch ID is required");
      }
      try {
        const res = await apiRequest("POST", `/api/delivery/batches/${batchId}/complete`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(errorData.detail || `Failed to complete batch: ${res.statusText}`);
        }
        return await res.json();
      } catch (error: any) {
        throw new Error(error?.message || "Failed to complete batch");
      }
    },
    onSuccess: () => {
      toast({
        title: "Batch Completed",
        description: "Batch completed successfully",
      });
      setViewState("batches");
      setSelectedBatchId(null);
      refetchBatches();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to complete batch",
        variant: "destructive",
      });
    },
  });

  // Real-time updates
  useRealtime({
    events: [
      "batch.ready_for_pickup",
      "batch.assigned",
      "order.picked_up",
      "order.delivered",
      "batch.pickup_complete",
      "batch.completed",
      "BATCH_READY_FOR_PICKUP",
      "BATCH_ASSIGNED",
      "ORDER_PICKED_UP",
      "ORDER_DELIVERED",
      "BATCH_PICKUP_COMPLETE",
      "BATCH_COMPLETED",
      "MEAL_PACKED",
      "DELIVERY_ASSIGNED",
    ],
    channels: [],
    userRole: "delivery",
    userId: user?.id || undefined,
    invalidateQueries: [
      ["/api/delivery/batches"],
      ["/api/delivery/batches", selectedBatchId]
    ],
    onEvent: (event) => {
      const eventType = event.type;
      const eventData = event.data || {};
      
      if (eventType === "batch.ready_for_pickup" || eventType === "BATCH_READY_FOR_PICKUP") {
        const batchId = eventData.batch_id || eventData.batchId || "";
        const areaName = eventData.area_name || eventData.areaName || "";
        const mealType = eventData.meal_type || eventData.mealType || "";
        toast({
          title: "📦 Batch Ready for Pickup",
          description: `${areaName ? `${areaName} - ` : ""}${mealType ? `${mealType} ` : ""}batch${batchId ? ` ${batchId.substring(0, 8).toUpperCase()}` : ""} is ready for pickup`,
        });
        refetchBatches();
      } else if (eventType === "batch.assigned" || eventType === "BATCH_ASSIGNED" || eventType === "DELIVERY_ASSIGNED") {
        const batchId = eventData.batch_id || eventData.batchId || "";
        const areaName = eventData.area_name || eventData.areaName || "";
        const mealType = eventData.meal_type || eventData.mealType || "";
        toast({
          title: "✅ New Batch Assigned",
          description: `You have been assigned a new batch${areaName ? `: ${areaName} - ${mealType || ""}` : ""}${batchId ? ` (${batchId.substring(0, 8).toUpperCase()})` : ""}`,
        });
        refetchBatches();
      } else if (eventType === "order.picked_up" || eventType === "ORDER_PICKED_UP") {
        const orderId = eventData.order_id || eventData.orderId || "";
        toast({
          title: "📦 Order Picked Up",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""} has been picked up`,
        });
        if (selectedBatchId) {
          refetchBatchDetails();
        }
      } else if (eventType === "order.delivered" || eventType === "ORDER_DELIVERED") {
        const orderId = eventData.order_id || eventData.orderId || "";
        const clientName = eventData.client_name || eventData.clientName || "";
        toast({
          title: "✅ Order Delivered",
          description: `Order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""}${clientName ? ` to ${clientName}` : ""} has been delivered`,
        });
        if (selectedBatchId) {
          refetchBatchDetails();
        }
      } else if (eventType === "batch.pickup_complete" || eventType === "BATCH_PICKUP_COMPLETE") {
        const batchId = eventData.batch_id || eventData.batchId || "";
        toast({
          title: "🚚 Pickup Complete",
          description: `Batch ${batchId ? batchId.substring(0, 8).toUpperCase() : ""} pickup completed. Ready to start delivery route.`,
        });
        if (selectedBatchId) {
          refetchBatchDetails();
        }
      } else if (eventType === "batch.completed" || eventType === "BATCH_COMPLETED") {
        const batchId = eventData.batch_id || eventData.batchId || "";
        toast({
          title: "🎉 Batch Completed",
          description: `Batch ${batchId ? batchId.substring(0, 8).toUpperCase() : ""} has been completed successfully`,
        });
        refetchBatches();
        if (selectedBatchId) {
          refetchBatchDetails();
        }
      } else if (eventType === "MEAL_PACKED") {
        const orderId = eventData.order_id || eventData.orderId || "";
        toast({
          title: "📦 Meal Packed",
          description: `Meal for order ${orderId ? orderId.substring(0, 8).toUpperCase() : ""} has been packed and is ready`,
        });
        if (selectedBatchId) {
          refetchBatchDetails();
        }
      }
      
      // Always refetch batch details if a batch is selected
      if (selectedBatchId) {
        refetchBatchDetails();
      }
    },
  });

  // Online status is managed by checkin mutation

  const handleToggleOnline = () => {
    checkinMutation.mutate(!isOnline);
  };

  const handleViewBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setViewState("batch-details");
  };

  const handleGoToPickup = (batchId: string) => {
    handleViewBatch(batchId);
  };

  const handleBackToBatches = () => {
    setViewState("batches");
    setSelectedBatchId(null);
    setSelectedStopId(null);
  };

  const handleViewStop = (orderId: string) => {
    setSelectedStopId(orderId);
    setViewState("stop-detail");
  };

  const handleMarkDelivered = () => {
    if (!selectedStopId) {
      toast({
        title: "Error",
        description: "No order selected",
        variant: "destructive",
      });
      return;
    }
    setVerificationOrderId(selectedStopId);
    // Show verification options - default to QR, but allow OTP fallback
    setQrScannerOpen(true);
  };

  const handleVerificationFallback = () => {
    setQrScannerOpen(false);
    setOtpInputOpen(true);
  };

  const handleQRScan = (data: string) => {
    if (!verificationOrderId) {
      toast({
        title: "Error",
        description: "No order selected for verification",
        variant: "destructive",
      });
      return;
    }
    if (!data || data.trim().length === 0) {
      toast({
        title: "Error",
        description: "Invalid QR code data",
        variant: "destructive",
      });
      return;
    }
    deliverMutation.mutate({
      orderId: verificationOrderId,
      verification: {
        verification_type: "qr",
        verification_value: data.trim(),
      },
    });
    setVerificationOrderId(null);
  };

  const handleOTPSubmit = (otp: string) => {
    if (!verificationOrderId) {
      toast({
        title: "Error",
        description: "No order selected for verification",
        variant: "destructive",
      });
      return;
    }
    if (!otp || otp.trim().length !== 4 || !/^\d{4}$/.test(otp.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid 4-digit OTP",
        variant: "destructive",
      });
      return;
    }
    deliverMutation.mutate({
      orderId: verificationOrderId,
      verification: {
        verification_type: "otp",
        verification_value: otp.trim(),
      },
    });
    setVerificationOrderId(null);
  };

  const handleReportIssue = (issue: {
    reason: string;
    note?: string;
    photo_url?: string;
    attempt_again: boolean;
  }) => {
    if (!selectedStopId) {
      toast({
        title: "Error",
        description: "No order selected",
        variant: "destructive",
      });
      return;
    }
    if (!issue?.reason) {
      toast({
        title: "Error",
        description: "Please select an issue reason",
        variant: "destructive",
      });
      return;
    }
    reportIssueMutation.mutate({
      orderId: selectedStopId,
      issue,
    });
  };

  const handleCompleteBatch = () => {
    if (!selectedBatchId) {
      toast({
        title: "Error",
        description: "No batch selected",
        variant: "destructive",
      });
      return;
    }
    if (!batchDetails || !Array.isArray(batchDetails.orders)) {
      toast({
        title: "Error",
        description: "Batch details not loaded",
        variant: "destructive",
      });
      return;
    }
    const deliveredOrFailed = batchDetails.orders.filter(
      (o) => o?.status === "delivered" || o?.status === "failed"
    );
    if (deliveredOrFailed.length < batchDetails.orders.length) {
      toast({
        title: "Cannot Complete",
        description: "Not all orders are delivered or failed. Please complete all deliveries first.",
        variant: "destructive",
      });
      return;
    }
    completeBatchMutation.mutate(selectedBatchId);
  };

  // Safely extract batches and summary with null checks
  const batchesDataTyped = batchesData as BatchesResponse | null | undefined;
  const batches = (batchesDataTyped && Array.isArray(batchesDataTyped.batches)) 
    ? batchesDataTyped.batches 
    : [];
  const summary = batchesDataTyped?.summary || {
    total_batches: 0,
    total_orders: 0,
    completed: 0,
  };

  // Get selected order for stop detail with null checks
  const selectedOrder = (batchDetails && 
    Array.isArray(batchDetails.orders) && 
    selectedStopId) 
    ? batchDetails.orders.find((o: any) => (o?.order_id || o?.orderId) === selectedStopId)
    : null;

  // Check if batch is complete with null checks
  const isBatchComplete =
    batchDetails &&
    Array.isArray(batchDetails.orders) &&
    batchDetails.orders.length > 0 &&
    batchDetails.orders.every((o: any) => (o?.status || "") === "delivered" || (o?.status || "") === "failed");

  const isBatchPicked = Boolean(
    batchDetails?.status === "picked" || (batchDetails?.picked_count && batchDetails.picked_count > 0)
  );

  return (
    <div className="min-h-screen bg-background flex">
      <PortalNavigation
        items={getDeliveryNavigationItems(() => {})}
        activeItem="batches"
        portalTheme={theme}
        variant="sidebar"
      />
      
      <div className="flex-1 lg:ml-64">
        <motion.div
          variants={pageTransitionVariants}
          initial="hidden"
          animate="visible"
          className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8"
        >
          {/* Online/Offline Toggle */}
          <div className="mb-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-gray-50/50">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full shadow-lg ${
                          isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
                        }`}
                      />
                      <span className="font-semibold text-lg">
                        {isOnline ? "🟢 Online" : "🔴 Offline"}
                      </span>
                    </div>
                    <Button
                      onClick={handleToggleOnline}
                      disabled={checkinMutation.isPending}
                      size="lg"
                      variant={isOnline ? "outline" : "default"}
                      className={isOnline ? "hover:bg-gray-100" : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"}
                    >
                      {checkinMutation.isPending 
                        ? (isOnline ? "Going Offline..." : "Going Online...") 
                        : (isOnline ? "Go Offline" : "Go Online")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {!isOnline ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="rounded-2xl shadow-sm border border-border">
                <CardContent className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground">
                      You're offline. Go online to see batches.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : viewState === "batches" ? (
            <>
              {/* Today's Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="mb-6 rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-primary/5">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
                    <CardTitle className="text-xl font-bold">
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl"
                      >
                        <p className="text-3xl font-bold text-blue-700">{summary.total_batches || summary.totalBatches || 0}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Batches</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl"
                      >
                        <p className="text-3xl font-bold text-green-700">{summary.total_orders || summary.totalOrders || 0}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Orders</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl"
                      >
                        <p className="text-3xl font-bold text-purple-700">{summary.completed || 0}</p>
                        <p className="text-sm text-muted-foreground mt-1">Completed</p>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Batches List */}
              {batchesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="rounded-2xl shadow-sm border border-border animate-pulse">
                        <CardContent className="p-5 md:p-6">
                          <div className="h-5 bg-muted rounded mb-3 w-1/3"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : batchesError ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="rounded-2xl shadow-sm border border-border">
                    <CardContent className="p-8 md:p-12 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
                      <p className="text-destructive mb-2 text-base md:text-lg font-medium">
                        Failed to load batches
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {batchesError instanceof Error ? batchesError.message : "Unable to fetch batches. Please try again."}
                      </p>
                      <Button onClick={() => refetchBatches()} variant="outline" className="hover:bg-gray-100">
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : batches.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No Batches Assigned"
                  description="You don't have any delivery batches assigned for today. Check back later or contact your supervisor."
                />
              ) : (
                <div className="space-y-4">
                  {batches.map((batch, idx) => (
                    batch?.batch_id || batch?.batchId ? (
                      <motion.div
                        key={batch.batch_id || batch.batchId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <BatchCard
                          batch={batch}
                          onViewDetails={() => handleViewBatch(batch.batch_id || batch.batchId)}
                          onGoToPickup={
                            (batch?.status_indicator === "ready_for_pickup" || batch?.statusIndicator === "ready_for_pickup")
                              ? () => handleGoToPickup(batch.batch_id || batch.batchId)
                              : undefined
                          }
                        />
                      </motion.div>
                    ) : null
                  ))}
                </div>
              )}
            </>
          ) : viewState === "batch-details" ? (
            batchDetailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Loading batch details...</p>
                </div>
              </div>
            ) : batchDetailsError ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="rounded-2xl shadow-sm border border-border">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 mb-4 text-destructive" />
                    <p className="text-destructive mb-2 font-medium">
                      Failed to load batch details
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {batchDetailsError instanceof Error ? batchDetailsError.message : "Unable to fetch batch details. Please try again."}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => refetchBatchDetails()} variant="outline" className="hover:bg-gray-100">
                        Retry
                      </Button>
                      <Button onClick={handleBackToBatches} variant="outline" className="hover:bg-gray-100">
                        Back to Batches
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : batchDetails ? (
              <div className="space-y-4">
              {/* Batch Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4 mb-4"
              >
                <Button variant="outline" onClick={handleBackToBatches} size="sm" className="hover:bg-gray-100">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {(batchDetails as any).area_name || (batchDetails as any).areaName} – {(batchDetails as any).meal_type || (batchDetails as any).mealType}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {((batchDetails as any).timeslot?.start || (batchDetails as any).timeslotStart) &&
                      new Date((batchDetails as any).timeslot?.start || (batchDetails as any).timeslotStart).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    {" – "}
                    {((batchDetails as any).timeslot?.end || (batchDetails as any).timeslotEnd) &&
                      new Date((batchDetails as any).timeslot?.end || (batchDetails as any).timeslotEnd).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </p>
                </div>
              </motion.div>

              {/* Batch Status */}
              <Badge
                className={`${
                  (batchDetails as any).status === "completed"
                    ? "bg-gray-600"
                    : isBatchPicked
                    ? "bg-blue-600"
                    : ((batchDetails as any).status_indicator === "ready_for_pickup" || (batchDetails as any).statusIndicator === "ready_for_pickup")
                    ? "bg-green-600"
                    : "bg-yellow-600"
                } text-white shadow-sm`}
              >
                {(batchDetails as any).status === "completed"
                  ? "Completed"
                  : isBatchPicked
                  ? "In Progress"
                  : ((batchDetails as any).status_indicator === "ready_for_pickup" || (batchDetails as any).statusIndicator === "ready_for_pickup")
                  ? "Ready for Pickup"
                  : "Preparing"}
              </Badge>

              {/* Completion Summary */}
              {isBatchComplete && batchDetails && (
                <BatchCompletionSummary
                  batchName={`${(batchDetails as any).area_name || (batchDetails as any).areaName} ${(batchDetails as any).meal_type || (batchDetails as any).mealType}`}
                  summary={{
                    total_orders: (batchDetails as any).total_orders || (batchDetails as any).totalOrders || 0,
                    delivered: (batchDetails.orders || []).filter((o: any) => (o?.status || "") === "delivered").length,
                    failed: (batchDetails.orders || []).filter((o: any) => (o?.status || "") === "failed").length,
                    time_taken: undefined, // Will be calculated by backend
                  }}
                  onComplete={handleCompleteBatch}
                />
              )}

              {/* Pickup or Delivery View */}
              <Tabs defaultValue={isBatchPicked ? "delivery" : "pickup"} className="mt-4">
                <TabsList>
                  <TabsTrigger value="pickup" disabled={isBatchPicked}>
                    Pickup Checklist
                  </TabsTrigger>
                  <TabsTrigger value="delivery" disabled={!isBatchPicked}>
                    Delivery Stops
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="pickup">
                  <PickupChecklist
                    batchId={batchDetails.batch_id}
                    orders={batchDetails.orders || []}
                    onPickupComplete={() => {
                      pickupCompleteMutation.mutate(batchDetails.batch_id);
                    }}
                    onOrderPicked={(orderId) => {
                      pickupOrderMutation.mutate({
                        batchId: batchDetails.batch_id,
                        orderId,
                            });
                          }}
                        />
                  {!arrivedMutation.isSuccess && (
                    <Button
                      onClick={() => arrivedMutation.mutate(batchDetails.batch_id)}
                      className="w-full mt-4"
                      size="lg"
                      disabled={arrivedMutation.isPending}
                    >
                      {arrivedMutation.isPending ? "Marking..." : "I Reached Kitchen"}
                    </Button>
                  )}
                </TabsContent>
                <TabsContent value="delivery">
                  <DeliveryStopsList
                    orders={batchDetails.orders || []}
                    onStopClick={handleViewStop}
                  />
                </TabsContent>
              </Tabs>
              </div>
            ) : null
          ) : viewState === "stop-detail" ? (
            !selectedOrder ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-destructive mb-4">
                    Order not found or not loaded.
                  </p>
                  <Button onClick={() => setViewState("batch-details")} variant="outline">
                    Back to Batch
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              <Button variant="outline" onClick={() => setViewState("batch-details")} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Batch
              </Button>
              <StopDetailCard
                order={selectedOrder}
                onStartNavigation={() => {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.user_address)}`,
                    "_blank"
                  );
                }}
                onCallCustomer={() => {
                  window.open(`tel:${selectedOrder.user_phone}`);
                }}
                onMarkDelivered={handleMarkDelivered}
                onReportIssue={() => setIssueModalOpen(true)}
              />
              </div>
            )
          ) : null}

          {/* Modals */}
          <QRScanner
            open={qrScannerOpen}
            onClose={() => {
              setQrScannerOpen(false);
              if (!verificationOrderId) {
                setVerificationOrderId(null);
              }
            }}
            onScan={handleQRScan}
            onUseOTP={verificationOrderId ? handleVerificationFallback : undefined}
          />
          <OTPInput
            open={otpInputOpen}
            onClose={() => {
              setOtpInputOpen(false);
              setVerificationOrderId(null);
            }}
            onSubmit={handleOTPSubmit}
          />
          <IssueReportModal
            open={issueModalOpen}
            onClose={() => setIssueModalOpen(false)}
            onSubmit={handleReportIssue}
          />
        </motion.div>
      </div>
    </div>
  );
}
