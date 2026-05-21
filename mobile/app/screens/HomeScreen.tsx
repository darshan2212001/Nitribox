import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useClientRealtime } from '../../src/hooks/useRealtime';
import { log } from '../../src/lib/logger';

// Import components
import HeroSlider from '../../src/components/HeroSlider';
import HealthGoalsCategory from '../../src/components/HealthGoalsCategory';
import NutritionistSlider from '../../src/components/NutritionistSlider';
import PromotionalBanner from '../../src/components/PromotionalBanner';
import EnhancedTracking from '../../src/components/EnhancedTracking';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedGoal, setSelectedGoal] = useState<number>(1);
  
  const healthGoals = [
    { id: 1, name: 'Weight Loss', icon: '⚖️', color: '#FF6B6B', description: 'Lose weight safely' },
    { id: 2, name: 'Muscle Gain', icon: '💪', color: '#4ECDC4', description: 'Build lean muscle' },
    { id: 3, name: 'PCOS Friendly', icon: '🌸', color: '#45B7D1', description: 'Manage PCOS symptoms' },
    { id: 4, name: 'Vegan', icon: '🌱', color: '#96CEB4', description: 'Plant-based nutrition' },
  ];

  // Real-time updates for meal plans and nutritionists
  useClientRealtime();

  // Fetch meal plans from API
  const { } = useQuery({
    queryKey: ['/api/meal-plans'],
    queryFn: () => Promise.resolve([]), // Mock data
  });

  // Fetch nutritionists from API
  const { } = useQuery({
    queryKey: ['/api/nutritionists'],
    queryFn: () => Promise.resolve([]), // Mock data
  });

  // Hero slider data
  const heroSlides = [
    {
      id: 1,
      title: 'Home-Cooked Goodness',
      subtitle: 'Perfected by Nutritionists',
      ctaText: 'Explore Plans',
      backgroundColor: '#10B981',
    },
    {
      id: 2,
      title: 'Healthy Made Easy',
      subtitle: 'Delicious meals delivered daily',
      ctaText: 'Order Now',
      backgroundColor: '#3B82F6',
    },
    {
      id: 3,
      title: 'Expert Guidance',
      subtitle: 'Consult with certified nutritionists',
      ctaText: 'Book Consultation',
      backgroundColor: '#8B5CF6',
    },
  ];

  // Mock nutritionists data
  const nutritionists = [
    {
      id: '1',
      name: 'Dr. Priya Sharma',
      specialization: 'Weight Management',
      experience: '8 years experience',
      rating: 4.8,
      reviewCount: 1200,
      image: 'https://via.placeholder.com/150',
      consultationFee: 500,
      availability: 'Available',
    },
    {
      id: '2',
      name: 'Rahul Menon',
      specialization: 'Sports Nutrition',
      experience: '6 years experience',
      rating: 4.7,
      reviewCount: 800,
      image: 'https://via.placeholder.com/150',
      consultationFee: 600,
      availability: 'Available',
    },
  ];

  const featuredMeals = [
    {
      id: 1,
      title: 'Weight Loss Plan',
      description: 'Balanced meals to help shed fat effectively',
      price: '₹1,500',
      image: '🥗',
      badge: 'Bestseller',
    },
    {
      id: 2,
      title: 'Muscle Gain Plan',
      description: 'Protein-rich meals for lean muscle development',
      price: '₹1,500',
      image: '💪',
      badge: 'Popular',
    },
    {
      id: 3,
      title: 'PCOS Friendly',
      description: 'Low glycemic meals for health management',
      price: '₹1,500',
      image: '🌸',
      badge: 'Recommended',
    },
  ];

  const quickActions = [
    { title: 'Order Now', icon: 'restaurant', color: '#10B981' },
    { title: 'Track Order', icon: 'location', color: '#3B82F6' },
    { title: 'Nutritionist', icon: 'medical', color: '#8B5CF6' },
    { title: 'Support', icon: 'help-circle', color: '#F59E0B' },
  ];

  const renderHomeContent = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Hero Slider */}
      <HeroSlider
        slides={heroSlides}
        autoRotateInterval={5000}
        onCtaClick={(id) => log.debug('Hero CTA clicked', { id })}
      />

      {/* Health Goals Categories */}
      <HealthGoalsCategory
        goals={healthGoals}
        selectedGoal={selectedGoal}
        onGoalSelect={setSelectedGoal}
        onCategorySelect={(categoryId) => log.debug('Category selected', { categoryId })}
      />

      {/* Nutritionist Consultation Slider */}
      {false ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading nutritionists...</Text>
        </View>
      ) : (
        <NutritionistSlider
          nutritionists={nutritionists}
          onConsult={(id) => log.debug('Consult nutritionist', { id })}
          onNutritionistSelect={(id) => log.debug('Consult nutritionist', { id })}
        />
      )}

      {/* Promotional Banner */}
      <PromotionalBanner 
        autoRotateInterval={4000}
        onBannerClick={(bannerId) => log.debug('Banner clicked', { bannerId })}
      />

      {/* Featured Meals */}
      <View style={styles.featuredContainer}>
        <Text style={styles.sectionTitle}>Featured Meal Plans</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featuredMeals.map((meal) => (
            <TouchableOpacity key={meal.id} style={styles.mealCard}>
              <View style={styles.mealImageContainer}>
                <Text style={styles.mealEmoji}>{meal.image}</Text>
                {meal.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{meal.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealTitle}>{meal.title}</Text>
                <Text style={styles.mealDescription}>{meal.description}</Text>
                <View style={styles.mealFooter}>
                  <Text style={styles.mealPrice}>{meal.price}</Text>
                  <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={20} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.quickActionItem}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.recentOrdersContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.orderCard}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>Weight Loss Plan - Lunch</Text>
            <Text style={styles.orderDate}>Ordered on Dec 15, 2024</Text>
            <View style={styles.orderStatus}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.statusText}>Delivered</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.reorderButton}>
            <Text style={styles.reorderText}>Reorder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning!</Text>
          <Text style={styles.userName}>Welcome to ZyaeL NutriBox</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {['home', 'track'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'home' && renderHomeContent()}
      {activeTab === 'track' && (
        <EnhancedTracking
          onDownloadReport={() => log.debug('Download report clicked')}
          onAddWeight={(weight) => log.debug('Add weight', { weight })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  notificationButton: {
    padding: 8,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  featuredContainer: {
    marginBottom: 24,
  },
  mealCard: {
    width: width * 0.7,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginLeft: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealImageContainer: {
    height: 120,
    backgroundColor: '#f3f4f6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mealEmoji: {
    fontSize: 48,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  mealInfo: {
    padding: 16,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentOrdersContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  reorderButton: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reorderText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
