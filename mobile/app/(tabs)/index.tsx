import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import HeroSlider from '../../src/components/HeroSlider';
import HealthGoalsCategory from '../../src/components/HealthGoalsCategory';
import NutritionistSlider from '../../src/components/NutritionistSlider';
import TestimonialCard from '../../src/components/TestimonialCard';
import NutritionProgress from '../../src/components/NutritionProgress';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import apiClient from '../../src/lib/apiClient';
import { log } from '../../src/lib/logger';
import { mapMealPlan, mapNutritionist } from '../../src/lib/apiMappers';

// Categories for health goals (can be static or from API)
const categories = [
  { id: 1, name: 'Weight Loss', icon: '🥗', color: '#4CAF50', description: 'Lose weight safely' },
  { id: 2, name: 'Muscle Gain', icon: '💪', color: '#FF9800', description: 'Build muscle mass' },
  { id: 3, name: 'Balanced', icon: '❤️', color: '#E91E63', description: 'Maintain health' },
  { id: 4, name: 'Diabetic', icon: '🍛', color: '#9C27B0', description: 'Manage diabetes' },
];

const heroSlides = [
  {
    id: 1,
    title: 'Healthy Meals Delivered',
    subtitle: 'Fresh, nutritious meals made just for you',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
    ctaText: 'Order Now',
    onPress: () => log.debug('Order Now clicked'),
  },
  {
    id: 2,
    title: 'Expert Nutritionists',
    subtitle: 'Get personalized advice from certified experts',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
    ctaText: 'Consult Now',
    onPress: () => log.debug('Consult Now clicked'),
  },
];

const testimonials = [
  {
    name: 'Meera, 28',
    role: 'Content Writer',
    location: 'Bengaluru',
    testimonial: 'I signed up after seeing their Instagram ad. True to that, I got a call from their nutritionist. She spoke with me about my stress, eating gaps, and even sleep. It felt like therapy through food.',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
    rating: 5,
  },
  {
    name: 'Rajesh, 35',
    role: 'Software Engineer',
    location: 'Mumbai',
    testimonial: 'The meal plans are perfectly balanced and the delivery is always on time. My energy levels have improved significantly since I started.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    rating: 5,
  },
];

export default function HomeScreen() {
  const [selectedCategory] = useState(1);

  // Fetch meal plans from API
  const { 
    data: mealPlans = [], 
    isLoading: mealPlansLoading,
    isError: _mealPlansError,
    error: _mealPlansErrorObj,
    refetch: _refetchMealPlans,
  } = useQuery({
    queryKey: ['meal-plans'],
    queryFn: async () => {
      const response = await apiClient.get('/api/meal-plans');
      return (response.data || []).map((plan: any) => mapMealPlan(plan));
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch nutritionists from API
  const { 
    data: nutritionists = [], 
    isLoading: nutritionistsLoading,
    isError: _nutritionistsError,
    error: _nutritionistsErrorObj,
    refetch: _refetchNutritionists,
  } = useQuery({
    queryKey: ['nutritionists'],
    queryFn: async () => {
      const response = await apiClient.get('/api/nutritionists');
      return (response.data || []).map((nutri: any) => mapNutritionist(nutri));
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  const handleGoalSelect = (goal: any) => {
    log.debug('Selected goal', { goal });
  };

  const handleNutritionistSelect = (nutritionist: any) => {
    log.debug('Selected nutritionist', { nutritionist });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Hero Slider */}
      <HeroSlider slides={heroSlides} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning!</Text>
        <Text style={styles.subtitle}>What would you like to eat today?</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchPlaceholder}>🔍 Search meals, plans, or experts...</Text>
      </View>

      {/* Health Goals */}
      <HealthGoalsCategory
        goals={categories}
        selectedGoal={selectedCategory}
        onGoalSelect={handleGoalSelect}
      />

      {/* Featured Plans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Meal Plans</Text>
        {mealPlansLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2d5016" />
            <Text style={styles.loadingText}>Loading meal plans...</Text>
          </View>
        ) : mealPlans.length > 0 ? (
          <FlatList
            data={mealPlans}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Card style={styles.planCard} delay={index * 100}>
                <Text style={styles.planIcon}>{item.image}</Text>
                <Text style={styles.planName}>{item.name}</Text>
                <Text style={styles.planDescription}>{item.description}</Text>
                <Text style={styles.planPrice}>{item.price}</Text>
                <Button
                  title="View Plan"
                  onPress={() => log.debug('View Plan', { item })}
                  size="small"
                />
              </Card>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        ) : (
          <Text style={styles.emptyText}>No meal plans available</Text>
        )}
      </View>

      {/* Nutrition Progress */}
      <View style={styles.section}>
        <NutritionProgress
          calories={1200}
          protein={80}
          carbs={150}
          fat={45}
          targetCalories={1500}
          targetProtein={100}
          targetCarbs={200}
          targetFat={60}
        />
      </View>

      {/* Nutritionists */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expert Nutritionists</Text>
        {nutritionistsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2d5016" />
            <Text style={styles.loadingText}>Loading nutritionists...</Text>
          </View>
        ) : nutritionists.length > 0 ? (
          <NutritionistSlider
            nutritionists={nutritionists}
            onNutritionistSelect={handleNutritionistSelect}
          />
        ) : (
          <Text style={styles.emptyText}>No nutritionists available</Text>
        )}
      </View>

      {/* Testimonials */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What Our Customers Say</Text>
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} {...testimonial} />
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <Card style={styles.actionCard} delay={0}>
                    <Text style={styles.actionIcon}>📞</Text>
                    <Text style={styles.actionText}>Talk to Nutritionist</Text>
                    <Button
                      title="Book Now"
                      onPress={() => log.debug('Book nutritionist clicked')}
                      size="small"
                      variant="outline"
                    />
                  </Card>
                  <Card style={styles.actionCard} delay={100}>
                    <Text style={styles.actionIcon}>📊</Text>
                    <Text style={styles.actionText}>Track Progress</Text>
                    <Button
                      title="View Stats"
                      onPress={() => log.debug('View progress clicked')}
                      size="small"
                      variant="outline"
                    />
                  </Card>
                </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
    marginLeft: 20,
  },
  categoryCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginLeft: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  planCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginLeft: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 12,
  },
  planButton: {
    backgroundColor: '#2d5016',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d5016',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
