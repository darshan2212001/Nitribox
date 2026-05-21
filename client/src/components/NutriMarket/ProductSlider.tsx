import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { viewportConfig } from "@/lib/animations";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";

interface ProductSliderProps {
  products: Array<{
    id: string;
    name: string;
    shortBenefit?: string;
    price: number;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    tags?: string[];
  }>;
  onProductClick?: (productId: string) => void;
  onViewAll?: () => void;
}

export default function ProductSlider({ products, onProductClick, onViewAll }: ProductSliderProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={viewportConfig}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="text-center mb-6 md:mb-8 lg:mb-12 relative px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl blur-3xl -z-10"></div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          className="text-2xl md:text-3xl lg:text-5xl font-bold text-foreground mb-2 md:mb-3 lg:mb-4 leading-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
        >
          NutriMarket Picks
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ delay: 0.1 }}
          className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Top products recommended by our nutritionists
        </motion.p>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full px-4 md:px-0"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {products.map((product, index) => (
            <CarouselItem
              key={product.id}
              className="pl-2 md:pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3"
            >
              <ProductCard
                product={product}
                onClick={() => onProductClick?.(product.id)}
              />
            </CarouselItem>
          ))}
          {/* View All Card */}
          {onViewAll && (
            <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: products.length * 0.1 }}
                className="h-full"
              >
                <div
                  className="h-full bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border border-border hover-elevate cursor-pointer flex flex-col items-center justify-center text-center"
                  onClick={onViewAll}
                >
                  <h3 className="text-xl font-semibold mb-2">View All in NutriMarket</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Explore our complete range of nutritional products
                  </p>
                  <Button variant="outline" className="rounded-full">
                    Browse All <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious
          className="rounded-full -left-4 md:-left-6 shadow-lg !hidden md:!inline-flex"
        />
        <CarouselNext
          className="rounded-full -right-4 md:-right-6 shadow-lg !hidden md:!inline-flex"
        />
      </Carousel>
    </motion.section>
  );
}

