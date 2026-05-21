import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Clock, 
  MapPin,
  Activity, 
  BarChart3,
  Calendar,
  CheckCircle,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn } from "@/lib/queryClient";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from "recharts";

interface DeliveryAnalyticsProps {
  agentId?: string;
}

export default function DeliveryAnalytics({ agentId }: DeliveryAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");

  // Fetch delivery agent's orders
  const { data: ordersData } = useQuery({
    queryKey: [`/api/orders?delivery_agent_id=${agentId || ''}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!agentId,
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    
    if (timeframe === "week") {
      startDate.setDate(today.getDate() - 7);
    } else if (timeframe === "month") {
      startDate.setMonth(today.getMonth() - 1);
    } else {
      startDate.setMonth(today.getMonth() - 3);
    }

    const filteredOrders = orders.filter((o: any) => {
      const orderDate = o.created_at ? new Date(o.created_at) : new Date(o.createdAt || 0);
      return orderDate >= startDate;
    });

    const completedOrders = filteredOrders.filter((o: any) => o.status === "delivered");
    
    // Calculate average delivery time
    let avgDeliveryTime = 0;
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum: number, o: any) => {
        const created = o.created_at ? new Date(o.created_at) : new Date(o.createdAt || 0);
        const delivered = o.delivered_at ? new Date(o.delivered_at) : (o.deliveredAt ? new Date(o.deliveredAt) : null);
        if (delivered) {
          return sum + (delivered.getTime() - created.getTime()) / (1000 * 60); // minutes
        }
        return sum;
      }, 0);
      avgDeliveryTime = Math.round(totalTime / completedOrders.length);
    }

    // Calculate on-time rate (assuming 60 minutes target)
    const onTimeDeliveries = completedOrders.filter((o: any) => {
      const created = o.created_at ? new Date(o.created_at) : new Date(o.createdAt || 0);
      const delivered = o.delivered_at ? new Date(o.delivered_at) : (o.deliveredAt ? new Date(o.deliveredAt) : null);
      if (delivered) {
        const diffMinutes = (delivered.getTime() - created.getTime()) / (1000 * 60);
        return diffMinutes <= 60;
      }
      return false;
    }).length;

    const onTimeRate = completedOrders.length > 0 
      ? Math.round((onTimeDeliveries / completedOrders.length) * 100)
      : 0;

    // Calculate total distance (placeholder - would need actual tracking data)
    const totalDistance = completedOrders.length * 5; // Estimate 5km per delivery

    return {
      totalDeliveries: filteredOrders.length,
      completedDeliveries: completedOrders.length,
      avgDeliveryTime,
      onTimeRate,
      totalDistance,
      currentEarnings: 0, // Would need earnings data
    };
  }, [orders, timeframe]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const days = timeframe === "week" ? 7 : timeframe === "month" ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayOrders = orders.filter((o: any) => {
        const orderDate = o.created_at ? new Date(o.created_at) : new Date(o.createdAt || 0);
        return orderDate.toDateString() === date.toDateString();
      });
      
      const completed = dayOrders.filter((o: any) => o.status === "delivered").length;
      
      data.push({
        date: dateStr,
        deliveries: completed,
        total: dayOrders.length,
      });
    }
    
    return data;
  }, [orders, timeframe]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Delivery Analytics</h2>
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedDeliveries} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgDeliveryTime} min</div>
            <p className="text-xs text-muted-foreground">
              {metrics.onTimeRate}% on time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDistance} km</div>
            <p className="text-xs text-muted-foreground">
              Estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onTimeRate}%</div>
            <p className="text-xs text-muted-foreground">
              {timeframe} performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="deliveries" stroke="#8884d8" name="Completed" />
                <Line type="monotone" dataKey="total" stroke="#82ca9d" name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="deliveries" fill="#8884d8" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

