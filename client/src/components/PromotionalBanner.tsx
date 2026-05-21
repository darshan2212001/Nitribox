import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { viewportConfig } from "@/lib/animations";

interface PromoBanner {
  id: number;
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
}

const promoSlides: PromoBanner[] = [
  {
    id: 1,
    title: "Zyael NutriBox — Delivered Fresh Daily",
    subtitle: "Wholesome meals prepared with love, delivered to your doorstep every day",
    backgroundColor: "from-primary/20 via-primary/10 to-primary/5",
    textColor: "text-foreground",
  },
  {
    id: 2,
    title: "Save ₹3,000 on 90-Day Plans!",
    subtitle: "Limited time offer - Get maximum savings on quarterly subscriptions",
    backgroundColor: "from-orange-500/20 via-orange-500/10 to-orange-500/5",
    textColor: "text-foreground",
  },
  {
    id: 3,
    title: "Join 10,000+ Happy Customers!",
    subtitle: "Experience the transformation with India's most trusted nutrition platform",
    backgroundColor: "from-green-500/20 via-green-500/10 to-green-500/5",
    textColor: "text-foreground",
  },
];

interface PromotionalBannerProps {
  autoRotateInterval?: number;
}

export default function PromotionalBanner({ autoRotateInterval = 4000 }: PromotionalBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [autoRotateInterval]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={viewportConfig}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl md:rounded-3xl h-48 md:h-64"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className={`
            absolute inset-0 
            bg-gradient-to-r ${promoSlides[currentSlide].backgroundColor}
            flex items-center justify-center p-8 md:p-12
          `}
        >
          <div className="text-center max-w-3xl">
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`text-2xl md:text-4xl font-bold mb-3 md:mb-4 ${promoSlides[currentSlide].textColor}`}
            >
              {promoSlides[currentSlide].title}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg text-muted-foreground"
            >
              {promoSlides[currentSlide].subtitle}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10" data-testid="promo-banner-dots">
        {promoSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide 
                ? 'bg-primary w-6' 
                : 'bg-primary/30 hover:bg-primary/50'
            }`}
            data-testid={`button-promo-indicator-${index}`}
            aria-label={`Go to promo slide ${index + 1}`}
          />
        ))}
      </div>
    </motion.section>
  );
}
