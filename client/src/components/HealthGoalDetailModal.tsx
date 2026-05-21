import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface HealthGoalPlanDetail {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  image: string;
  benefits: string[];
  sampleMeals: string[];
  macros: {
    protein: string;
    carbs: string;
    fats: string;
    calories: string;
  };
  includes: string[];
}

interface HealthGoalDetailModalProps {
  plan: HealthGoalPlanDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export default function HealthGoalDetailModal({
  plan,
  isOpen,
  onClose,
  onSubscribe,
}: HealthGoalDetailModalProps) {
  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-health-goal-detail">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold" data-testid="text-modal-title">
              {plan.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hero Image Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-64 rounded-xl overflow-hidden"
          >
            <img
              src={plan.image}
              alt={plan.title}
              className="w-full h-full object-cover"
            />
            {plan.badge && (
              <Badge
                className="absolute top-4 right-4 bg-[#FF8C00] text-white border-0 rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg"
                data-testid="badge-modal-plan"
              >
                {plan.badge}
              </Badge>
            )}
          </motion.div>

          {/* Description */}
          <div>
            <p className="text-muted-foreground text-base leading-relaxed">
              {plan.description}
            </p>
          </div>

          {/* Price and Rating */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-lg text-[#FF6B6B] line-through" data-testid="text-modal-original-price">
                ₹{plan.originalPrice.toLocaleString()}
              </span>
              <span className="text-3xl font-bold text-primary" data-testid="text-modal-current-price">
                ₹{plan.currentPrice.toLocaleString()}/month
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-[#FFD700] text-[#FFD700]" />
              <span className="text-lg font-semibold" data-testid="text-modal-rating">
                {plan.rating}
              </span>
              <span className="text-sm text-muted-foreground">
                ({plan.reviewCount.toLocaleString()}+ reviews)
              </span>
            </div>
          </div>

          {/* Benefits Section */}
          <div>
            <h3 className="text-xl font-semibold mb-4" data-testid="text-benefits-heading">
              Key Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3"
                  data-testid={`item-benefit-${index}`}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Nutritional Information */}
          <div>
            <h3 className="text-xl font-semibold mb-4" data-testid="text-macros-heading">
              Nutritional Information (Per Day)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center" data-testid="card-macro-calories">
                <p className="text-2xl font-bold text-primary">{plan.macros.calories}</p>
                <p className="text-sm text-muted-foreground">Calories</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center" data-testid="card-macro-protein">
                <p className="text-2xl font-bold text-primary">{plan.macros.protein}</p>
                <p className="text-sm text-muted-foreground">Protein</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center" data-testid="card-macro-carbs">
                <p className="text-2xl font-bold text-primary">{plan.macros.carbs}</p>
                <p className="text-sm text-muted-foreground">Carbs</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center" data-testid="card-macro-fats">
                <p className="text-2xl font-bold text-primary">{plan.macros.fats}</p>
                <p className="text-sm text-muted-foreground">Fats</p>
              </div>
            </div>
          </div>

          {/* Sample Meals */}
          <div>
            <h3 className="text-xl font-semibold mb-4" data-testid="text-sample-meals-heading">
              Sample Daily Meals
            </h3>
            <div className="space-y-2">
              {plan.sampleMeals.map((meal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-muted/20 rounded-lg"
                  data-testid={`item-sample-meal-${index}`}
                >
                  <p className="text-sm font-medium text-foreground">{meal}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h3 className="text-xl font-semibold mb-4" data-testid="text-includes-heading">
              What's Included
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.includes.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3"
                  data-testid={`item-includes-${index}`}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Subscribe Button */}
          <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t">
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground rounded-full text-lg"
              onClick={onSubscribe}
              data-testid="button-modal-subscribe"
            >
              Subscribe to {plan.title} - ₹{plan.currentPrice.toLocaleString()}/month
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
