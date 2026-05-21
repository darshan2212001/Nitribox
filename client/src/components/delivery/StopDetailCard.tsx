import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Navigation, CheckCircle2, AlertCircle, Info, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

interface StopDetailCardProps {
  order: {
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
    dish_name?: string;
    dishName?: string;
    payment?: {
      type: string;
      amount: number;
      method: string;
    };
  };
  onStartNavigation: () => void;
  onCallCustomer: () => void;
  onMarkDelivered: () => void;
  onReportIssue: () => void;
}

export default function StopDetailCard({
  order,
  onStartNavigation,
  onCallCustomer,
  onMarkDelivered,
  onReportIssue,
}: StopDetailCardProps) {
  const status = order.status || "pending";
  const isDelivered = status === "delivered";
  const isFailed = status === "failed";
  
  const getUserName = () => order?.user_name || order?.userName || "Unknown";
  const getUserAddress = () => order?.user_address || order?.userAddress || "";
  const getUserPhone = () => order?.user_phone || order?.userPhone || "";
  const getMealType = () => order?.meal_type || order?.mealType || "";
  const getDishName = () => order?.dish_name || order?.dishName;
  const getSpecialInstructions = () => order?.special_instructions || order?.specialInstructions || order?.notes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="rounded-2xl shadow-sm border border-border bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl">
          <CardTitle className="text-xl font-bold">{getUserName()}</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">{getMealType()}</Badge>
            {isDelivered && (
              <Badge className="bg-green-600 text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Delivered
              </Badge>
            )}
            {isFailed && (
              <Badge className="bg-red-600 text-white">
                <AlertCircle className="w-3 h-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Address</p>
                <p className="text-sm text-muted-foreground">{getUserAddress()}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-gray-100"
              onClick={() => {
                const address = getUserAddress();
                if (address) {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
                    "_blank"
                  );
                }
              }}
            >
              Open in Maps
            </Button>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Phone</p>
                <p className="text-sm text-muted-foreground">{getUserPhone()}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-gray-100"
              onClick={onCallCustomer}
            >
              Call Customer
            </Button>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="font-semibold text-gray-900 mb-2">Item Summary</p>
            <p className="text-sm text-muted-foreground">
              {getDishName() || (getMealType() ? getMealType().charAt(0).toUpperCase() + getMealType().slice(1) + " Meal" : "Meal")}
            </p>
          </div>

          {order.payment && (
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Payment</p>
                  <p className="text-sm text-muted-foreground">
                    {order.payment.type}: ₹{order.payment.amount.toFixed(2)}
                    {order.payment.method !== "cash" && ` (${order.payment.method})`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {getSpecialInstructions() && (
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-yellow-700 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900 mb-1">Special Instructions</p>
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap">
                    {getSpecialInstructions()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isDelivered && !isFailed && (
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button 
                onClick={onStartNavigation} 
                size="lg" 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Start Navigation
              </Button>
              <Button 
                onClick={onMarkDelivered} 
                size="lg" 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Delivered
              </Button>
              <Button
                onClick={onReportIssue}
                variant="outline"
                size="lg"
                className="w-full hover:bg-gray-100"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}


