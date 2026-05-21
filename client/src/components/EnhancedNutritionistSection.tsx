import { useState, useEffect, useRef } from "react";
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
import EnhancedNutritionistCard from "./EnhancedNutritionistCard";
import NutritionistProfileModal from "./NutritionistProfileModal";
import BookingCalendar from "./BookingCalendar";

interface Nutritionist {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  totalClients: number;
  city: string;
  tagline: string;
  bio: string;
  qualifications: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface EnhancedNutritionistSectionProps {
  nutritionists: Nutritionist[];
  onConsult?: (nutritionistId: string) => void;
}

export default function EnhancedNutritionistSection({
  nutritionists,
  onConsult: _onConsult,
}: EnhancedNutritionistSectionProps) {
  const [selectedNutritionist, setSelectedNutritionist] = useState<Nutritionist | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingNutritionist, setBookingNutritionist] = useState<Nutritionist | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleViewProfile = (nutritionistId: string) => {
    const nutritionist = nutritionists.find(n => n.id === nutritionistId);
    if (nutritionist) {
      setSelectedNutritionist(nutritionist);
      setShowProfileModal(true);
    }
  };

  const handleBookConsultation = (nutritionistId: string) => {
    const nutritionist = nutritionists.find(n => n.id === nutritionistId);
    if (nutritionist) {
      setBookingNutritionist(nutritionist);
      setShowBookingModal(true);
    }
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (nutritionists.length <= 1) return;

    const startAutoScroll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      intervalRef.current = window.setInterval(() => {
        if (!isHovered) {
          setCurrentSlide((prev) => (prev + 1) % nutritionists.length);
        }
      }, 4000) as any; // Auto-scroll every 4 seconds
    };

    startAutoScroll();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [nutritionists.length, isHovered]);

  const _handleSlideChange = (index: number) => {
    setCurrentSlide(index);
    // Reset auto-scroll timer when user manually changes slide
    if (intervalRef.current) clearInterval(intervalRef.current);
    window.setTimeout(() => {
      if (!isHovered) {
        intervalRef.current = window.setInterval(() => {
          setCurrentSlide((prev) => (prev + 1) % nutritionists.length);
        }, 4000) as any;
      }
    }, 1000);
  };

  const handleBookAppointment = (nutritionistId: string) => {
    setShowProfileModal(false);
    const nutritionist = nutritionists.find(n => n.id === nutritionistId);
    if (nutritionist) {
      setBookingNutritionist(nutritionist);
      setShowBookingModal(true);
    }
  };

  const handleBookingSuccess = (bookingDetails: any) => {
    console.log("Booking successful:", bookingDetails);
    // You can add additional logic here like showing a success toast
    // or updating the UI to reflect the new booking
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setSelectedNutritionist(null);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setBookingNutritionist(null);
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewportConfig}
        transition={{ duration: 0.6 }}
        className="relative py-16 md:py-24"
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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {nutritionists.map((nutritionist, index) => (
              <CarouselItem key={nutritionist.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportConfig}
                  transition={{ delay: index * 0.1 }}
                >
                  <EnhancedNutritionistCard
                    nutritionist={nutritionist}
                    onViewProfile={handleViewProfile}
                    onBookConsultation={handleBookConsultation}
                  />
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

      {/* Profile Modal */}
      <NutritionistProfileModal
        nutritionist={selectedNutritionist}
        isOpen={showProfileModal}
        onClose={handleCloseProfileModal}
        onBookAppointment={handleBookAppointment}
      />

      {/* Booking Calendar Modal */}
      {bookingNutritionist && (
        <BookingCalendar
          nutritionistId={bookingNutritionist.id}
          nutritionistName={bookingNutritionist.name}
          isOpen={showBookingModal}
          onClose={handleCloseBookingModal}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </>
  );
}
