import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Star, MessageSquare } from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { pageTransitionVariants, viewportConfig } from '@/lib/animations';

interface MealConsumptionLoggerProps {
  orderId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  mealItem: string;
  calories: number;
  onConsumptionLog?: (status: 'consumed' | 'skipped', rating?: number, feedback?: string) => void;
  showRating?: boolean;
  showFeedback?: boolean;
}

export function MealConsumptionLogger({
  orderId,
  mealType,
  mealItem,
  calories,
  onConsumptionLog,
  showRating = true,
  showFeedback = true
}: MealConsumptionLoggerProps) {
  const [selectedStatus, setSelectedStatus] = useState<'consumed' | 'skipped' | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Subscribe to real-time consumption updates
  useRealtime({
    events: ['meal.consumed', 'meal.skipped'],
    onEvent: (event) => {
      if (event.data.order_id === orderId) {
        toast({
          title: `🍽️ ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Logged`,
          description: `Status: ${event.data.status}`,
        });
      }
    },
    showToast: false // We handle toasts manually
  });

  const handleSubmit = async () => {
    if (!selectedStatus) {
      toast({
        title: "Please select a status",
        description: "Choose whether you consumed or skipped this meal",
        variant: "destructive"
      });
      return;
    }

    if (selectedStatus === 'skipped' && !skipReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for skipping the meal",
        variant: "destructive"
      });
      return;
    }

    if (selectedStatus === 'consumed' && showRating && rating === 0) {
      toast({
        title: "Rating required",
        description: "Please rate your meal experience",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await onConsumptionLog?.(
        selectedStatus,
        selectedStatus === 'consumed' ? rating : undefined,
        selectedStatus === 'consumed' ? feedback : skipReason
      );

      toast({
        title: "✅ Consumption Logged",
        description: `Your ${mealType} has been ${selectedStatus === 'consumed' ? 'marked as consumed' : 'marked as skipped'}`,
      });

      // Reset form
      setSelectedStatus(null);
      setRating(0);
      setFeedback('');
      setSkipReason('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log consumption. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? 'text-yellow-400 fill-current'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {value > 0 && `${value}/5`}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border hover-elevate transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Meal Consumption Logger
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Meal Info */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground capitalize">{mealType}</h4>
                <p className="text-sm text-muted-foreground">{mealItem}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {calories} cal
              </Badge>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Did you consume this meal?</h4>
            <div className="flex gap-3">
              <Button
                variant={selectedStatus === 'consumed' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('consumed')}
                className={`flex-1 ${
                  selectedStatus === 'consumed'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Consumed
              </Button>
              <Button
                variant={selectedStatus === 'skipped' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('skipped')}
                className={`flex-1 ${
                  selectedStatus === 'skipped'
                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                    : 'border-destructive/20 text-destructive hover:bg-destructive/10'
                }`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Skipped
              </Button>
            </div>
          </div>

          {/* Rating Section */}
          {selectedStatus === 'consumed' && showRating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <h4 className="font-medium text-foreground">Rate your meal experience</h4>
              <StarRating value={rating} onChange={setRating} />
            </motion.div>
          )}

          {/* Feedback Section */}
          {selectedStatus === 'consumed' && showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-3"
            >
              <h4 className="font-medium text-foreground">Share your feedback</h4>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="How was your meal? Any suggestions for improvement?"
                className="min-h-[80px] resize-none"
              />
            </motion.div>
          )}

          {/* Skip Reason Section */}
          {selectedStatus === 'skipped' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <h4 className="font-medium text-foreground">Why did you skip this meal?</h4>
              <Textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="Please provide a reason for skipping this meal..."
                className="min-h-[80px] resize-none"
              />
            </motion.div>
          )}

          {/* Submit Button */}
          {selectedStatus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="pt-4 border-t border-border"
            >
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Logging...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Log Consumption
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center">
            <p>Your feedback helps us improve your meal experience</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}