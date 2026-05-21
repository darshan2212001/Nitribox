import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Phone } from "lucide-react";
import { motion } from "framer-motion";

interface DeliveryStopsListProps {
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
    notes?: string;
    special_instructions?: string;
    specialInstructions?: string;
    payment?: {
      type: string;
      amount: number;
      method: string;
    };
  }>;
  onStopClick: (orderId: string) => void;
  onViewMap?: () => void;
}

export default function DeliveryStopsList({
  orders,
  onStopClick,
  onViewMap,
}: DeliveryStopsListProps) {
  const deliveredCount = orders.filter((o) => (o.status === "delivered")).length;
  const totalCount = orders.length;
  const progress = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "delivered":
        return "bg-green-600";
      case "failed":
        return "bg-red-600";
      default:
        return "bg-blue-600";
    }
  };

  const getOrderId = (order: any) => order?.order_id || order?.orderId || "";
  const getUserName = (order: any) => order?.user_name || order?.userName || "Unknown";
  const getUserPhone = (order: any) => order?.user_phone || order?.userPhone || "";
  const getUserAddress = (order: any) => order?.user_address || order?.userAddress || "";
  const getOrderNumber = (order: any) => order?.order_number || order?.orderNumber || "";
  const getMealType = (order: any) => order?.meal_type || order?.mealType || "";
  const getSpecialInstructions = (order: any) => order?.special_instructions || order?.specialInstructions || order?.notes;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-green-50/30">
          <CardContent className="pt-6 p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  Delivered {deliveredCount} / {totalCount}
                </p>
              </div>
              {onViewMap && (
                <Button variant="outline" onClick={onViewMap} className="hover:bg-gray-100">
                  <Navigation className="w-4 h-4 mr-2" />
                  View Map
                </Button>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-3">
        {orders.map((order, index) => {
          const orderId = getOrderId(order);
          if (!orderId) return null;
          const status = order.status || "pending";
          return (
            <motion.div
              key={orderId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-200 rounded-2xl border border-border bg-gradient-to-br from-white to-blue-50/30"
                onClick={() => onStopClick(orderId)}
              >
                <CardContent className="pt-6 p-5 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg text-gray-900">{getUserName(order)}</span>
                        <Badge className={`${getStatusColor(status)} text-white`}>
                          {status === "delivered"
                            ? "Delivered"
                            : status === "failed"
                            ? "Failed"
                            : "Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{getUserAddress(order)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        {getOrderNumber(order) && <span>Order: {getOrderNumber(order)}</span>}
                        {getOrderNumber(order) && getMealType(order) && <span>•</span>}
                        {getMealType(order) && <span className="capitalize">{getMealType(order)}</span>}
                        {order.payment && (
                          <>
                            <span>•</span>
                            <span className="font-medium">
                              {order.payment.type}: ₹{order.payment.amount.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                      {getSpecialInstructions(order) && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                            {getSpecialInstructions(order)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const phone = getUserPhone(order);
                          if (phone) {
                            window.open(`tel:${phone}`);
                          }
                        }}
                        className="hover:bg-gray-100"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


