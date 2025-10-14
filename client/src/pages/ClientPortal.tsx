import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { pageTransitionVariants, viewportConfig } from "@/lib/animations";
import HeroBanner from "@/components/HeroBanner";
import DietPlanCard from "@/components/DietPlanCard";
import NutritionistCard from "@/components/NutritionistCard";
import TestimonialCard from "@/components/TestimonialCard";
import MealStatusCard from "@/components/MealStatusCard";
import NutritionProgress from "@/components/NutritionProgress";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import heroBanner from "@assets/generated_images/Home-cooked_comfort_food_banner_9590a8d1.png";
import weightLoss from "@assets/generated_images/Healthy_balanced_meal_food_36201b9b.png";
import veganMeal from "@assets/generated_images/Vegan_plant-based_salad_bowl_552c75a9.png";
import proteinMeal from "@assets/generated_images/Protein-rich_fitness_meal_28329687.png";
import pcosMeal from "@assets/generated_images/PCOS-friendly_healthy_meal_1a327607.png";
import nutritionist1 from "@assets/generated_images/Female_nutritionist_professional_portrait_a8930d89.png";
import nutritionist2 from "@assets/generated_images/Male_nutritionist_professional_portrait_5241518d.png";
import customer1 from "@assets/generated_images/Happy_customer_testimonial_photo_4e688e5c.png";
import customer2 from "@assets/generated_images/Business_professional_customer_testimonial_18fae654.png";
import newsCalorie from "@assets/stock_images/healthy_nutrition_me_799f8107.jpg";
import newsSuperfoods from "@assets/stock_images/superfoods_healthy_i_2052ee3c.jpg";

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState("home");

  // Fetch meal plans from API
  const { data: mealPlansData, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["/api/meal-plans"],
  });

  // Fetch nutritionists from API
  const { data: nutritionistsData, isLoading: nutritionistsLoading } = useQuery({
    queryKey: ["/api/nutritionists"],
  });

  // Map plan images (use existing images as placeholders)
  const planImageMap: { [key: string]: string } = {
    "Weight Loss": weightLoss,
    "Muscle Gain": proteinMeal,
    "PCOS Friendly": pcosMeal,
    "Vegan / Vegetarian": veganMeal,
    "Postpartum Moms": weightLoss,
    "Senior Citizens": proteinMeal,
    "Diabetic Friendly Meals": pcosMeal,
    "Kids Nutrition": veganMeal,
    "Recovery Meals": weightLoss,
  };

  // Map nutritionist images (use existing images as placeholders)
  const nutritionistImageMap: { [key: string]: string } = {
    "Dr. Priya Sharma": nutritionist1,
    "Rahul Menon": nutritionist2,
    "Ananya Patel": nutritionist1,
    "Vikram Singh": nutritionist2,
  };

  // Prepare diet plans with images
  const dietPlans = (Array.isArray(mealPlansData) ? mealPlansData : []).map((plan: any) => ({
    ...plan,
    image: planImageMap[plan.title] || weightLoss,
  }));

  // Prepare nutritionists with images and experience format
  const nutritionists = (Array.isArray(nutritionistsData) ? nutritionistsData : []).map((nutritionist: any) => ({
    ...nutritionist,
    image: nutritionistImageMap[nutritionist.name] || nutritionist1,
    experience: `${nutritionist.experienceYears} years experience`,
  }));

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
  ];

  const nutritionData = [
    { label: "Calories", current: 870, target: 1500, unit: " kcal", color: "hsl(var(--chart-1))" },
    { label: "Protein", current: 45, target: 60, unit: "g", color: "hsl(var(--chart-3))" },
    { label: "Carbs", current: 110, target: 200, unit: "g", color: "hsl(var(--chart-2))" },
    { label: "Fats", current: 25, target: 50, unit: "g", color: "hsl(var(--chart-4))" },
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

  //todo: remove mock functionality
  const cartItems = [
    {
      id: 1,
      title: "Weight Loss Plan",
      duration: "30 Days Subscription",
      image: weightLoss,
      originalPrice: 17000,
      price: 15000,
      quantity: 1,
    },
    {
      id: 2,
      title: "Muscle Gain Plan",
      duration: "30 Days Subscription",
      image: proteinMeal,
      originalPrice: 18000,
      price: 15000,
      quantity: 1,
    },
  ];

  //todo: remove mock functionality
  const orderHistory = [
    {
      id: "ORD1234",
      date: "November 28, 2025",
      plan: "Weight Loss Plan",
      duration: "30 Days",
      status: "delivered",
      amount: 15000,
      image: weightLoss,
    },
    {
      id: "ORD1233",
      date: "October 30, 2025",
      plan: "PCOS Friendly Plan",
      duration: "30 Days",
      status: "delivered",
      amount: 15000,
      image: pcosMeal,
    },
    {
      id: "ORD1232",
      date: "September 28, 2025",
      plan: "Vegan / Vegetarian Plan",
      duration: "30 Days",
      status: "delivered",
      amount: 15000,
      image: veganMeal,
    },
  ];

  return (
    <motion.div
      {...pageTransitionVariants}
      className="min-h-screen bg-background pb-20"
    >
      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div
            key="home"
            {...pageTransitionVariants}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16"
          >
            <HeroBanner
            title="Home-Cooked Goodness, Inspired by Mom"
            subtitle="Every meal is thoughtfully crafted by expert nutritionists, inspired by the warmth of a mother's kitchen"
            ctaText="Start Today →"
            backgroundImage={heroBanner}
            onCtaClick={() => console.log("Start today clicked")}
          />

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
            {mealPlansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                    <div className="aspect-video bg-muted rounded-xl mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {dietPlans.map((plan: any) => (
                  <DietPlanCard
                    key={plan.id}
                    {...plan}
                    onSubscribe={() => console.log(`Subscribe to ${plan.title}`)}
                  />
                ))}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportConfig}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-br from-primary/5 to-transparent rounded-2xl md:rounded-3xl p-6 md:p-12"
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
                Meet Our Team of Nutritionist in ZyaelNutriBox
              </motion.h2>
            </div>
            {nutritionistsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
                    <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2 w-3/4 mx-auto"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {nutritionists.map((nutritionist: any) => (
                  <NutritionistCard
                    key={nutritionist.id}
                    {...nutritionist}
                    onConsult={() => console.log(`Consult ${nutritionist.name}`)}
                  />
                ))}
              </div>
            )}
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
                Here What Our Customers Say About ZyaelNutribox
              </motion.h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.name} {...testimonial} />
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportConfig}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl md:rounded-3xl p-6 md:p-16 text-center border border-primary/10"
          >
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
                Subcribe Now
              </Button>
            </motion.div>
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
        </motion.div>
        )}

        {activeTab === "cart" && (
          <motion.div
            key="cart"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8"
            >
              Your Cart
            </motion.h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {/* Cart Items */}
                {cartItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-md p-4 md:p-6 hover-elevate"
                  >
                    <div className="flex gap-3 md:gap-4">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{item.title}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">{item.duration}</p>
                          </div>
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            data-testid={`button-remove-${item.id}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-center mt-3 md:mt-4 gap-2">
                          <div className="flex items-center gap-2 md:gap-3 border rounded-lg p-1">
                            <button className="px-2 md:px-3 py-1 hover:bg-muted rounded" data-testid={`button-decrease-${item.id}`}>−</button>
                            <span className="px-2 md:px-3 font-semibold text-sm md:text-base" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                            <button className="px-2 md:px-3 py-1 hover:bg-muted rounded" data-testid={`button-increase-${item.id}`}>+</button>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground line-through">₹{item.originalPrice.toLocaleString()}</p>
                            <p className="text-lg md:text-xl font-bold text-primary">₹{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Price Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-1"
              >
                <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Price Summary</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">₹{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Charges</span>
                      <span className="font-semibold text-success">FREE</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-semibold text-success">−₹{cartItems.reduce((sum, item) => sum + ((item.originalPrice - item.price) * item.quantity), 0)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">₹{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                    </div>
                  </div>
                  <Button
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
            </div>
          </motion.div>
        )}

        {activeTab === "orders" && (
          <motion.div
            key="orders"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8"
            >
              My Orders
            </motion.h1>

            <div className="space-y-4">
              {orderHistory.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-md p-4 md:p-6 hover-elevate"
                >
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-foreground">Order #{order.id}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{order.date}</p>
                    </div>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'delivered' ? 'bg-success/10 text-success' :
                      order.status === 'in-transit' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`} data-testid={`badge-status-${order.id}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                  
                  <div className="border-t pt-3 md:pt-4">
                    <div className="flex items-center gap-3 md:gap-4 mb-3">
                      <img src={order.image} alt={order.plan} className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm md:text-base truncate">{order.plan}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{order.duration}</p>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-primary flex-shrink-0">₹{order.amount.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4">
                      <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" data-testid={`button-track-${order.id}`}>
                        Track Order
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none" data-testid={`button-details-${order.id}`}>
                        View Details
                      </Button>
                      {order.status === 'delivered' && (
                        <Button variant="outline" size="sm" className="rounded-full flex-1 sm:flex-none sm:ml-auto" data-testid={`button-reorder-${order.id}`}>
                          Reorder
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "profile" && (
          <motion.div
            key="profile"
            {...pageTransitionVariants}
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8"
            >
              My Profile
            </motion.h1>

            <div className="space-y-6">
              {/* Profile Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-md p-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">JD</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">John Doe</h3>
                    <p className="text-sm text-muted-foreground">john.doe@example.com</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full" data-testid="button-edit-profile">
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">+91 98765 43210</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <p className="font-medium">Mumbai, Maharashtra</p>
                  </div>
                </div>
              </motion.div>

              {/* Dietary Preferences */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-md p-6"
              >
                <h3 className="text-lg font-semibold text-foreground mb-4">Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {['Vegetarian', 'Gluten-free', 'Low Carb', 'High Protein'].map((pref) => (
                    <span key={pref} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium" data-testid={`badge-preference-${pref.toLowerCase().replace(' ', '-')}`}>
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
                className="bg-white rounded-xl shadow-md p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Active Subscription</h3>
                    <p className="text-sm text-muted-foreground mt-1">Weight Loss Plan - Monthly</p>
                  </div>
                  <span className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium">Active</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Next Renewal</p>
                    <p className="font-semibold">December 15, 2025</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full" data-testid="button-manage-subscription">
                    Manage Plan
                  </Button>
                </div>
              </motion.div>

              {/* Settings Options */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl shadow-md p-6"
              >
                <h3 className="text-lg font-semibold text-foreground mb-4">Settings</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors" data-testid="button-payment-methods">
                    <span className="font-medium">Payment Methods</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors" data-testid="button-delivery-address">
                    <span className="font-medium">Delivery Address</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors" data-testid="button-notifications">
                    <span className="font-medium">Notifications</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors text-destructive" data-testid="button-logout">
                    <span className="font-medium">Logout</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === "track" && (
          <motion.div
            key="track"
            {...pageTransitionVariants}
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <div className="mb-6 md:mb-8">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-5xl font-bold text-foreground mb-2 md:mb-3"
              >
                Today's Food Journey
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base md:text-lg text-muted-foreground"
              >
                Track your daily meals and nutrition progress
              </motion.p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Today's Meals</h2>
                  <div className="space-y-3">
                    <MealStatusCard
                      mealType="Breakfast"
                      status="delivered"
                      time="8:00 AM"
                      onViewDetails={() => console.log("View breakfast details")}
                    />
                    <MealStatusCard
                      mealType="Lunch"
                      status="delivered"
                      time="1:00 PM"
                      onViewDetails={() => console.log("View lunch details")}
                    />
                    <MealStatusCard
                      mealType="Dinner"
                      status="in-transit"
                      time="Expected 7:00 PM"
                      onViewDetails={() => console.log("View dinner details")}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-br from-success/10 to-transparent rounded-xl p-6 border border-success/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Great Progress!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        You're making excellent progress! Keep up the consistent meal completion to reach your goals faster. You've consumed 67% of your daily nutrition target.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-1"
              >
                <div className="sticky top-4 space-y-4">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Daily Nutrition</h2>
                    <NutritionProgress items={nutritionData} />
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Weekly Streak</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-4xl font-bold text-primary">7</span>
                      <span className="text-sm text-muted-foreground">days<br/>in a row!</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <div key={day} className="flex-1 h-2 bg-primary rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </motion.div>
  );
}
