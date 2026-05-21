import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Package,
  Users,
  TrendingUp,
  Activity,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface PreparationStatus {
  meal_id: string;
  meal_name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  client_name: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  start_time?: string;
  estimated_completion?: string;
  actual_completion?: string;
  preparation_time?: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  special_instructions?: string;
}

interface PreparationStatusTrackerProps {
  preparations: PreparationStatus[];
  onUpdateStatus: (mealId: string, status: string) => void;
  onUpdatePriority: (mealId: string, priority: string) => void;
}

export default function PreparationStatusTracker({ 
  preparations, 
  onUpdateStatus,
  onUpdatePriority 
}: PreparationStatusTrackerProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ready':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'preparing':
        return <ChefHat className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not started';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculatePreparationTime = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
  };

  const getPreparationStats = () => {
    const totalPreparations = preparations.length;
    const completedPreparations = preparations.filter(p => p.status === 'delivered').length;
    const inProgressPreparations = preparations.filter(p => p.status === 'preparing').length;
    const readyPreparations = preparations.filter(p => p.status === 'ready').length;
    
    const avgPreparationTime = preparations
      .filter(p => p.preparation_time)
      .reduce((sum, p) => sum + (p.preparation_time || 0), 0) / 
      preparations.filter(p => p.preparation_time).length || 0;

    return {
      totalPreparations,
      completedPreparations,
      inProgressPreparations,
      readyPreparations,
      avgPreparationTime: Math.round(avgPreparationTime)
    };
  };

  const stats = getPreparationStats();

  const pendingPreparations = preparations.filter(p => p.status === 'pending');
  const preparingPreparations = preparations.filter(p => p.status === 'preparing');
  const readyPreparations = preparations.filter(p => p.status === 'ready');
  const completedPreparations = preparations.filter(p => p.status === 'delivered');

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Preparations</p>
                <p className="text-2xl font-bold">{stats.totalPreparations}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inProgressPreparations}</p>
              </div>
              <ChefHat className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold text-blue-600">{stats.readyPreparations}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Time</p>
                <p className="text-2xl font-bold text-green-600">{stats.avgPreparationTime}m</p>
              </div>
              <Timer className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            High Priority Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preparations
              .filter(p => p.priority === 'high' && p.status !== 'delivered')
              .sort((a, b) => {
                if (a.status === 'preparing' && b.status !== 'preparing') return -1;
                if (b.status === 'preparing' && a.status !== 'preparing') return 1;
                return 0;
              })
              .map((preparation) => (
                <PreparationCard
                  key={preparation.meal_id}
                  preparation={preparation}
                  onUpdateStatus={onUpdateStatus}
                  onUpdatePriority={onUpdatePriority}
                />
              ))}
          </div>
          {preparations.filter(p => p.priority === 'high' && p.status !== 'delivered').length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No high priority preparations</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status-based Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Preparations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Pending ({pendingPreparations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPreparations.map((preparation) => (
                <PreparationCard
                  key={preparation.meal_id}
                  preparation={preparation}
                  onUpdateStatus={onUpdateStatus}
                  onUpdatePriority={onUpdatePriority}
                />
              ))}
            </div>
            {pendingPreparations.length === 0 && (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending preparations</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preparing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              Preparing ({preparingPreparations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preparingPreparations.map((preparation) => (
                <PreparationCard
                  key={preparation.meal_id}
                  preparation={preparation}
                  onUpdateStatus={onUpdateStatus}
                  onUpdatePriority={onUpdatePriority}
                />
              ))}
            </div>
            {preparingPreparations.length === 0 && (
              <div className="text-center py-8">
                <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No preparations in progress</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ready for Pickup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Ready for Pickup ({readyPreparations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {readyPreparations.map((preparation) => (
              <PreparationCard
                key={preparation.meal_id}
                preparation={preparation}
                onUpdateStatus={onUpdateStatus}
                onUpdatePriority={onUpdatePriority}
              />
            ))}
          </div>
          {readyPreparations.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No meals ready for pickup</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalPreparations > 0 ? Math.round((stats.completedPreparations / stats.totalPreparations) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={stats.totalPreparations > 0 ? (stats.completedPreparations / stats.totalPreparations) * 100 : 0} 
                className="h-2" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{stats.completedPreparations}</div>
                <div className="text-sm text-green-700">Completed Today</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{stats.avgPreparationTime}m</div>
                <div className="text-sm text-blue-700">Avg Prep Time</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PreparationCardProps {
  preparation: PreparationStatus;
  onUpdateStatus: (mealId: string, status: string) => void;
  onUpdatePriority: (mealId: string, priority: string) => void;
}

function PreparationCard({ 
  preparation, 
  onUpdateStatus, 
  onUpdatePriority 
}: PreparationCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ready':
        return <Package className="w-4 h-4 text-blue-500" />;
      case 'preparing':
        return <ChefHat className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not started';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white rounded-lg border hover-elevate"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon(preparation.status)}
          <div>
            <h4 className="font-semibold text-sm">{preparation.meal_name}</h4>
            <p className="text-xs text-muted-foreground">{preparation.client_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getPriorityColor(preparation.priority)}>
            {preparation.priority}
          </Badge>
          <Badge className={getStatusColor(preparation.status)}>
            {preparation.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
        <div>
          <span className="font-medium">Started:</span> {formatTime(preparation.start_time)}
        </div>
        <div>
          <span className="font-medium">ETA:</span> {formatTime(preparation.estimated_completion)}
        </div>
      </div>

      {preparation.special_instructions && (
        <div className="mb-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
          <strong>Special:</strong> {preparation.special_instructions}
        </div>
      )}

      <div className="flex gap-2">
        {preparation.status === 'pending' && (
          <Button
            size="sm"
            onClick={() => onUpdateStatus(preparation.meal_id, 'preparing')}
          >
            Start Preparation
          </Button>
        )}
        {preparation.status === 'preparing' && (
          <Button
            size="sm"
            onClick={() => onUpdateStatus(preparation.meal_id, 'ready')}
          >
            Mark Ready
          </Button>
        )}
        {preparation.status === 'ready' && (
          <Button
            size="sm"
            onClick={() => onUpdateStatus(preparation.meal_id, 'delivered')}
          >
            Mark Delivered
          </Button>
        )}
        
        {preparation.priority !== 'high' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdatePriority(preparation.meal_id, 'high')}
          >
            High Priority
          </Button>
        )}
      </div>
    </motion.div>
  );
}

