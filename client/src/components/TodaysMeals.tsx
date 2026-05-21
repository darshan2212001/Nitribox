import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Star, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TodaysMeal {
  id: string;
  meal_type: string;
  item: string;
  calories: number;
  status: string;
  consumed_status?: string;
  rating?: number;
  feedback?: string;
  prepared_at?: string;
  packed_at?: string;
  delivered_at?: string;
}

interface TodaysMealsProps {
  meals: TodaysMeal[];
  onMealConsume?: (mealId: string, rating?: number, feedback?: string) => void;
  onMealSkip?: (mealId: string, reason?: string) => void;
}

export default function TodaysMeals({ 
  meals, 
  onMealConsume, 
  onMealSkip 
}: TodaysMealsProps) {
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'prep_pending':
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'preparing':
      case 'in_prep':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'ready_for_packing':
        return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      case 'packed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'ready_for_pickup':
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'assigned':
        return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      case 'picked_up':
      case 'picked-up':
      case 'out_for_delivery':
      case 'in_transit':
      case 'in-transit':
        return <CheckCircle className="w-4 h-4 text-cyan-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'skipped':
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'prep_pending':
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'preparing':
      case 'in_prep':
        return 'bg-orange-100 text-orange-800';
      case 'ready_for_packing':
        return 'bg-yellow-100 text-yellow-800';
      case 'packed':
        return 'bg-blue-100 text-blue-800';
      case 'ready_for_pickup':
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'assigned':
        return 'bg-indigo-100 text-indigo-800';
      case 'picked_up':
      case 'picked-up':
      case 'out_for_delivery':
      case 'in_transit':
      case 'in-transit':
        return 'bg-cyan-100 text-cyan-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'skipped':
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Scheduled',
      'prep_pending': 'Prep Pending',
      'pending': 'Pending',
      'preparing': 'In Preparation',
      'in_prep': 'In Preparation',
      'ready_for_packing': 'Ready for Packing',
      'packed': 'Packed',
      'ready_for_pickup': 'Ready for Pickup',
      'ready': 'Ready',
      'assigned': 'Assigned to Delivery',
      'picked_up': 'Picked Up',
      'picked-up': 'Picked Up',
      'out_for_delivery': 'Out for Delivery',
      'in_transit': 'On the Way',
      'in-transit': 'On the Way',
      'delivered': 'Delivered',
      'completed': 'Completed',
      'skipped': 'Skipped',
      'failed': 'Failed',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  const getStatusTimeline = (meal: TodaysMeal) => {
    const statuses = [
      { key: 'scheduled', label: 'Scheduled', active: ['scheduled', 'prep_pending', 'pending', 'preparing', 'in_prep', 'ready_for_packing', 'packed', 'ready', 'assigned', 'picked_up', 'picked-up', 'out_for_delivery', 'in_transit', 'in-transit', 'delivered', 'completed'].includes(meal.status) },
      { key: 'preparing', label: 'In Preparation', active: ['preparing', 'in_prep', 'ready_for_packing', 'packed', 'ready', 'assigned', 'picked_up', 'picked-up', 'out_for_delivery', 'in_transit', 'in-transit', 'delivered', 'completed'].includes(meal.status) },
      { key: 'packed', label: 'Packed', active: ['packed', 'ready', 'assigned', 'picked_up', 'picked-up', 'out_for_delivery', 'in_transit', 'in-transit', 'delivered', 'completed'].includes(meal.status) },
      { key: 'on_way', label: 'On the Way', active: ['assigned', 'picked_up', 'picked-up', 'out_for_delivery', 'in_transit', 'in-transit', 'delivered', 'completed'].includes(meal.status) },
      { key: 'delivered', label: 'Delivered', active: ['delivered', 'completed'].includes(meal.status) }
    ];
    return statuses;
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      default:
        return '🍽️';
    }
  };

  const getMealBgColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return 'bg-orange-50 border-orange-200';
      case 'lunch':
        return 'bg-yellow-50 border-yellow-200';
      case 'dinner':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleConsume = (mealId: string) => {
    if (onMealConsume) {
      onMealConsume(mealId, rating, feedback);
      toast({
        title: "Meal Consumed!",
        description: "Great job staying on track with your nutrition plan.",
      });
    }
    setShowRatingModal(null);
    setRating(0);
    setFeedback('');
  };

  const handleSkip = (mealId: string) => {
    if (onMealSkip) {
      onMealSkip(mealId, feedback);
      toast({
        title: "Meal Skipped",
        description: "Don't worry, we'll help you get back on track.",
        variant: "destructive",
      });
    }
    setShowRatingModal(null);
    setFeedback('');
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const breakfastMeals = meals.filter(meal => meal.meal_type.toLowerCase() === 'breakfast');
  const lunchMeals = meals.filter(meal => meal.meal_type.toLowerCase() === 'lunch');
  const dinnerMeals = meals.filter(meal => meal.meal_type.toLowerCase() === 'dinner');

  const mealGroups = [
    { type: 'Breakfast', meals: breakfastMeals, icon: '🌅', color: 'orange' },
    { type: 'Lunch', meals: lunchMeals, icon: '☀️', color: 'yellow' },
    { type: 'Dinner', meals: dinnerMeals, icon: '🌙', color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Meals - {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-500">{breakfastMeals.length}</div>
              <div className="text-sm text-muted-foreground">Breakfast</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{lunchMeals.length}</div>
              <div className="text-sm text-muted-foreground">Lunch</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-500">{dinnerMeals.length}</div>
              <div className="text-sm text-muted-foreground">Dinner</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Groups */}
      {mealGroups.map((group) => (
        <Card key={group.type} className={getMealBgColor(group.type)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{group.icon}</span>
              {group.type}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {group.meals.length > 0 ? (
              <div className="space-y-3">
                {group.meals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">{getMealIcon(meal.meal_type)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{meal.item}</div>
                        <div className="text-sm text-muted-foreground">
                          {meal.calories} calories
                        </div>
                        {meal.prepared_at && (
                          <div className="text-xs text-muted-foreground">
                            Prepared: {formatTime(meal.prepared_at)}
                          </div>
                        )}
                        {meal.delivered_at && (
                          <div className="text-xs text-muted-foreground">
                            Delivered: {formatTime(meal.delivered_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(meal.status)}>
                          {getStatusLabel(meal.status)}
                        </Badge>
                        {getStatusIcon(meal.status)}
                      </div>
                      
                      {/* Status Timeline */}
                      <div className="flex items-center gap-1 text-xs">
                        {getStatusTimeline(meal).map((statusItem, idx) => (
                          <React.Fragment key={statusItem.key}>
                            <div className={`w-2 h-2 rounded-full ${statusItem.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            {idx < getStatusTimeline(meal).length - 1 && (
                              <div className={`w-4 h-px ${statusItem.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      
                      {meal.status === 'delivered' && meal.consumed_status !== 'consumed' && meal.consumed_status !== 'skipped' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setShowRatingModal(meal.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Consume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowRatingModal(meal.id)}
                            className="text-red-500 border-red-500 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Skip
                          </Button>
                        </div>
                      )}
                      
                      {meal.consumed_status === 'consumed' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Consumed</span>
                          {meal.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{meal.rating}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {meal.consumed_status === 'skipped' && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Skipped</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <span className="text-4xl mb-2 block">{group.icon}</span>
                <p>No {group.type.toLowerCase()} scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Rating Modal */}
      {showRatingModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-semibold mb-4">Rate Your Meal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rating (1-5 stars)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 ${
                        star <= rating 
                          ? 'text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className={`w-full h-full ${
                        star <= rating ? 'fill-current' : ''
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="How was your meal? Any suggestions?"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => handleConsume(showRatingModal)}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Consume Meal
              </Button>
              <Button
                onClick={() => handleSkip(showRatingModal)}
                variant="outline"
                className="flex-1 text-red-500 border-red-500 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Skip Meal
              </Button>
            </div>
            
            <Button
              onClick={() => setShowRatingModal(null)}
              variant="ghost"
              className="w-full mt-2"
            >
              Cancel
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* No meals today */}
      {meals.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No meals scheduled for today
            </h3>
            <p className="text-muted-foreground mb-4">
              Your nutritionist hasn't planned any meals for today yet.
            </p>
            <Button variant="outline">
              Contact Nutritionist
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

