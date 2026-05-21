import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface BatchCardProps {
  batch: {
    batch_id?: string;
    batchId?: string;
    area_name?: string;
    areaName?: string;
    meal_type?: string;
    mealType?: string;
    timeslot?: {
      start: string | null;
      end: string | null;
    };
    timeslotStart?: string | null;
    timeslotEnd?: string | null;
    total_orders?: number;
    totalOrders?: number;
    ready_count?: number;
    readyCount?: number;
    picked_count?: number;
    pickedCount?: number;
    status?: string;
    status_indicator?: string;
    statusIndicator?: string;
  };
  onViewDetails: () => void;
  onGoToPickup?: () => void;
}

export default function BatchCard({ batch, onViewDetails, onGoToPickup }: BatchCardProps) {
  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "preparing":
        return "bg-yellow-600";
      case "ready_for_pickup":
        return "bg-green-600";
      case "in_progress":
        return "bg-blue-600";
      case "completed":
        return "bg-gray-600";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case "preparing":
        return "Preparing at Kitchen";
      case "ready_for_pickup":
        return "Ready for Pickup";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status || "Unknown";
    }
  };

  const areaName = batch.area_name || batch.areaName || "Unknown";
  const mealType = batch.meal_type || batch.mealType || "";
  const timeslot = batch.timeslot || { start: batch.timeslotStart, end: batch.timeslotEnd };
  const statusIndicator = batch.status_indicator || batch.statusIndicator || "";
  const totalOrders = batch.total_orders || batch.totalOrders || 0;
  const readyCount = batch.ready_count || batch.readyCount || 0;
  const pickedCount = batch.picked_count || batch.pickedCount || 0;

  const timeWindow = timeslot?.start && timeslot?.end
    ? `${formatTime(timeslot.start)}–${formatTime(timeslot.end)}`
    : "N/A";

  const isReady = statusIndicator === "ready_for_pickup";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="rounded-2xl shadow-sm border border-border hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-t-2xl pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {areaName} – {mealType ? mealType.charAt(0).toUpperCase() + mealType.slice(1) : ""}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Time Window: {timeWindow}</span>
              </div>
            </div>
            <Badge className={`${getStatusColor(statusIndicator)} text-white shadow-sm`}>
              {getStatusLabel(statusIndicator)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 md:p-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{readyCount}</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{pickedCount}</p>
              <p className="text-xs text-muted-foreground">Picked</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isReady && onGoToPickup ? (
              <Button 
                onClick={onGoToPickup} 
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md" 
                size="lg"
              >
                Go to Pickup
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={onViewDetails} 
                variant="outline" 
                className="flex-1 hover:bg-gray-100" 
                size="lg"
              >
                View Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


