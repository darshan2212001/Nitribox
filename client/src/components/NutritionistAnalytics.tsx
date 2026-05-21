import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Activity, 
  BarChart3,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface NutritionistAnalyticsProps {
  clients: any[];
  nutritionistId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function NutritionistAnalytics({ clients, nutritionistId }: NutritionistAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");

  // Fetch all client reports
  const clientReports = useQuery({
    queryKey: ["nutritionist-analytics", clients.map(c => c.id || c.user_id), timeframe],
    queryFn: async () => {
      const reports = await Promise.all(
        clients.map(async (client) => {
          try {
            const res = await apiRequest("GET", `/api/reports/weekly/client/${client.id || client.user_id}`);
            const data = await res.json();
            return { clientId: client.id || client.user_id, clientName: client.clientName, reports: Array.isArray(data) ? data : [] };
          } catch {
            return { clientId: client.id || client.user_id, clientName: client.clientName, reports: [] };
          }
        })
      );
      return reports;
    },
    enabled: clients.length > 0,
  });

  // Calculate aggregated metrics
  const metrics = useMemo(() => {
    if (!clientReports.data) {
      return {
        totalClients: clients.length,
        activeClients: 0,
        avgConsumptionRate: 0,
        totalMealsDelivered: 0,
        totalMealsConsumed: 0,
        totalMealsSkipped: 0,
        avgWeightLoss: 0,
        successRate: 0,
        avgResponseTime: "2.5h",
      };
    }

    const allReports = clientReports.data.flatMap(r => r.reports);
    const activeClients = new Set(allReports.map(r => r.client_id)).size;
    
    const totalMealsDelivered = allReports.reduce((sum, r) => sum + (r.total_meals_delivered || 0), 0);
    const totalMealsConsumed = allReports.reduce((sum, r) => sum + (r.meals_consumed || 0), 0);
    const totalMealsSkipped = allReports.reduce((sum, r) => sum + (r.meals_skipped || 0), 0);
    
    const avgConsumptionRate = totalMealsDelivered > 0 
      ? Math.round((totalMealsConsumed / totalMealsDelivered) * 100) 
      : 0;

    const weightChanges = allReports
      .filter(r => r.weight_change !== null && r.weight_change !== undefined)
      .map(r => r.weight_change);
    const avgWeightLoss = weightChanges.length > 0
      ? Math.round((weightChanges.reduce((a, b) => a + b, 0) / weightChanges.length) * 100) / 100
      : 0;

    const successRate = totalMealsDelivered > 0
      ? Math.round(((totalMealsConsumed / totalMealsDelivered) * 100))
      : 0;

    return {
      totalClients: clients.length,
      activeClients,
      avgConsumptionRate,
      totalMealsDelivered,
      totalMealsConsumed,
      totalMealsSkipped,
      avgWeightLoss,
      successRate,
      avgResponseTime: "2.5h",
    };
  }, [clientReports.data, clients.length]);

  // Prepare chart data
  const consumptionChartData = useMemo(() => {
    if (!clientReports.data) return [];
    
    const weeklyData: Record<number, { week: number; consumed: number; skipped: number; delivered: number }> = {};
    
    clientReports.data.forEach(({ reports }) => {
      reports.forEach((report: any) => {
        const week = report.week_number;
        if (!weeklyData[week]) {
          weeklyData[week] = { week, consumed: 0, skipped: 0, delivered: 0 };
        }
        weeklyData[week].consumed += report.meals_consumed || 0;
        weeklyData[week].skipped += report.meals_skipped || 0;
        weeklyData[week].delivered += report.total_meals_delivered || 0;
      });
    });

    return Object.values(weeklyData).sort((a, b) => a.week - b.week);
  }, [clientReports.data]);

  const clientPerformanceData = useMemo(() => {
    if (!clientReports.data) return [];
    
    return clientReports.data.map(({ clientId, clientName, reports }) => {
      const totalDelivered = reports.reduce((sum: number, r: any) => sum + (r.total_meals_delivered || 0), 0);
      const totalConsumed = reports.reduce((sum: number, r: any) => sum + (r.meals_consumed || 0), 0);
      const rate = totalDelivered > 0 ? Math.round((totalConsumed / totalDelivered) * 100) : 0;
      
      return {
        name: clientName.length > 15 ? clientName.substring(0, 15) + '...' : clientName,
        fullName: clientName,
        rate,
        meals: totalConsumed,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [clientReports.data]);

  const goalDistributionData = useMemo(() => {
    const goals: Record<string, number> = {};
    clients.forEach(client => {
      const goal = client.weightProgress?.target ? "Weight Loss" : "General Health";
      goals[goal] = (goals[goal] || 0) + 1;
    });
    
    return Object.entries(goals).map(([name, value]) => ({ name, value }));
  }, [clients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
        </div>
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{metrics.totalClients}</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activeClients} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Consumption Rate</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{metrics.avgConsumptionRate}%</p>
            <Progress value={metrics.avgConsumptionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{metrics.successRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Meal adherence</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Weight Change</p>
              {metrics.avgWeightLoss < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-600" />
              )}
            </div>
            <p className="text-2xl font-bold">
              {metrics.avgWeightLoss > 0 ? '+' : ''}{metrics.avgWeightLoss} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">Across all clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consumption Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Consumption Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {consumptionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="consumed" stroke="#00C49F" name="Consumed" strokeWidth={2} />
                  <Line type="monotone" dataKey="skipped" stroke="#FF8042" name="Skipped" strokeWidth={2} />
                  <Line type="monotone" dataKey="delivered" stroke="#0088FE" name="Delivered" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Client Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {clientPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#8884d8" name="Consumption %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meal Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Meal Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Total Delivered</span>
                <span className="font-semibold">{metrics.totalMealsDelivered}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Total Consumed</span>
                <span className="font-semibold text-green-600">{metrics.totalMealsConsumed}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Total Skipped</span>
                <span className="font-semibold text-red-600">{metrics.totalMealsSkipped}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Client Goals Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {goalDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={goalDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-200 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Response Time</span>
                <Badge variant="outline">{metrics.avgResponseTime}</Badge>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Active Clients</span>
                <Badge variant="default">{metrics.activeClients}</Badge>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Success Rate</span>
                <Badge variant={metrics.successRate >= 80 ? "default" : "destructive"}>
                  {metrics.successRate}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

