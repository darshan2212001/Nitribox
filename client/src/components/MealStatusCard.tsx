import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, CheckCircle, XCircle, ChefHat, Package, Truck, Home } from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { pageTransitionVariants, viewportConfig } from '@/lib/animations';
import { statusConfig } from '@/lib/ui-config';

interface MealStatusCardProps {
  orderId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  mealItem: string;
  calories: number;
  status: string;
  kitchenStatus: string;
  deliveryAgent?: {
    id: string;
    name: string;
    phone?: string;
  };
  estimatedDeliveryTime?: string;
  onConsumptionLog?: (status: 'consumed' | 'skipped', reason?: string) => void;
  showConsumptionLogger?: boolean;
}

export function MealStatusCard({
  orderId,
  mealType,
  mealItem,
  calories,
  status,
  kitchenStatus,
  deliveryAgent,
  estimatedDeliveryTime,
  onConsumptionLog,
  showConsumptionLogger = false
}: MealStatusCardProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showConsumptionDialog, setShowConsumptionDialog] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const { toast } = useToast();

  // Subscribe to real-time status updates
  useRealtime({
    events: [
      'meal.preparing',
      'meal.packed',
      'meal.assigned',
      'meal.in_transit',
      'meal.delivered',
      'meal.consumed',
      'meal.skipped'
    ],
    onEvent: (event) => {
      if (event.data.order_id === orderId) {
        setCurrentStatus(event.data.status || event.type.split('.')[1]);
        
        toast({
          title: `🍽️ ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Update`,
          description: event.data.description || statusConfig[event.data.status || event.type.split('.')[1]]?.description,
        });
      }
    },
    showToast: false // We handle toasts manually
  });

  const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  const handleConsumptionLog = (consumed: boolean) => {
    if (consumed) {
      onConsumptionLog?.('consumed');
      setCurrentStatus('consumed');
    } else {
      if (skipReason.trim()) {
        onConsumptionLog?.('skipped', skipReason);
        setCurrentStatus('skipped');
      } else {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for skipping the meal",
          variant: "destructive"
        });
        return;
      }
    }
    setShowConsumptionDialog(false);
    setSkipReason('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border hover-elevate transition-all duration-300">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg font-semibold text-card-foreground capitalize">
              {mealType} - {mealItem}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {calories} cal
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Status Badge with Animation */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className={`p-2 rounded-full ${config.color}`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{config.label}</span>
                {currentStatus === 'in_transit' && (
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 bg-primary rounded-full"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={config.progress} 
              className="h-2 bg-muted"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ordered</span>
              <span>Delivered</span>
            </div>
          </div>

          {/* Delivery Agent Info */}
          {deliveryAgent && (currentStatus === 'assigned' || currentStatus === 'in_transit') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="bg-primary/5 rounded-lg p-3 border border-primary/10"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {deliveryAgent.name}
                </span>
              </div>
              {estimatedDeliveryTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  ETA: {estimatedDeliveryTime}
                </p>
              )}
            </motion.div>
          )}

          {/* Consumption Logger */}
          {showConsumptionLogger && currentStatus === 'delivered' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-3"
            >
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Did you consume this meal?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleConsumptionLog(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Consumed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConsumptionDialog(true)}
                    className="border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Skipped
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Skip Reason Dialog */}
          {showConsumptionDialog && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-3"
            >
              <p className="text-sm font-medium text-destructive">
                Why did you skip this meal?
              </p>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="Please provide a reason..."
                className="w-full p-2 text-sm border border-destructive/20 rounded-md bg-background resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleConsumptionLog(false)}
                  disabled={!skipReason.trim()}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Confirm Skip
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConsumptionDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}