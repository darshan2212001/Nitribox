import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Users } from "lucide-react";

interface Nutritionist {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  totalClients: number;
  city: string;
  tagline: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface EnhancedNutritionistCardProps {
  nutritionist: Nutritionist;
  onViewProfile: (nutritionistId: string) => void;
  onBookConsultation: (nutritionistId: string) => void;
}

export default function EnhancedNutritionistCard({
  nutritionist,
  onViewProfile,
  onBookConsultation,
}: EnhancedNutritionistCardProps) {
  // Default placeholder images for nutritionists
  const getNutritionistImage = (name: string) => {
    const imageMap: { [key: string]: string } = {
      "Dr. Meera Sharma": "/images/nutritionist-1.jpg",
      "Dr. Aarav Mehta": "/images/nutritionist-2.jpg",
      "Dr. Sneha Iyer": "/images/nutritionist-1.jpg",
      "Dr. Karan Bhatia": "/images/nutritionist-2.jpg",
      "Dr. Ananya Rao": "/images/nutritionist-1.jpg",
    };
    return imageMap[name] || "/images/nutritionist-1.jpg";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className="bg-card rounded-2xl p-6 hover-elevate border border-border h-full flex flex-col"
      data-testid={`card-nutritionist-${nutritionist.id}`}
    >
      <div className="flex flex-col items-center text-center flex-grow">
        {/* Profile Image */}
        <div className="relative mb-4">
          <img
            src={nutritionist.imageUrl || getNutritionistImage(nutritionist.name)}
            alt={nutritionist.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
          />
          {nutritionist.isAvailable && (
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
          )}
        </div>
        
        {/* Name and Specialization */}
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {nutritionist.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          {nutritionist.specialization}
        </p>
        
        {/* Rating and Clients */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-foreground">
              {nutritionist.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {nutritionist.totalClients} clients
            </span>
          </div>
        </div>
        
        {/* City */}
        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {nutritionist.city}
          </span>
        </div>
        
        {/* Tagline */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {nutritionist.tagline}
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-2 w-full mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => onViewProfile(nutritionist.id)}
            data-testid={`button-view-profile-${nutritionist.id}`}
          >
            View Profile
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
            onClick={() => onBookConsultation(nutritionist.id)}
            data-testid={`button-book-consultation-${nutritionist.id}`}
          >
            Book Consultation
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
