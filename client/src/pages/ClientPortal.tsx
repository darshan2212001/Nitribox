import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { pageTransitionVariants, viewportConfig } from "@/lib/animations";
import { useRealtime } from "@/hooks/use-realtime";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { portalThemes } from "@/lib/ui-config";
import HeroSlider from "@/components/HeroSlider";
import HealthGoalsCategory from "@/components/HealthGoalsCategory";
import EnhancedNutritionistSection from "@/components/EnhancedNutritionistSection";
import PromotionalBanner from "@/components/PromotionalBanner";
import SmartNotification from "@/components/SmartNotification";
import ClientFooter from "@/components/ClientFooter";
import TestimonialCard from "@/components/TestimonialCard";
import { Button } from "@/components/ui/button";
import ProductSlider from "@/components/NutriMarket/ProductSlider";
import NutriMarket from "@/pages/NutriMarket";
import EnhancedTracking from "@/components/EnhancedTracking";
import LocationSearch from "@/components/LocationSearch";
import BottomNavigation from "@/components/BottomNavigation";
import MockPaymentGateway from "@/components/MockPaymentGateway";
import PortalNavigation, { getClientNavigationItems } from "@/components/PortalNavigation";
import SubscriptionCalendar from "@/components/SubscriptionCalendar";
import SubscriptionCompletionStatus from "@/components/SubscriptionCompletionStatus";
import TodaysMeals from "@/components/TodaysMeals";
import { LiveDeliveryTracker } from "@/components/LiveDeliveryTracker";
import { MealConsumptionLogger } from "@/components/MealConsumptionLogger";
import { WeeklyProgressReport } from "@/components/WeeklyProgressReport";
import Notifications from "@/components/Notifications";
import AddressManagement from "@/components/AddressManagement";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Image placeholders - replace with actual images when available
const heroBanner = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&h=400&fit=crop";
const weightLoss = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop";
const proteinMeal = "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=200&fit=crop";
const nutritionist1 = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face";
const nutritionist2 = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face";
const customer1 = "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face";
const customer2 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face";
const newsCalorie = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=300&h=200&fit=crop";
const newsSuperfoods = "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=200&fit=crop";

export default function ClientPortal() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedNutritionistForBooking, setSelectedNutritionistForBooking] = useState<{ id: string; name: string } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const { user, logout } = useAuth();
  const { cartItems, addToCart, removeFromCart, updateQuantity, getTotalPrice, getTotalItems, clearCart } = useCart();
  const { toast } = useToast();
  const theme = portalThemes.client;

  // Real-time updates for subscription ecosystem
  useRealtime({
    events: [
      "meal_plan_created", "meal_plan_updated", "meal_plan_deleted", 
      "nutritionist_created", "nutritionist_updated", 
      "order_created", "order_updated", "order_deleted",
      "subscription.created", "subscription.updated",
      "daily_meals.generated", "meal_plan.updated",
      "meal.preparing", "meal.packed", "meal.delivered",
      "delivery.assigned", "delivery.location_update", "delivery.delivered",
      "meal.consumed", "meal.skipped", "weekly.report_ready",
      "consultation.scheduled", "consultation.reminder", "consultation.completed"
    ],
    channels: [], // Auto-subscribe to client_{client_id} channel via userRole and userId
    userRole: "client",
    userId: user?.id || undefined, // Get from auth context
    invalidateQueries: [
      ["/api/meal-plans"], 
      ["/api/nutritionists"], 
      ["/api/orders"],
      ["/api/subscriptions"],
      ["/api/daily-meals/today"],
      ["/api/delivery-tracking"],
      ["/api/consultations"]
    ],
    showToast: true,
  });

  // Fetch nutritionists from API
  const { data: nutritionistsData, error: nutritionistsError } = useQuery({
    queryKey: ["/api/nutritionists"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60_000,
    retry: 1,
  });
  
  // Log errors separately
  if (nutritionistsError) {
    console.error('Failed to fetch nutritionists:', nutritionistsError);
  }

  // Fetch featured products for home slider
  const { data: featuredProductsData } = useQuery({
    queryKey: ["/api/products/featured"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Fetch orders from API for current user
  const { data: ordersData, error: ordersError } = useQuery({
    queryKey: [`/api/orders?client_id=${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id, // Only fetch when user ID is available
    retry: 1,
    staleTime: 30_000,
  });
  
  // Log errors separately
  if (ordersError) {
    console.error('Failed to fetch orders:', ordersError);
  }

  // Fetch user's subscriptions
  const { data: subscriptionsData } = useQuery({
    queryKey: [`/api/subscriptions/client/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30_000,
  });

  // Fetch today's meals for the user
  const { data: todaysMealsData } = useQuery({
    queryKey: [`/api/daily-meals/client/${user?.id}/today`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30_000,
  });

  // Fetch weekly reports (keeps cache warm for reports tab)
  useQuery({
    queryKey: [`/api/reports/weekly/client/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 60_000,
  });

  // Fetch meal schedules for subscription calendar
  const { data: mealSchedulesData } = useQuery({
    queryKey: [`/api/subscriptions/${Array.isArray(subscriptionsData) && subscriptionsData[0]?.id ? subscriptionsData[0].id : 'none'}/daily-schedule`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id && !!subscriptionsData && Array.isArray(subscriptionsData) && subscriptionsData.length > 0,
  });

  // Fetch delivery tracking data
  const { data: deliveryTrackingData } = useQuery({
    queryKey: [`/api/delivery-tracking/client/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds for live updates
  });

  // Map nutritionist images (use existing images as placeholders)
  // Nutritionist images - now using API image_url field

  // Prepare nutritionists with images and experience format
  const nutritionists = (Array.isArray(nutritionistsData) ? nutritionistsData : []).map((nutritionist: any) => ({
    ...nutritionist,
    imageUrl: nutritionist.imageUrl || nutritionist1, // Use API image_url if available, fallback to placeholder
    experience: `${nutritionist.experienceYears} years experience`,
  }));

  // Fallback test data if no nutritionists are loaded
  const fallbackNutritionists = [
    {
      id: "fallback-1",
      name: "Dr. Meera Sharma",
      specialization: "Weight Loss & Lifestyle Management",
      rating: 4.9,
      totalClients: 320,
      city: "Bengaluru",
      tagline: "Transform your relationship with food and achieve lasting weight loss",
      bio: "Dr. Meera Sharma is a certified nutritionist with over 12 years of experience in weight management and lifestyle modification.",
      qualifications: "MSc Nutrition, Certified Diabetes Educator, Sports Nutrition Specialist",
      imageUrl: nutritionist1,
      isAvailable: true,
      experience: "12 years experience",
    },
    {
      id: "fallback-2", 
      name: "Dr. Aarav Mehta",
      specialization: "Sports & Muscle Gain Nutrition",
      rating: 4.8,
      totalClients: 280,
      city: "Mumbai",
      tagline: "Fuel your gains with science-backed nutrition strategies",
      bio: "Dr. Aarav Mehta is a sports nutritionist and former athlete with 15 years of experience in performance nutrition.",
      qualifications: "PhD Sports Nutrition, Certified Strength & Conditioning Specialist, ISSA Certified",
      imageUrl: nutritionist2,
      isAvailable: true,
      experience: "15 years experience",
    }
  ];

  // Prefer API data; fall back immediately so the home tab never blocks on skeletons
  const displayNutritionists = nutritionists.length > 0 ? nutritionists : fallbackNutritionists;

  // Check for scheduleConsultation query param and open booking modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldSchedule = params.get("scheduleConsultation");
    
    if (shouldSchedule === "true" && subscriptionsData && Array.isArray(subscriptionsData) && subscriptionsData.length > 0) {
      const latestSubscription = subscriptionsData[0];
      const nutritionistId = latestSubscription.nutritionist_id;
      
      if (nutritionistId) {
        // Find nutritionist in the list
        const nutritionist = displayNutritionists.find((n: any) => n.id === nutritionistId);
        if (nutritionist) {
          setSelectedNutritionistForBooking({
            id: nutritionist.id,
            name: nutritionist.name
          });
          setShowBookingModal(true);
          
          // Remove query param from URL
          params.delete("scheduleConsultation");
          const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        } else {
          toast({
            title: "Schedule Consultation",
            description: "Your nutritionist will be assigned soon. You'll receive a notification to schedule your consultation.",
          });
          // Remove query param even if nutritionist not found
          params.delete("scheduleConsultation");
          const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
      } else {
        toast({
          title: "Schedule Consultation",
          description: "Your nutritionist is being assigned. You'll receive a notification once assigned to schedule your consultation.",
        });
        // Remove query param even if nutritionist not assigned
        params.delete("scheduleConsultation");
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [location, subscriptionsData, displayNutritionists, toast]);

  const testimonials = [
    {
      name: "Meera, 28 – Content Writer",
      role: "Content Writer",
      location: "Bengaluru",
      testimonial:
        "I signed up after seeing their Instagram ad saying \"Meals made with care.\" True to that, I got a call from their nutritionist a few days in. She spoke with me about my stress, eating gaps, and even sleep. It felt like therapy through food. Now my mom doesn't just ask if I ate—she says, \"Hope you had your nutrition check too!\"",
      image: customer1,
    },
    {
      name: "Nikhil, 35 – Sales Manager",
      role: "Sales Manager",
      location: "Bengaluru",
      testimonial:
        "I'm always on the move, and I hated planning food. A colleague using Zyael Nutri Box recommended it. I liked that it wasn't just meal delivery—every week I get a short nutrition consultation where they tweak my meals based on my schedule and how I feel. It's like having a support system without needing to step out.",
      image: customer2,
    },
    {
      name: "Rohan, 27 – Software Developer",
      role: "Software Developer",
      location: "Bengaluru",
      testimonial:
        "I stumbled on Zyael Nutri Box while scrolling Instagram during a late-night coding session. Their meals looked clean and balanced, so I tried it out. What I didn't expect was the weekly call from their nutritionist—it wasn't just food, they actually ask how you're doing, what you liked, and if any changes are needed. For the first time, I feel like someone's actually helping me manage my health—not just feeding me.",
      image: customer1,
    },
    {
      name: "Shruti, 24 – MBA Student",
      role: "MBA Student",
      location: "Bengaluru",
      testimonial:
        "I found Zyael Nutri Box while Googling \"healthy food delivery in Bangalore.\" The food is great, but what impressed me more is that they pair it with weekly nutrition consultations. I spoke with a dietitian who adjusted my plan after listening to my routine and stress levels. It feels like a system that genuinely wants to see you improve—not just deliver boxes.",
      image: customer2,
    },
    {
      name: "Mrs. Shalini",
      role: "Mother",
      location: "Pune",
      testimonial:
        "My daughter's colleague told her about Zyael Nutri Box. She's in Bengaluru now, living alone, and I was constantly worried about her diet. But she showed me the app and even the messages she receives from their nutritionist each week. I felt reassured. It's not just meals—they're actually tracking her health and adjusting accordingly.",
      image: customer1,
    },
    {
      name: "Aarav, 30 – Startup Co-Founder",
      role: "Startup Co-Founder",
      location: "Bengaluru",
      testimonial:
        "A team member recommended Zyael Nutri Box during a lunch break. I was skeptical at first, but what sold me was the weekly consultation with their nutrition expert. It's like having a health coach without the hassle. They reviewed my eating habits, suggested changes, and the food follows that plan. It's been surprisingly effective.",
      image: customer2,
    },
    {
      name: "Fatima, 33 – UX Designer",
      role: "UX Designer",
      location: "Bengaluru",
      testimonial:
        "I discovered Zyael Nutri Box through an Insta post shared in a local health group. I signed up and was surprised to get a call from a nutritionist within days. She asked about my goals, energy levels, and food preferences. The meals felt tailored after that. That kind of support really makes you feel cared for.",
      image: customer1,
    },
    {
      name: "Priyansh, 22 – Intern",
      role: "Intern",
      location: "Bengaluru",
      testimonial:
        "My flatmate recommended Zyael Nutri Box when I kept skipping meals. It's been a game-changer. Every week, I get a check-in from their nutrition team asking how I'm doing. They even gave me tips on easy snacks and hydration. It's more than just food—it's actual guidance I never thought I'd need.",
      image: customer2,
    },
    {
      name: "Aanya, 25 – Graphic Designer",
      role: "Graphic Designer",
      location: "Bengaluru",
      testimonial:
        "I have PCOS and finding meals that work for me has been tough. I came across Zyael Nutri Box via Google, and what stood out was the weekly consultations. I talk to a certified nutritionist who helps me track how I'm doing. They adjust my plan based on mood swings and energy dips. That kind of detail makes a huge difference.",
      image: customer1,
    },
    {
      name: "Mr. Dinesh",
      role: "Father",
      location: "Bengaluru",
      testimonial:
        "When my son mentioned Zyael Nutri Box, I thought it was another fancy delivery app. But then he told me they even have a dietitian speak to him weekly to check his health. He showed me messages and how they adjust his plan based on how he's feeling. That kind of human touch is rare. It gave me and his mother a lot of comfort.",
      image: customer2,
    },
  ];

  const nutritionData = [
    { label: "Calories", current: 870, target: 1500, unit: " kcal", color: "hsl(var(--chart-1))" },
    { label: "Protein", current: 45, target: 60, unit: "g", color: "hsl(var(--chart-3))" },
    { label: "Carbs", current: 110, target: 200, unit: "g", color: "hsl(var(--chart-2))" },
    { label: "Fats", current: 25, target: 50, unit: "g", color: "hsl(var(--chart-4))" },
  ];

  const heroSlides = [
    {
      id: 1,
      title: "Personalized Nutrition for Every Goal",
      subtitle: "Every meal is thoughtfully crafted by expert nutritionists, inspired by the warmth of a mother's kitchen",
      ctaText: "Start Today",
      backgroundImage: heroBanner,
    },
    {
      id: 2,
      title: "Track. Eat. Transform. Your Health Journey Starts Here.",
      subtitle: "Join 10,000+ happy customers who achieved their health goals with us",
      ctaText: "Get Started",
      backgroundImage: weightLoss,
    },
    {
      id: 3,
      title: "Expert Nutrition Support - 4 Consults per Month",
      subtitle: "Get personalized guidance from certified nutritionists throughout your journey",
      ctaText: "Book Now",
      backgroundImage: proteinMeal,
    },
  ];

  const newsArticles = [
    {
      title: "How to Identify Your Daily Calorie Needs Based on Your Goals",
      description: "Understanding your daily calorie needs is a key step in achieving your health and fitness goals, whether...",
      image: newsCalorie,
    },
    {
      title: "Top 10 Superfoods to Include in Your Daily Diet",
      description: "Superfoods are nutrient-dense ingredients that offer immense health benefits. Incorporating them into...",
      image: newsSuperfoods,
    },
  ];

  //todo: remove mock functionality - keeping sample data as requested
  // const sampleCartItems = [
  //   {
  //     id: 1,
  //     title: "Weight Loss Plan",
  //     duration: "30 Days Subscription",
  //     image: weightLoss,
  //     originalPrice: 17000,
  //     price: 15000,
  //     quantity: 1,
  //   },
  //   {
  //     id: 2,
  //     title: "Muscle Gain Plan",
  //     duration: "30 Days Subscription",
  //     image: proteinMeal,
  //     originalPrice: 18000,
  //     price: 15000,
  //     quantity: 1,
  //   },
  // ];

  // Removed fallback orderHistory data to show proper empty state

  // Payment handling functions
  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      console.log('Payment successful:', paymentData);
      
      if (!user?.id || cartItems.length === 0) {
        toast({
          title: "Error",
          description: "Unable to process payment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Get the first meal plan from cart (assuming single item purchase for now)
      const cartItem = cartItems[0];
      
      // Create subscription first
      const subRes = await apiRequest("POST", "/api/subscriptions", {
        client_id: user.id,
        meal_plan_id: cartItem.id, // Assuming cart item ID is meal_plan_id
        duration_days: 30, // Default 30 days
        meals_per_day: 3,
        total_amount: getTotalPrice(),
        payment_method: paymentData.method || "card",
      });
      const subscription = await subRes.json();

      // Create payment record
      await apiRequest("POST", "/api/payments", {
        subscription_id: subscription.id,
        amount: getTotalPrice(),
        payment_method: paymentData.method || "card",
        currency: "INR",
      });

      // Clear cart after successful payment
      clearCart();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      
      // Switch to orders tab to show the new subscription
      setActiveTab('orders');
      setIsPaymentOpen(false);
      
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create subscription. Payment was successful but subscription creation failed.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentFailure = (error: string) => {
    console.log('Payment failed:', error);
    // Keep cart items for retry
    setIsPaymentOpen(false);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add a meal plan to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }
    // Navigate to checkout page with the first cart item's meal plan ID
    const firstItem = cartItems[0];
    const planId = firstItem?.id || firstItem?.mealPlanId || firstItem?.meal_plan_id;
    
    if (planId) {
      // Navigate to checkout page with planId in query params
      // Using setLocation with query params - wouter will handle the navigation
      setLocation(`/checkout?planId=${encodeURIComponent(planId)}`);
    } else {
      toast({
        title: "Error",
        description: "Unable to proceed to checkout. The cart item is missing required information.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      {...pageTransitionVariants}
      className="min-h-screen bg-background pb-24 sm:pb-20"
    >
      {/* Location and Search Bar */}
      <LocationSearch
        location="Mumbai, Maharashtra"
        onLocationClick={() => console.log("Location clicked")}
        onSearch={(query) => console.log("Search:", query)}
      />

      {/* Smart Notification */}
      <SmartNotification
        delayMs={120000}
        onChatNow={() => console.log("Chat now clicked")}
        onLater={() => console.log("Later clicked")}
      />

      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div
            key="home"
            {...pageTransitionVariants}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-16 md:space-y-20"
          >
            {/* Hero Slider */}
            <HeroSlider
              slides={heroSlides}
              autoRotateInterval={5000}
              onCtaClick={(id) => console.log("Hero CTA clicked:", id)}
            />

            {/* Health Goals Categories */}
            <HealthGoalsCategory
              onCategorySelect={(categoryId) => console.log("Category selected:", categoryId)}
              onAddToCart={addToCart}
            />

            {/* Nutritionist Consultation Slider — always render; fallback list when API is empty or errors */}
            <EnhancedNutritionistSection
              nutritionists={displayNutritionists}
              onConsult={(id) => {
                const nutritionist = displayNutritionists.find(n => n.id === id);
                if (nutritionist) {
                  setSelectedNutritionistForBooking({ id: nutritionist.id, name: nutritionist.name });
                  setShowBookingModal(true);
                }
              }}
            />
            {Boolean(nutritionistsError) ? (
              <p className="text-center text-xs text-muted-foreground -mt-4 mb-4">
                Showing sample nutritionists. Live list could not be loaded.
              </p>
            ) : null}

          {/* Product Slider - Enhanced Design */}
          {featuredProductsData && featuredProductsData.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewportConfig}
              transition={{ duration: 0.6 }}
              className="relative py-8 md:py-12"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-3xl -z-10"></div>
              <ProductSlider
                products={(Array.isArray(featuredProductsData) ? featuredProductsData : []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  shortBenefit: p.shortBenefit || p.short_benefit,
                  price: p.price,
                  imageUrl: p.imageUrl || p.image_url,
                  rating: p.rating,
                  reviewCount: p.reviewCount || p.review_count,
                  tags: p.tags,
                }))}
                onProductClick={(productId) => {
                  setActiveTab("nutrimarket");
                  // Could also open product detail here
                }}
                onViewAll={() => setActiveTab("nutrimarket")}
              />
            </motion.div>
          )}

          {/* Promotional Banner */}
          <PromotionalBanner autoRotateInterval={4000} />

          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportConfig}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 border border-primary/10 shadow-lg"
          >
            <div className="text-center mb-6 md:mb-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                className="text-3xl md:text-5xl font-bold text-foreground mb-4 md:mb-6"
              >
                The Zyael Nutri Box Story
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: 0.1 }}
                className="text-base md:text-lg text-muted-foreground max-w-4xl mx-auto space-y-3 md:space-y-4 text-left"
              >
                <p>There was a time when every morning began with a familiar voice— "Beta, did you eat your breakfast?" Every afternoon, another call— "Lunch box khatam kiya? Kuch aur chahiye kya?"</p>
                
                <p>And before bedtime— "Dinner toh le liya na?"</p>
                
                <p>That voice was our first nutritionist—our mothers. Their love didn't just fill our stomachs; it nourished our hearts. But as we moved to new cities, chased our careers in Bangalore, Mumbai, or beyond, the calls became fewer, and the meals more rushed, random, or skipped.</p>
                
                <p className="font-semibold text-foreground">We missed those meals. But more than that, we missed the love that came with them.</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: 0.2 }}
                className="mt-6 md:mt-8"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-2"
                  data-testid="button-our-story"
                >
                  Our Story
                </Button>
              </motion.div>
            </div>
          </motion.section>


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
                Here's What Our Customers Say About ZyaelNutribox
              </motion.h2>
            </div>
            
            {/* Two-row slider testimonials */}
            <div className="relative overflow-hidden px-4 md:px-0">
              {/* First row */}
              <div className="flex animate-scroll-left space-x-3 md:space-x-6 mb-3 md:mb-6">
                {testimonials.slice(0, 5).map((testimonial) => (
                  <div key={`row1-${testimonial.name}`} className="flex-shrink-0 w-72 sm:w-80 md:w-96">
                    <TestimonialCard {...testimonial} />
                  </div>
                ))}
                {/* Duplicate for seamless loop */}
                {testimonials.slice(0, 5).map((testimonial) => (
                  <div key={`row1-dup-${testimonial.name}`} className="flex-shrink-0 w-72 sm:w-80 md:w-96">
                    <TestimonialCard {...testimonial} />
                  </div>
                ))}
              </div>
              
              {/* Second row */}
              <div className="flex animate-scroll-right space-x-3 md:space-x-6">
                {testimonials.slice(5).map((testimonial) => (
                  <div key={`row2-${testimonial.name}`} className="flex-shrink-0 w-72 sm:w-80 md:w-96">
                    <TestimonialCard {...testimonial} />
                  </div>
                ))}
                {/* Duplicate for seamless loop */}
                {testimonials.slice(5).map((testimonial) => (
                  <div key={`row2-dup-${testimonial.name}`} className="flex-shrink-0 w-72 sm:w-80 md:w-96">
                    <TestimonialCard {...testimonial} />
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportConfig}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl md:rounded-3xl p-8 md:p-16 text-center border border-primary/10 shadow-xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50"></div>
            <div className="relative z-10">
              <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportConfig}
                className="text-2xl md:text-5xl font-bold text-foreground mb-4 md:mb-6"
              >
                Home-Cooked Goodness, Inspired by Mom & Perfected by Nutritionists
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: 0.1 }}
                className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto"
              >
                Every meal is thoughtfully crafted by expert nutritionists, inspired by the warmth of a mother's kitchen. Packed with essential nutrients and made with authentic, home-style recipes — it's not just food, it's comfort with a promise of health.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                transition={{ delay: 0.2 }}
              >
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
                  data-testid="button-subscribe-cta"
                >
                  Subscribe Now
                </Button>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportConfig}
            transition={{ duration: 0.6 }}
            className="relative px-0 md:px-12"
          >
            <div className="text-center mb-8 md:mb-12 px-4">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportConfig}
                className="text-3xl md:text-5xl font-bold text-foreground mb-3 md:mb-4"
              >
                News About Nutrition
              </motion.h2>
            </div>
            <Carousel 
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full px-4 md:px-0"
            >
              <CarouselContent>
                {newsArticles.map((article, index) => (
                  <CarouselItem key={index} className="md:basis-1/2">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={viewportConfig}
                      className="bg-card rounded-2xl overflow-hidden hover-elevate h-full"
                    >
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={article.image} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 md:p-6">
                        <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
                          {article.title}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                          {article.description}
                        </p>
                        <Button 
                          variant="outline" 
                          className="rounded-full" 
                          data-testid={`button-read-more-${index + 1}`}
                        >
                          Read More
                        </Button>
                      </div>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious 
                className="rounded-full -left-4 md:-left-6 shadow-lg !hidden md:!inline-flex" 
                data-testid="button-news-prev"
              />
              <CarouselNext 
                className="rounded-full -right-4 md:-right-6 shadow-lg !hidden md:!inline-flex" 
                data-testid="button-news-next"
              />
            </Carousel>
          </motion.section>

          {/* Footer */}
          <ClientFooter />
        </motion.div>
        )}

        {activeTab === "cart" && (
          <motion.div
            key="cart"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              Your Cart
            </motion.h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-3 md:space-y-4">
                {/* Cart Items */}
                {cartItems.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-md p-8 text-center"
                  >
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">Your cart is empty</h3>
                      <p className="text-muted-foreground mb-6">
                        Discover our delicious meal plans and add them to your cart to get started on your health journey.
                      </p>
                      <Button 
                        onClick={() => setActiveTab("home")}
                        className="bg-primary text-primary-foreground rounded-full hover-elevate"
                        size="lg"
                      >
                        Browse Meal Plans
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  cartItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-md p-3 md:p-6 hover-elevate"
                  >
                    <div className="flex gap-3 md:gap-4">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 md:w-24 md:h-24 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="text-sm md:text-lg font-semibold text-foreground truncate">{item.title}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{item.duration}</p>
                          </div>
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-1"
                            data-testid={`button-remove-${item.id}`}
                            onClick={() => removeFromCart(item.id)}
                          >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2 md:mt-4">
                          <div className="flex items-center gap-2 md:gap-3 border rounded-lg p-1">
                            <button 
                              className="px-2 md:px-3 py-1 hover:bg-muted rounded text-sm md:text-base" 
                              data-testid={`button-decrease-${item.id}`}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >−</button>
                            <span className="px-2 md:px-3 font-semibold text-sm md:text-base" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                            <button 
                              className="px-2 md:px-3 py-1 hover:bg-muted rounded text-sm md:text-base" 
                              data-testid={`button-increase-${item.id}`}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >+</button>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground line-through">₹{item.originalPrice.toLocaleString()}</p>
                            <p className="text-base md:text-xl font-bold text-primary">₹{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  ))
                )}
              </div>

              {/* Price Summary - Only show when cart has items */}
              {cartItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-1"
                >
                  <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 sticky top-4">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Price Summary</h3>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">₹{getTotalPrice().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Charges</span>
                        <span className="font-semibold text-success">FREE</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-semibold text-success">−₹{cartItems.reduce((sum, item) => sum + ((item.originalPrice - item.price) * item.quantity), 0).toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-primary">₹{getTotalPrice().toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleCheckout}
                      className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
                      size="lg"
                      data-testid="button-checkout"
                    >
                      Proceed to Checkout
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      100% Secure Payment
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "orders" && (
          <motion.div
            key="orders"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              My Orders
            </motion.h1>

            <div className="space-y-4">
              {ordersError ? (
                <div className="text-center py-8">
                  <div className="text-destructive mb-4">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <h3 className="text-lg font-semibold mb-2">Failed to Load Orders</h3>
                    <p className="text-muted-foreground mb-4">
                      {ordersError instanceof Error ? ordersError.message : 'Unable to load order data'}
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                      className="rounded-full"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                (Array.isArray(ordersData) ? ordersData : []).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-md p-8 text-center"
                  >
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">No orders yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Start your health journey by purchasing a meal plan. Your orders will appear here once you make a purchase.
                      </p>
                      <Button 
                        onClick={() => setActiveTab("home")}
                        className="bg-primary text-primary-foreground rounded-full hover-elevate"
                        size="lg"
                      >
                        Buy Meal Plan
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  (Array.isArray(ordersData) ? ordersData : []).map((order: any, index: number) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-md p-3 md:p-6 hover-elevate"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 md:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-lg font-semibold text-foreground">Order #{order.id}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'No date')}</p>
                    </div>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                      order.status === 'delivered' ? 'bg-success/10 text-success' :
                      order.status === 'in-transit' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`} data-testid={`badge-status-${order.id}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className="border-t pt-3 md:pt-4">
                    <div className="flex items-center gap-3 md:gap-4 mb-3">
                      <img src={order.image || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=300&h=200&fit=crop"} alt={order.dietPlan || order.plan} className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm md:text-base truncate">{order.dietPlan || order.plan}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{order.mealType || order.duration}</p>
                      </div>
                      <p className="text-base md:text-xl font-bold text-primary flex-shrink-0">₹{(order.price || order.amount || order.total_amount || 0).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-3 md:mt-4">
                      <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" data-testid={`button-track-${order.id}`}>
                        Track Order
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" data-testid={`button-details-${order.id}`}>
                        View Details
                      </Button>
                      {order.status === 'delivered' && (
                        <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" data-testid={`button-reorder-${order.id}`}>
                          Reorder
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
                ))
                )
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "profile" && (
          <motion.div
            key="profile"
            {...pageTransitionVariants}
            className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              My Profile
            </motion.h1>

            <div className="space-y-4 md:space-y-6">
              {/* Profile Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 md:mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl md:text-3xl font-bold text-primary">
                      {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-semibold text-foreground truncate">{user?.name || 'User'}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user?.email || 'No email'}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full self-start sm:self-auto" data-testid="button-edit-profile">
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium text-sm md:text-base">{user?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <p className="font-medium text-sm md:text-base">Mumbai, Maharashtra</p>
                  </div>
                </div>
              </motion.div>

              {/* Dietary Preferences */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
              >
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {['Vegetarian', 'Gluten-free', 'Low Carb', 'High Protein'].map((pref) => (
                    <span key={pref} className="px-3 py-2 md:px-4 md:py-2 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-medium" data-testid={`badge-preference-${pref.toLowerCase().replace(' ', '-')}`}>
                      {pref}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Subscription Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 md:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-foreground">Active Subscription</h3>
                    <p className="text-sm text-muted-foreground mt-1">Weight Loss Plan - Monthly</p>
                  </div>
                  <span className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium self-start sm:self-auto">Active</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-3 md:pt-4 border-t">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Next Renewal</p>
                    <p className="font-semibold text-sm md:text-base">December 15, 2025</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full self-start sm:self-auto" data-testid="button-manage-subscription">
                    Manage Plan
                  </Button>
                </div>
              </motion.div>

              {/* Settings Options */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
              >
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">Settings</h3>
                <div className="space-y-2 md:space-y-3">
                  <button className="w-full flex items-center justify-between p-3 md:p-3 hover:bg-muted rounded-lg transition-colors min-h-[48px]" data-testid="button-payment-methods">
                    <span className="font-medium text-sm md:text-base">Payment Methods</span>
                    <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button 
                    className="w-full flex items-center justify-between p-3 md:p-3 hover:bg-muted rounded-lg transition-colors min-h-[48px]" 
                    data-testid="button-delivery-address"
                    onClick={() => setActiveTab("addresses")}
                  >
                    <span className="font-medium text-sm md:text-base">Delivery Address</span>
                    <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button 
                    className="w-full flex items-center justify-between p-3 md:p-3 hover:bg-muted rounded-lg transition-colors min-h-[48px]" 
                    data-testid="button-notifications"
                    onClick={() => setActiveTab("notifications")}
                  >
                    <span className="font-medium text-sm md:text-base">Notifications</span>
                    <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button 
                    className="w-full flex items-center justify-between p-3 md:p-3 hover:bg-muted rounded-lg transition-colors text-destructive min-h-[48px]" 
                    data-testid="button-logout"
                    onClick={logout}
                  >
                    <span className="font-medium text-sm md:text-base">Logout</span>
                    <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === "nutrimarket" && (
          <NutriMarket onNavigateToCart={() => setActiveTab("cart")} />
        )}

        {activeTab === "track" && (
          <motion.div
            key="track"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <EnhancedTracking
              nutritionData={nutritionData}
              onDownloadReport={() => console.log("Download report")}
              onAddWeight={(weight) => console.log("Add weight:", weight)}
            />
          </motion.div>
        )}

        {activeTab === "my-plan" && (
          <motion.div
            key="my-plan"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              My Meal Plan
            </motion.h1>
            
            {/* Completion Status Card */}
            {Array.isArray(subscriptionsData) && subscriptionsData.length > 0 && (
              <SubscriptionCompletionStatus 
                subscription={subscriptionsData[0]}
                onCompleteDetails={() => {
                  // This will be handled by the component
                }}
              />
            )}
            
            <SubscriptionCalendar
              subscription={Array.isArray(subscriptionsData) ? subscriptionsData[0] : null}
              mealSchedules={mealSchedulesData?.schedules || []}
              onMealClick={(meal) => console.log("Meal clicked:", meal)}
            />
          </motion.div>
        )}

        {activeTab === "todays-meals" && (
          <motion.div
            key="todays-meals"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              Today's Meals
            </motion.h1>
            <TodaysMeals
              meals={Array.isArray(todaysMealsData) ? todaysMealsData : []}
              onMealConsume={async (mealId, rating, feedback) => {
                try {
                  // Find the meal schedule ID from todaysMealsData
                  const meal = Array.isArray(todaysMealsData) 
                    ? todaysMealsData.find((m: any) => m.id === mealId || m.schedule_id === mealId)
                    : null;
                  
                  if (meal?.schedule_id) {
                    await apiRequest("POST", `/api/daily-meals/${meal.schedule_id}/log-consumption`, {
                      meal_type: meal.meal_type || "breakfast",
                      status: "consumed",
                      rating: rating,
                      feedback: feedback,
                    });
                    toast({ title: "Meal Logged", description: "Your meal consumption has been recorded" });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to log meal consumption",
                    variant: "destructive",
                  });
                }
              }}
              onMealSkip={async (mealId, reason) => {
                try {
                  const meal = Array.isArray(todaysMealsData) 
                    ? todaysMealsData.find((m: any) => m.id === mealId || m.schedule_id === mealId)
                    : null;
                  
                  if (meal?.schedule_id) {
                    await apiRequest("POST", `/api/daily-meals/${meal.schedule_id}/log-consumption`, {
                      meal_type: meal.meal_type || "breakfast",
                      status: "skipped",
                      reason: reason,
                    });
                    toast({ title: "Meal Skipped", description: "Your meal skip has been recorded" });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to log meal skip",
                    variant: "destructive",
                  });
                }
              }}
            />
          </motion.div>
        )}

        {activeTab === "delivery-tracking" && (
          <motion.div
            key="delivery-tracking"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              Live Delivery Tracking
            </motion.h1>
            <LiveDeliveryTracker
              deliveries={Array.isArray(deliveryTrackingData) ? deliveryTrackingData : []}
              onRefresh={async () => {
                await queryClient.invalidateQueries({ queryKey: [`/api/delivery-tracking/client/${user?.id}`] });
                toast({ title: "Refreshed", description: "Delivery tracking data updated" });
              }}
            />
          </motion.div>
        )}

        {activeTab === "meal-logging" && (
          <motion.div
            key="meal-logging"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              Meal Consumption Logger
            </motion.h1>
            <TodaysMeals
              meals={Array.isArray(todaysMealsData) ? todaysMealsData : []}
              onMealConsume={async (mealId, rating, feedback) => {
                try {
                  const meal = Array.isArray(todaysMealsData) 
                    ? todaysMealsData.find((m: any) => m.id === mealId || m.schedule_id === mealId)
                    : null;
                  
                  if (meal?.schedule_id) {
                    await apiRequest("POST", `/api/daily-meals/${meal.schedule_id}/log-consumption`, {
                      meal_type: meal.meal_type || "breakfast",
                      status: "consumed",
                      rating: rating,
                      feedback: feedback,
                    });
                    queryClient.invalidateQueries({ queryKey: [`/api/daily-meals/client/${user?.id}/today`] });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to log meal consumption",
                    variant: "destructive",
                  });
                }
              }}
              onMealSkip={async (mealId, reason) => {
                try {
                  const meal = Array.isArray(todaysMealsData) 
                    ? todaysMealsData.find((m: any) => m.id === mealId || m.schedule_id === mealId)
                    : null;
                  
                  if (meal?.schedule_id) {
                    await apiRequest(`/api/daily-meals/${meal.schedule_id}/log-consumption`, {
                      method: "POST",
                      body: JSON.stringify({
                        meal_type: meal.meal_type || "breakfast",
                        status: "skipped",
                        reason: reason,
                      }),
                    });
                    queryClient.invalidateQueries({ queryKey: [`/api/daily-meals/client/${user?.id}/today`] });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to log meal skip",
                    variant: "destructive",
                  });
                }
              }}
            />
          </motion.div>
        )}

        {activeTab === "progress-report" && (
          <motion.div
            key="progress-report"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              Weekly Progress Report
            </motion.h1>
            {user?.id && (
              <WeeklyProgressReport
                clientId={user.id}
                weekNumber={Math.floor((Date.now() - new Date(Array.isArray(subscriptionsData) && subscriptionsData[0]?.startDate ? subscriptionsData[0].startDate : Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1}
                onReportGenerated={(report) => {
                  queryClient.invalidateQueries({ queryKey: [`/api/reports/weekly/client/${user.id}`] });
                }}
              />
            )}
          </motion.div>
        )}

        {activeTab === "notifications" && (
          <motion.div
            key="notifications"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <Notifications userId={user?.id} />
          </motion.div>
        )}

        {activeTab === "addresses" && (
          <motion.div
            key="addresses"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8"
            >
              Manage Addresses
            </motion.h1>
            <AddressManagement />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        cartItemCount={getTotalItems()}
      />

      {/* Mock Payment Gateway */}
      <MockPaymentGateway
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={getTotalPrice()}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
      />

      {/* Booking Calendar Modal */}
      {selectedNutritionistForBooking && (
        <BookingCalendar
          nutritionistId={selectedNutritionistForBooking.id}
          nutritionistName={selectedNutritionistForBooking.name}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedNutritionistForBooking(null);
          }}
          onBookingSuccess={(booking) => {
            toast({
              title: "Booking Confirmed!",
              description: `Your consultation with ${selectedNutritionistForBooking.name} has been scheduled.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
            setShowBookingModal(false);
            setSelectedNutritionistForBooking(null);
          }}
        />
      )}
    </motion.div>
  );
}
