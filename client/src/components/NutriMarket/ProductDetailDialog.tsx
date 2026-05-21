import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

interface ProductDetailDialogProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    description?: string;
    shortBenefit?: string;
    price: number;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    tags?: string[];
    keyBenefits?: string[];
    nutritionalHighlights?: Record<string, string>;
    suitableFor?: string[];
    nutritionistEndorsements?: string[];
  };
  relatedProducts?: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  }>;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onRelatedProductClick?: (productId: string) => void;
}

export default function ProductDetailDialog({
  open,
  onClose,
  product,
  relatedProducts = [],
  onAddToCart,
  onBuyNow,
  onRelatedProductClick,
}: ProductDetailDialogProps) {
  const renderStars = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 fill-none text-gray-300" />
      );
    }
    return stars;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] md:max-h-[90vh] h-[100vh] md:h-auto overflow-y-auto p-0 md:p-6 rounded-none md:rounded-lg">
        {/* Mobile Header with Close Button */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 md:hidden flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold line-clamp-1 pr-2">{product.name}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 touch-manipulation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="px-4 md:px-0 pb-4 md:pb-0">
          <DialogHeader className="hidden md:block">
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
          </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
            <img
              src={product.imageUrl || "https://images.unsplash.com/photo-1593095948071-474c5cc298f0?w=400&h=400&fit=crop"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {renderStars(product.rating || 0)}
                {product.rating && (
                  <span className="text-sm text-muted-foreground">
                    {product.rating.toFixed(1)} ({product.reviewCount || 0} reviews)
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-4">
                ₹{product.price.toFixed(2)}
              </div>
            </div>

            {product.shortBenefit && (
              <p className="text-lg text-muted-foreground">{product.shortBenefit}</p>
            )}

            {product.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 pb-4 md:pb-0">
              <Button
                variant="outline"
                className="flex-1 h-12 md:h-11 text-base font-semibold touch-manipulation"
                onClick={onAddToCart}
              >
                Add to Cart
              </Button>
              <Button
                className="flex-1 h-12 md:h-11 text-base font-semibold bg-primary text-primary-foreground touch-manipulation"
                onClick={onBuyNow}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        {product.keyBenefits && product.keyBenefits.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Key Benefits</h3>
            <ul className="space-y-2">
              {product.keyBenefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nutritional Highlights */}
        {product.nutritionalHighlights && Object.keys(product.nutritionalHighlights).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Nutritional Highlights</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(product.nutritionalHighlights).map(([key, value]) => (
                <div key={key} className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1 capitalize">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="text-lg font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suitable For */}
        {product.suitableFor && product.suitableFor.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Suitable For</h3>
            <div className="flex flex-wrap gap-2">
              {product.suitableFor.map((item, idx) => (
                <Badge key={idx} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Nutritionist Endorsements */}
        {product.nutritionistEndorsements && product.nutritionistEndorsements.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Recommended by Zyael Nutritionists
            </h3>
            <div className="space-y-2 bg-primary/5 rounded-lg p-4">
              {product.nutritionistEndorsements.map((endorsement, idx) => (
                <p key={idx} className="text-sm text-muted-foreground italic">
                  "{endorsement}"
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">You may also like</h3>
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {relatedProducts.map((relatedProduct) => (
                  <CarouselItem
                    key={relatedProduct.id}
                    className="pl-2 md:pl-4 basis-1/2 md:basis-1/3"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => onRelatedProductClick?.(relatedProduct.id)}
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted mb-2">
                        <img
                          src={relatedProduct.imageUrl || "https://images.unsplash.com/photo-1593095948071-474c5cc298f0?w=400&h=400&fit=crop"}
                          alt={relatedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="font-medium text-sm line-clamp-1 mb-1">
                        {relatedProduct.name}
                      </h4>
                      <p className="text-sm font-semibold">₹{relatedProduct.price.toFixed(2)}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

