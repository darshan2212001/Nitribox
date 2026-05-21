import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, QrCode, MapPin, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

interface PickupChecklistProps {
  batchId: string;
  orders: Array<{
    order_id?: string;
    orderId?: string;
    order_number?: string;
    orderNumber?: string;
    user_name?: string;
    userName?: string;
    user_phone?: string;
    userPhone?: string;
    user_address?: string;
    userAddress?: string;
    meal_type?: string;
    mealType?: string;
    status?: string;
    label_scanned?: boolean;
    labelScanned?: boolean;
    picked?: boolean;
    notes?: string;
    special_instructions?: string;
    specialInstructions?: string;
    dish_name?: string;
    dishName?: string;
  }>;
  onPickupComplete: () => void;
  onOrderPicked: (orderId: string) => void;
}

export default function PickupChecklist({
  batchId,
  orders,
  onPickupComplete,
  onOrderPicked,
}: PickupChecklistProps) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [pickingOrder, setPickingOrder] = useState<string | null>(null);

  const pickedCount = Array.isArray(orders) ? orders.filter((o) => o?.picked).length : 0;
  const totalCount = Array.isArray(orders) ? orders.length : 0;
  const progress = totalCount > 0 ? (pickedCount / totalCount) * 100 : 0;

  const getOrderId = (order: any) => order?.order_id || order?.orderId || "";
  const getUserName = (order: any) => order?.user_name || order?.userName || "Unknown";
  const getOrderNumber = (order: any) => order?.order_number || order?.orderNumber || order?.order_id?.substring(0, 8).toUpperCase() || "N/A";
  const getDishName = (order: any) => order?.dish_name || order?.dishName;
  const getSpecialInstructions = (order: any) => order?.special_instructions || order?.specialInstructions || order?.notes;

  const handleMarkPicked = async (orderId: string) => {
    if (!orderId || !batchId) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }
    setPickingOrder(orderId);
    try {
      const res = await apiRequest(
        "POST",
        `/api/delivery/batches/${batchId}/pickup-order/${orderId}`
      );
      if (res.ok) {
        onOrderPicked(orderId);
        toast({
          title: "✅ Order Picked",
          description: `Order ${orderId.substring(0, 8).toUpperCase()} marked as picked up`,
        });
      } else {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errorData.detail || "Failed to mark order as picked");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to mark order as picked",
        variant: "destructive",
      });
    } finally {
      setPickingOrder(null);
    }
  };

  const handleScanNext = () => {
    setScanning(true);
    // TODO: Open QR scanner modal
    toast({
      title: "QR Scanner",
      description: "QR scanner will open here (to be implemented)",
    });
    setScanning(false);
  };

  const handleMarkAllPicked = async () => {
    if (!batchId) {
      toast({
        title: "Error",
        description: "Batch ID is missing",
        variant: "destructive",
      });
      return;
    }
    if (pickedCount < totalCount) {
      toast({
        title: "Cannot Complete",
        description: "Please pick all orders before completing",
        variant: "destructive",
      });
      return;
    }
    if (totalCount === 0) {
      toast({
        title: "Error",
        description: "No orders to complete",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await apiRequest(
        "POST",
        `/api/delivery/batches/${batchId}/pickup-complete`
      );
      if (res.ok) {
        toast({
          title: "Pickup Complete",
          description: `You picked all ${totalCount} orders. Ready to start delivery?`,
        });
        onPickupComplete();
      } else {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(errorData.detail || "Failed to complete pickup");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to complete pickup",
        variant: "destructive",
      });
    }
  };

  const kitchenAddress = "123 Cloud Kitchen St, Bangalore"; // TODO: Get from config/API

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <p className="text-sm mb-3 font-medium">{kitchenAddress}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kitchenAddress)}`,
                  "_blank"
                );
              }}
              className="hover:bg-gray-100"
            >
              Open in Maps
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <CardTitle>Pickup Checklist</CardTitle>
              <Badge variant="outline" className="bg-white">
                Picked: {pickedCount} / {totalCount}
              </Badge>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            {!Array.isArray(orders) || orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No orders in this batch</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, idx) => {
                  const orderId = getOrderId(order);
                  if (!orderId) return null;
                  const isPicked = order.picked || false;
                  return (
                    <motion.div
                      key={orderId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center gap-3 p-4 border rounded-xl transition-all duration-200 ${
                        isPicked ? "bg-gradient-to-r from-green-50 to-green-100/50 border-green-300 shadow-sm" : "bg-white hover:shadow-md"
                      }`}
                    >
                      {isPicked ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{getUserName(order)}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {getOrderNumber(order)}
                          {getDishName(order) && ` • ${getDishName(order)}`}
                        </div>
                        {getSpecialInstructions(order) && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                              {getSpecialInstructions(order)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {!isPicked && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkPicked(orderId)}
                          disabled={pickingOrder === orderId}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                        >
                          {pickingOrder === orderId ? "Picking..." : "Mark Picked"}
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={handleScanNext}
                disabled={scanning}
                className="flex-1 hover:bg-gray-100"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan Next Box
              </Button>
              {pickedCount === totalCount && totalCount > 0 && (
                <Button 
                  onClick={handleMarkAllPicked} 
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md" 
                  size="lg"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Start Route
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}


