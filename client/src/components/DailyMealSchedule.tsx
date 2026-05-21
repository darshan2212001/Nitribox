import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { pageTransitionVariants, viewportConfig } from '@/lib/animations';
import { statusConfig, mealTypeConfig } from '@/lib/ui-config';

interface DailyMealScheduleProps {
  clientId: string;
  subscriptionId: string;
  onMealStatusUpdate?: (mealType: string, status: string) => void;
  onConsumptionLog?: (mealType: string, status: 'consumed' | 'skipped', reason?: string) => void;
}

interface MealSchedule {
  id: string;
  date: string;
  breakfast: {
    item: string;
    calories: number;
    status: string;
  };
  lunch: {
    item: string;
    calories: number;
    status: string;
  };
  dinner: {
    item: string;
    calories: number;
    status: string;
  };
}

export function DailyMealSchedule({
  clientId,
  subscriptionId: _subscriptionId,
  onMealStatusUpdate,
  onConsumptionLog
}: DailyMealScheduleProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState<MealSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Subscribe to real-time meal updates
  useRealtime({
    events: [
      'meal.preparing',
      'meal.packed',
      'meal.assigned',
      'meal.in_transit',
      'meal.delivered',
      'meal.consumed',
      'meal.skipped',
      'daily.meals_assigned'
    ],
    onEvent: (event) => {
      if (event.data.client_id === clientId) {
        // Update meal status in real-time
        setSchedules(prev => prev.map(schedule => {
          if (schedule.date === event.data.date) {
            const mealType = event.data.meal_type;
            const newStatus = event.data.status || event.type.split('.')[1];
            
            return {
              ...schedule,
              [mealType]: {
                ...schedule[mealType as keyof typeof schedule] as any,
                status: newStatus
              }
            };
          }
          return schedule;
        }));

        toast({
          title: `🍽️ ${event.data.meal_type?.charAt(0).toUpperCase() + event.data.meal_type?.slice(1)} Update`,
          description: event.data.description || `Status updated to ${event.data.status}`,
        });
      }
    },
    showToast: false // We handle toasts manually
  });

  // Generate sample data for the next 30 days
  useEffect(() => {
    const generateSchedules = () => {
      const sampleMeals = {
        breakfast: [
          { item: 'Oats Bowl with Berries', calories: 350 },
          { item: 'Scrambled Eggs & Toast', calories: 420 },
          { item: 'Greek Yogurt Parfait', calories: 280 },
          { item: 'Avocado Toast', calories: 380 }
        ],
        lunch: [
          { item: 'Quinoa Salad Bowl', calories: 450 },
          { item: 'Grilled Chicken Wrap', calories: 520 },
          { item: 'Vegetable Stir Fry', calories: 380 },
          { item: 'Lentil Curry', calories: 420 }
        ],
        dinner: [
          { item: 'Grilled Salmon', calories: 480 },
          { item: 'Vegetable Pasta', calories: 420 },
          { item: 'Chicken Tikka', calories: 450 },
          { item: 'Dal & Rice', calories: 380 }
        ]
      };

      const newSchedules: MealSchedule[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const breakfastMeal = sampleMeals.breakfast[i % sampleMeals.breakfast.length];
        const lunchMeal = sampleMeals.lunch[i % sampleMeals.lunch.length];
        const dinnerMeal = sampleMeals.dinner[i % sampleMeals.dinner.length];

        newSchedules.push({
          id: `schedule-${i}`,
          date: date.toISOString().split('T')[0],
          breakfast: { ...breakfastMeal, status: i === 0 ? 'preparing' : 'pending' },
          lunch: { ...lunchMeal, status: i === 0 ? 'pending' : 'pending' },
          dinner: { ...dinnerMeal, status: i === 0 ? 'pending' : 'pending' }
        });
      }
      
      setSchedules(newSchedules);
      setLoading(false);
    };

    generateSchedules();
  }, []);

  const todaySchedule = schedules.find(s => s.date === selectedDate.toISOString().split('T')[0]);

  const handleMealAction = (mealType: string, action: string) => {
    if (action === 'consume') {
      onConsumptionLog?.(mealType, 'consumed');
    } else if (action === 'skip') {
      onConsumptionLog?.(mealType, 'skipped', 'Client skipped meal');
    } else {
      onMealStatusUpdate?.(mealType, action);
    }
  };

  const getMealCard = (mealType: keyof typeof mealTypeConfig, meal: any) => {
    const config = mealTypeConfig[mealType];
    const statusInfo = statusConfig[meal.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = statusInfo.icon;

    return (
      <motion.div
        key={mealType}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-card via-card to-card/50 border border-card-border rounded-lg p-3 sm:p-4 hover-elevate transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 sm:p-2 rounded-full ${config.color}`}>
              <config.icon className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          <div>
              <h4 className="text-sm sm:text-base font-medium text-foreground">{config.label}</h4>
              <p className="text-xs text-muted-foreground">{config.time}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <p className="text-xs sm:text-sm text-foreground font-medium">{meal.item}</p>
            <p className="text-xs text-muted-foreground">{meal.calories} calories</p>
          
          <div className="flex items-center gap-2">
            <StatusIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{statusInfo.label}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {meal.status === 'delivered' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border"
          >
            <div className="flex gap-1 sm:gap-2">
                <Button
                  size="sm"
                onClick={() => handleMealAction(mealType, 'consume')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 sm:px-3"
                >
                <CheckCircle className="w-3 h-3 mr-1" />
                Consumed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                onClick={() => handleMealAction(mealType, 'skip')}
                className="border-destructive/20 text-destructive hover:bg-destructive/10 text-xs px-2 sm:px-3"
                >
                <XCircle className="w-3 h-3 mr-1" />
                Skipped
                </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border hover-elevate transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Daily Meal Schedule
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {selectedDate.toLocaleDateString()}
        </Badge>
      </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs"
            >
              Today
            </Button>
      </div>

          {/* Today's Meals */}
          {todaySchedule ? (
        <div className="space-y-3">
              {getMealCard('breakfast', todaySchedule.breakfast)}
              {getMealCard('lunch', todaySchedule.lunch)}
              {getMealCard('dinner', todaySchedule.dinner)}
        </div>
      ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No meal schedule for this date</p>
        </div>
      )}

          {/* Progress Summary */}
          {todaySchedule && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-primary/5 rounded-lg p-3 border border-primary/10"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">Today's Progress</span>
                <span className="text-primary font-medium">
                  {[todaySchedule.breakfast, todaySchedule.lunch, todaySchedule.dinner]
                    .filter(meal => meal.status === 'consumed').length}/3 meals consumed
                </span>
        </div>
            </motion.div>
      )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
