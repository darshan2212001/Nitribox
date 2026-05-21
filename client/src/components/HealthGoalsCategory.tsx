import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { viewportConfig } from "@/lib/animations";
import HealthGoalDetailModal from "./HealthGoalDetailModal";
// Local image paths
const weightLossImage = "/images/weight-loss-plan.jpg";
const muscleGainImage = "/images/muscle-gain-plan.jpg";
const balancedNutritionImage = "/images/weight-loss-plan.jpg";
const diabeticFriendlyImage = "/images/diabetic-plan.jpg";
const veganImage = "/images/pcos-plan.jpg";
const postpartumImage = "/images/senior-plan.jpg";
const seniorImage = "/images/senior-plan.jpg";
const kidsImage = "/images/diabetic-plan.jpg";
const recoveryImage = "/images/muscle-gain-plan.jpg";

interface MealPlanAPI {
  id: string;
  title: string;
  description: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  imageUrl?: string;
  features?: string;
}

interface HealthGoalPlan {
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

// Function to extend API meal plan data with modal details
const extendMealPlan = (plan: MealPlanAPI): HealthGoalPlan => {
  const defaultImage = balancedNutritionImage;
  
  // Use API image_url if available, otherwise fallback to mapped images
  let image = plan.imageUrl || defaultImage;
  
  // If no API image, map based on title and category
  if (!plan.imageUrl) {
    const titleLower = plan.title.toLowerCase();
    const categoryLower = plan.category?.toLowerCase() || "";
    
    // Check title first for more specific matching (title takes precedence over category)
    if (titleLower.includes("weight loss") || categoryLower === "weight_management") {
      image = weightLossImage;
    } else if (titleLower.includes("muscle") || categoryLower === "fitness") {
      image = muscleGainImage;
    } else if (titleLower.includes("diabetic") || titleLower.includes("diabetes")) {
      image = diabeticFriendlyImage;
    } else if (titleLower.includes("pcos")) {
      image = diabeticFriendlyImage;
    } else if (titleLower.includes("vegan") || titleLower.includes("vegetarian")) {
      image = veganImage;
    } else if (titleLower.includes("postpartum") || titleLower.includes("mom") || categoryLower === "special") {
      image = postpartumImage;
    } else if (titleLower.includes("senior") || titleLower.includes("elderly") || (categoryLower === "age_specific" && titleLower.includes("senior"))) {
      image = seniorImage;
    } else if (titleLower.includes("kid") || titleLower.includes("child") || (categoryLower === "age_specific" && titleLower.includes("kid"))) {
      image = kidsImage;
    } else if (titleLower.includes("recovery") || titleLower.includes("healing")) {
      image = recoveryImage;
    } else if (titleLower.includes("balanced") || titleLower.includes("general")) {
      image = balancedNutritionImage;
    }
  }

  // Default benefits based on category
  const defaultBenefits = [
    "Nutritionist-designed meal plans",
    "Fresh ingredients delivered daily",
    "Customizable to your preferences",
    "Track your progress with ease",
    "24/7 customer support",
    "Flexible subscription options"
  ];

  // Default sample meals
  const defaultMeals = [
    "Breakfast: Healthy morning meal (350 kcal)",
    "Mid-Morning: Nutritious snack (150 kcal)",
    "Lunch: Balanced main course (500 kcal)",
    "Evening Snack: Light refreshment (180 kcal)",
    "Dinner: Wholesome dinner (450 kcal)"
  ];

  // Default macros
  const defaultMacros = {
    calories: "1800",
    protein: "120g",
    carbs: "200g",
    fats: "60g"
  };

  // Default includes
  const defaultIncludes = [
    "6 meals per day delivered fresh",
    "Nutritionist consultation",
    "Personalized meal planning",
    "Progress tracking dashboard",
    "WhatsApp support",
    "Free diet customization"
  ];

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    originalPrice: plan.originalPrice,
    currentPrice: plan.currentPrice,
    rating: plan.rating,
    reviewCount: plan.reviewCount,
    badge: plan.badge,
    image: image,
    benefits: defaultBenefits,
    sampleMeals: defaultMeals,
    macros: defaultMacros,
    includes: defaultIncludes,
  };
};

const staticHealthGoalPlans: HealthGoalPlan[] = [
  {
    id: "weight-loss",
    title: "Weight Loss",
    description: "Scientifically designed meals for sustainable weight management with balanced portions and nutrient-dense ingredients that help you shed pounds naturally while keeping you energized throughout the day.",
    originalPrice: 18000,
    currentPrice: 15000,
    rating: 4.9,
    reviewCount: 5200,
    badge: "Most Popular",
    image: weightLossImage,
    benefits: [
      "Reduces body fat by 15-20% in 3 months",
      "Boosts metabolism naturally",
      "Reduces hunger cravings",
      "Improves energy levels",
      "Personalized calorie targets",
      "Weekly progress tracking"
    ],
    sampleMeals: [
      "Breakfast: Oats with berries and almonds (320 kcal)",
      "Mid-Morning: Green smoothie with spinach and apple (150 kcal)",
      "Lunch: Grilled chicken with quinoa and vegetables (450 kcal)",
      "Evening Snack: Greek yogurt with chia seeds (180 kcal)",
      "Dinner: Baked fish with steamed broccoli (400 kcal)"
    ],
    macros: {
      calories: "1500",
      protein: "120g",
      carbs: "150g",
      fats: "45g"
    },
    includes: [
      "6 meals per day delivered fresh",
      "Nutritionist consultation (weekly)",
      "Personalized meal planning",
      "Progress tracking dashboard",
      "WhatsApp support",
      "Free diet customization"
    ]
  },
  {
    id: "muscle-gain",
    title: "Muscle Gain",
    description: "High-protein nutrition for strength and muscle building with optimal macro distribution to support intense workouts and accelerate recovery while promoting lean muscle growth.",
    originalPrice: 20000,
    currentPrice: 17000,
    rating: 4.8,
    reviewCount: 3800,
    badge: "High Protein",
    image: muscleGainImage,
    benefits: [
      "Gain 3-5 kg lean muscle mass in 3 months",
      "Enhanced workout performance",
      "Faster muscle recovery",
      "Increased strength gains",
      "Optimized protein timing",
      "Pre and post-workout meals"
    ],
    sampleMeals: [
      "Breakfast: Egg white omelette with whole wheat toast (450 kcal)",
      "Mid-Morning: Protein shake with banana (280 kcal)",
      "Lunch: Grilled chicken breast with brown rice (650 kcal)",
      "Pre-Workout: Oats with peanut butter (320 kcal)",
      "Post-Workout: Whey protein with sweet potato (380 kcal)",
      "Dinner: Lean beef with quinoa and veggies (550 kcal)"
    ],
    macros: {
      calories: "2800",
      protein: "200g",
      carbs: "320g",
      fats: "85g"
    },
    includes: [
      "7 high-protein meals daily",
      "Sports nutritionist guidance",
      "Workout-synced meal timing",
      "Supplement recommendations",
      "Body composition tracking",
      "Monthly progress assessment"
    ]
  },
  {
    id: "balanced-nutrition",
    title: "Balanced Nutrition",
    description: "Complete nutrition for overall health and wellness with perfectly balanced macros, essential vitamins, and minerals to support your daily lifestyle and maintain optimal health.",
    originalPrice: 16000,
    currentPrice: 13500,
    rating: 4.7,
    reviewCount: 4100,
    image: balancedNutritionImage,
    benefits: [
      "Maintains optimal body weight",
      "Boosts immune system",
      "Improves digestion",
      "Enhances mental clarity",
      "Supports heart health",
      "Increases daily energy"
    ],
    sampleMeals: [
      "Breakfast: Multigrain toast with avocado and eggs (380 kcal)",
      "Mid-Morning: Mixed nuts and fruits (200 kcal)",
      "Lunch: Dal with brown rice and mixed vegetables (480 kcal)",
      "Evening Snack: Hummus with vegetable sticks (150 kcal)",
      "Dinner: Grilled fish with salad and sweet potato (420 kcal)"
    ],
    macros: {
      calories: "2000",
      protein: "100g",
      carbs: "250g",
      fats: "65g"
    },
    includes: [
      "5 balanced meals per day",
      "Nutritionist consultation",
      "Customizable meal preferences",
      "Health monitoring",
      "Recipe recommendations",
      "Lifestyle coaching"
    ]
  },
  {
    id: "diabetic-friendly",
    title: "Diabetic Friendly",
    description: "Low GI meals for better blood sugar control with carefully selected ingredients that help manage glucose levels while providing complete nutrition and delicious flavors.",
    originalPrice: 17000,
    currentPrice: 14500,
    rating: 4.9,
    reviewCount: 2900,
    badge: "Doctor Approved",
    image: diabeticFriendlyImage,
    benefits: [
      "Stabilizes blood sugar levels",
      "Reduces HbA1c by 1-2%",
      "Low glycemic index foods",
      "Improves insulin sensitivity",
      "Reduces diabetes medication",
      "Doctor-approved meal plans"
    ],
    sampleMeals: [
      "Breakfast: Sugar-free oats with berries (300 kcal)",
      "Mid-Morning: Unsweetened yogurt with nuts (180 kcal)",
      "Lunch: Grilled chicken with cauliflower rice (420 kcal)",
      "Evening Snack: Roasted chickpeas (150 kcal)",
      "Dinner: Baked fish with leafy greens (380 kcal)"
    ],
    macros: {
      calories: "1600",
      protein: "110g",
      carbs: "140g",
      fats: "50g"
    },
    includes: [
      "6 low-GI meals daily",
      "Diabetologist consultation",
      "Blood sugar monitoring guide",
      "Carb counting assistance",
      "Medication coordination",
      "Emergency diet support"
    ]
  },
];

interface HealthGoalsCategoryProps {
  onCategorySelect?: (categoryId: string) => void;
  onAddToCart?: (item: { id: string; title: string; duration: string; image: string; originalPrice: number; price: number; category?: string; description?: string }) => void;
}

export default function HealthGoalsCategory({ onCategorySelect, onAddToCart }: HealthGoalsCategoryProps) {
  const [selectedPlan, setSelectedPlan] = useState<HealthGoalPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch meal plans in background; show static catalog immediately (no skeleton blocking UX)
  const { data: mealPlansData } = useQuery<MealPlanAPI[]>({
    queryKey: ["/api/meal-plans"],
    staleTime: 60_000,
    retry: 1,
  });

  const healthGoalPlans =
    Array.isArray(mealPlansData) && mealPlansData.length > 0
      ? mealPlansData.map(extendMealPlan)
      : staticHealthGoalPlans;

  const handleCardClick = (plan: HealthGoalPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleSubscribe = () => {
    if (selectedPlan) {
      onCategorySelect?.(selectedPlan.id);
      
      // Add to cart if onAddToCart is provided
      if (onAddToCart) {
        onAddToCart({
          id: selectedPlan.id,
          title: selectedPlan.title,
          duration: "30 Days Subscription",
          image: selectedPlan.image,
          originalPrice: selectedPlan.originalPrice,
          price: selectedPlan.currentPrice,
          category: selectedPlan.title,
          description: selectedPlan.description,
        });
      }
      
      setIsModalOpen(false);
    }
  };

  return (
    <>
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
            className="text-3xl md:text-5xl font-bold text-foreground mb-3 md:mb-4"
          >
            Choose Your Health Goal
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportConfig}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
          >
            Expertly crafted meal plans designed to help you achieve your wellness goals
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {healthGoalPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white dark:bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group hover-elevate active-elevate-2 cursor-pointer"
              onClick={() => handleCardClick(plan)}
              data-testid={`card-health-goal-${plan.id}`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Small Image Thumbnail */}
                <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                  <img
                    src={plan.image}
                    alt={plan.title}
                    className="w-full h-full object-cover"
                  />
                  {plan.badge && (
                    <Badge
                      className="absolute top-1 right-1 bg-[#FF8C00] text-white border-0 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-md"
                      data-testid={`badge-${plan.badge.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                </div>

                {/* Content on Right */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-1 truncate" data-testid={`text-plan-${plan.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {plan.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    {plan.description}
                  </p>
                  
                  {/* Price and Rating Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#FF6B6B] line-through" data-testid={`text-original-price-${plan.id}`}>
                        ₹{plan.originalPrice.toLocaleString()}
                      </span>
                      <span className="text-base font-bold text-primary" data-testid={`text-current-price-${plan.id}`}>
                        ₹{plan.currentPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#FFD700] text-[#FFD700]" />
                      <span className="text-xs font-semibold" data-testid={`text-rating-${plan.id}`}>
                        {plan.rating}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({plan.reviewCount.toLocaleString()}+)
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-primary text-primary-foreground rounded-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(plan);
                    }}
                    data-testid={`button-subscribe-${plan.id}`}
                  >
                    Subscribe Now
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <HealthGoalDetailModal
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubscribe={handleSubscribe}
      />
    </>
  );
}
