import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { viewportConfig } from "@/lib/animations";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";

interface Nutritionist {
  id: string;
  name: string;
  image: string;
  specialization: string;
  experience: string;
  isAvailable?: boolean;
}

interface NutritionistSliderProps {
  nutritionists: Nutritionist[];
  onConsult?: (nutritionistId: string) => void;
}

export default function NutritionistSlider({ nutritionists, onConsult }: NutritionistSliderProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={viewportConfig}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="text-center mb-8 md:mb-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          className="text-3xl md:text-5xl font-bold text-foreground mb-3 md:mb-4 px-4"
        >
          Talk to Your Nutritionist Anytime
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportConfig}
          transition={{ delay: 0.1 }}
          className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
        >
          Expert guidance from certified nutritionists, available when you need them
        </motion.p>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full px-4 md:px-0"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {nutritionists.map((nutritionist, index) => (
            <CarouselItem key={nutritionist.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 hover-elevate h-full border border-border"
                data-testid={`card-nutritionist-${nutritionist.id}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <img
                      src={nutritionist.image}
                      alt={nutritionist.name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                    />
                    {nutritionist.isAvailable && (
                      <div className="absolute bottom-0 right-0 w-6 h-6 bg-success rounded-full border-4 border-white" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {nutritionist.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {nutritionist.specialization}
                  </p>
                  <Badge variant="secondary" className="mb-4">
                    {nutritionist.experience}
                  </Badge>
                  
                  <Button
                    className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
                    onClick={() => onConsult?.(nutritionist.id)}
                    data-testid={`button-consult-${nutritionist.id}`}
                  >
                    Consult Now
                  </Button>
                </div>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="rounded-full -left-4 md:-left-6 shadow-lg !hidden md:!inline-flex"
          data-testid="button-carousel-nutritionist-prev"
        />
        <CarouselNext
          className="rounded-full -right-4 md:-right-6 shadow-lg !hidden md:!inline-flex"
          data-testid="button-carousel-nutritionist-next"
        />
      </Carousel>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportConfig}
        transition={{ delay: 0.3 }}
        className="text-center mt-6 md:mt-8"
      >
        <Button
          variant="outline"
          size="lg"
          className="rounded-full"
          onClick={() => console.log("Book free consultation")}
          data-testid="button-book-free-consultation"
        >
          Book Your Free Consultation
        </Button>
      </motion.div>
    </motion.section>
  );
}
