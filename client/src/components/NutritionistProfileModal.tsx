import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Star, MapPin, Users, Calendar, Award, Quote } from "lucide-react";

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

interface NutritionistProfileModalProps {
  nutritionist: Nutritionist | null;
  isOpen: boolean;
  onClose: () => void;
  onBookAppointment: (nutritionistId: string) => void;
}

export default function NutritionistProfileModal({
  nutritionist,
  isOpen,
  onClose,
  onBookAppointment,
}: NutritionistProfileModalProps) {
  if (!nutritionist) return null;

  // Default placeholder images for nutritionists
  const getNutritionistImage = (name: string) => {
    const imageMap: { [key: string]: string } = {
      "Dr. Meera Sharma": "/images/nutritionist-1.jpg",
      "Dr. Aarav Mehta": "/images/nutritionist-2.jpg",
      "Dr. Sneha Iyer": "/images/nutritionist-3.jpg",
      "Dr. Karan Bhatia": "/images/nutritionist-4.jpg",
      "Dr. Ananya Rao": "/images/nutritionist-5.jpg",
    };
    return imageMap[name] || "/images/nutritionist-1.jpg";
  };

  // Mock testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      rating: 5,
      text: "Dr. Meera helped me lose 15kg in 6 months with a sustainable approach. Her meal plans are delicious and easy to follow!",
    },
    {
      id: 2,
      name: "Mike Chen",
      rating: 5,
      text: "The best nutritionist I've worked with. Dr. Meera's expertise in weight management is unmatched. Highly recommended!",
    },
    {
      id: 3,
      name: "Priya Patel",
      rating: 5,
      text: "Dr. Meera transformed my relationship with food. Her approach is holistic and focuses on long-term health, not just quick fixes.",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Nutritionist Profile</DialogTitle>
          <DialogDescription className="sr-only">
            View nutritionist profile and book consultation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Teal accent line */}
          <div className="h-1 bg-primary rounded-full" />
          
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <img
                src={nutritionist.imageUrl || getNutritionistImage(nutritionist.name)}
                alt={nutritionist.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
              />
            </div>
            
            {/* Profile Info */}
            <div className="flex-grow">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {nutritionist.name}
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                {nutritionist.specialization}
              </p>
              
              {/* Rating and Stats */}
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold text-foreground">
                    {nutritionist.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-lg text-muted-foreground">
                    {nutritionist.totalClients} clients
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="text-lg text-muted-foreground">
                    {nutritionist.city}
                  </span>
                </div>
              </div>
              
              {/* Tagline */}
              <p className="text-xl text-foreground font-medium leading-relaxed">
                {nutritionist.tagline}
              </p>
            </div>
          </div>
          
          {/* Bio Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-foreground">About</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              {nutritionist.bio}
            </p>
          </div>
          
          {/* Qualifications Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              Qualifications & Certifications
            </h3>
            <div className="space-y-2">
              {nutritionist.qualifications.split(',').map((qualification, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span className="text-base text-muted-foreground">
                    {qualification.trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Testimonials Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Quote className="w-6 h-6 text-primary" />
              Client Testimonials
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: testimonial.id * 0.1 }}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 italic">
                    "{testimonial.text}"
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    - {testimonial.name}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Sticky Bottom CTA */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4">
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
              onClick={() => onBookAppointment(nutritionist.id)}
              data-testid={`button-book-appointment-${nutritionist.id}`}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
