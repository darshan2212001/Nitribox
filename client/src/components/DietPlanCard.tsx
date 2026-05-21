import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface DietPlanCardProps {
  title: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  image: string;
  onSubscribe?: () => void;
}

export default function DietPlanCard({
  title,
  description,
  originalPrice,
  currentPrice,
  rating,
  reviewCount,
  badge,
  image,
  onSubscribe,
}: DietPlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -8 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-shadow duration-300 overflow-hidden group"
    >
      <div className="relative aspect-square overflow-hidden">
        <motion.img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.4 }}
        />
        {badge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <Badge
              className="absolute top-3 right-3 bg-[#FF8C00] text-white border-0 rounded-full px-3 py-1 text-xs font-semibold shadow-lg"
              data-testid={`badge-${badge.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {badge}
            </Badge>
          </motion.div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-2" data-testid={`text-plan-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-[#FF6B6B] line-through" data-testid="text-original-price">
            ₹{originalPrice.toLocaleString()}
          </span>
          <span className="text-xl font-bold text-primary" data-testid="text-current-price">
            ₹{currentPrice.toLocaleString()}/month
          </span>
        </div>
        <div className="flex items-center gap-1 mb-4">
          <Star className="w-4 h-4 fill-[#FFD700] text-[#FFD700]" />
          <span className="text-sm font-semibold" data-testid="text-rating">
            {rating}
          </span>
          <span className="text-sm text-muted-foreground">
            ({reviewCount.toLocaleString()}+)
          </span>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
          onClick={onSubscribe}
          data-testid="button-subscribe"
        >
          Subscribe Now
        </Button>
      </div>
    </motion.div>
  );
}
