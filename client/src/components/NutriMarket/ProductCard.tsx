import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { viewportConfig } from "@/lib/animations";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    shortBenefit?: string;
    price: number;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    tags?: string[];
  };
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const renderStars = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-3 h-3 fill-none text-gray-300" />
      );
    }
    return stars;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportConfig}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card
        className="h-full cursor-pointer hover-elevate border border-border overflow-hidden group rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        onClick={onClick}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50 rounded-t-2xl">
          <img
            src={product.imageUrl || "https://images.unsplash.com/photo-1593095948071-474c5cc298f0?w=600&h=600&fit=crop&auto=format"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div className="p-4 md:p-5 space-y-2.5 md:space-y-3">
          <h3 className="font-semibold text-foreground line-clamp-2 min-h-[2.75rem] text-[15px] md:text-base lg:text-lg leading-snug group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.shortBenefit && (
            <p className="text-[13px] md:text-sm text-muted-foreground line-clamp-1 leading-relaxed">
              {product.shortBenefit}
            </p>
          )}
          <div className="flex items-center gap-1.5 pt-1">
            {renderStars(product.rating || 0)}
            {product.rating && (
              <span className="text-[11px] md:text-xs text-muted-foreground ml-0.5 font-medium">
                {product.rating.toFixed(1)} <span className="text-muted-foreground/70">({product.reviewCount || 0})</span>
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div>
              <span className="text-xl md:text-2xl font-bold text-foreground">
                ₹{product.price.toFixed(0)}
              </span>
              {product.price % 1 !== 0 && (
                <span className="text-xs md:text-sm text-muted-foreground">.{String(product.price.toFixed(2)).split('.')[1]}</span>
              )}
            </div>
            {product.tags && product.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {product.tags.slice(0, 1).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] md:text-xs px-1.5 py-0.5 bg-primary/5 border-primary/20">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

