import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Clock, 
  Package, 
  ChefHat,
  Activity, 
  BarChart3,
  CheckCircle,
  AlertTriangle
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

export default function KitchenAnalytics() {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");

  // Fetch kitchen orders
  const { data: ordersData } = useQuery({
    queryKey: ["/api/kitchen/orders"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];

  // Fetch kitchen stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/kitchen/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

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

    const completedOrders = filteredOrders.filter((o: any) => 
      o.status === "completed" || o.kitchen_status === "completed"
    );
    
    // Calculate average preparation time
    let avgPrepTime = 0;
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum: number, o: any) => {
        const created = o.created_at ? new Date(o.created_at) : new Date(o.createdAt || 0);
        const packed = o.packed_at ? new Date(o.packed_at) : (o.packedAt ? new Date(o.packedAt) : null);
        if (packed) {
          return sum + (packed.getTime() - created.getTime()) / (1000 * 60); // minutes
        }
        return sum;
      }, 0);
      avgPrepTime = Math.round(totalTime / completedOrders.length);
    }

    // Calculate efficiency metrics
    const queueOrders = filteredOrders.filter((o: any) => o.status === "pending").length;
    const preparingOrders = filteredOrders.filter((o: any) => o.status === "preparing").length;
    const readyOrders = filteredOrders.filter((o: any) => o.status === "ready").length;

    // Calculate completion rate
    const completionRate = filteredOrders.length > 0
      ? Math.round((completedOrders.length / filteredOrders.length) * 100)
      : 0;

    return {
      totalOrders: filteredOrders.length,
      completedOrders: completedOrders.length,
      avgPrepTime,
      queueOrders,
      preparingOrders,
      readyOrders,
      completionRate,
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
      
      const completed = dayOrders.filter((o: any) => 
        o.status === "completed" || o.kitchen_status === "completed"
      ).length;
      
      data.push({
        date: dateStr,
        completed,
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
        <h2 className="text-2xl font-bold">Kitchen Analytics</h2>
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
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Prep Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgPrepTime} min</div>
            <p className="text-xs text-muted-foreground">
              Average preparation time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Orders completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Queue</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.queueOrders}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.preparingOrders} preparing, {metrics.readyOrders} ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Completion Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#8884d8" name="Completed" />
                <Line type="monotone" dataKey="total" stroke="#82ca9d" name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#8884d8" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

