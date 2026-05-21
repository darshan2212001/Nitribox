import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Target, Activity, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface ClientAnalyticsProps {
  clientId: string;
  weeks?: number;
  className?: string;
}

export default function ClientAnalytics({ clientId, weeks = 4, className }: ClientAnalyticsProps) {
  const [selectedWeeks, setSelectedWeeks] = useState(weeks);

  // Fetch client analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: [`/api/reports/analytics/client/${clientId}`, selectedWeeks],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/analytics/client/${clientId}?weeks=${selectedWeeks}`);
      return await res.json();
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics || !analytics.analytics) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No analytics data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const { analytics: stats, weekly_data } = analytics;

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === "improving") return "text-green-600";
    if (trend === "declining") return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-xl font-bold">Client Analytics</h2>
        </div>
        <Select value={String(selectedWeeks)} onValueChange={(v) => setSelectedWeeks(parseInt(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">Last 4 weeks</SelectItem>
            <SelectItem value="8">Last 8 weeks</SelectItem>
            <SelectItem value="12">Last 12 weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Consumption Rate</p>
              {getTrendIcon(stats.consumption_trend)}
            </div>
            <p className="text-2xl font-bold">{stats.avg_consumption_rate}%</p>
            <p className={cn("text-xs mt-1", getTrendColor(stats.consumption_trend))}>
              {stats.consumption_trend === "improving" && "↑ Improving"}
              {stats.consumption_trend === "declining" && "↓ Declining"}
              {stats.consumption_trend === "stable" && "→ Stable"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Calories/Day</p>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{stats.avg_calories_per_day}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Over {stats.total_weeks} weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Weight Change</p>
              {stats.total_weight_change !== undefined && stats.total_weight_change !== 0 && (
                stats.total_weight_change > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                )
              )}
            </div>
            <p className="text-2xl font-bold">
              {stats.total_weight_change !== undefined && stats.total_weight_change > 0 ? "+" : ""}
              {stats.total_weight_change?.toFixed(1) || "0.0"} kg
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total change
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Recent Performance</p>
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{stats.recent_performance?.consumption_rate || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Last 2 weeks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Breakdown */}
      {weekly_data && weekly_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weekly_data.map((week: any, index: number) => (
                <motion.div
                  key={week.week_number}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">Week {week.week_number}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(week.generated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {week.consumption_rate}% consumed
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Consumption Rate</span>
                      <span className="font-medium">{week.consumption_rate}%</span>
                    </div>
                    <Progress value={week.consumption_rate} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Calories</p>
                        <p className="font-semibold">{week.avg_calories}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Weight Change</p>
                        <p className={cn(
                          "font-semibold",
                          week.weight_change && week.weight_change > 0 ? "text-red-600" : 
                          week.weight_change && week.weight_change < 0 ? "text-green-600" : "text-gray-600"
                        )}>
                          {week.weight_change !== null && week.weight_change !== undefined
                            ? `${week.weight_change > 0 ? "+" : ""}${week.weight_change.toFixed(1)} kg`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

