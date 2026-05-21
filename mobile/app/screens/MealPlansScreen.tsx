import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MealPlansScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Weight Loss', 'Muscle Gain', 'PCOS', 'Vegan', 'Diabetic'];

  const mealPlans = [
    {
      id: 1,
      title: 'Weight Loss Plan',
      description: 'Balanced meals to help shed fat effectively',
      category: 'Weight Loss',
      price: 1500,
      originalPrice: 1700,
      rating: 4.8,
      reviewCount: 3200,
      badge: 'Bestseller',
      features: ['Low calorie', 'High fiber', 'Portion controlled'],
      image: '🥗',
    },
    {
      id: 2,
      title: 'Muscle Gain Plan',
      description: 'Protein-rich meals for lean muscle development',
      category: 'Muscle Gain',
      price: 1500,
      originalPrice: 1800,
      rating: 4.7,
      reviewCount: 2800,
      badge: 'Popular',
      features: ['High protein', 'Balanced macros', 'Post-workout meals'],
      image: '💪',
    },
    {
      id: 3,
      title: 'PCOS Friendly',
      description: 'Low glycemic meals for health management',
      category: 'PCOS',
      price: 1500,
      originalPrice: 1650,
      rating: 4.6,
      reviewCount: 2300,
      badge: 'Recommended',
      features: ['Low GI', 'Anti-inflammatory', 'Hormone balanced'],
      image: '🌸',
    },
    {
      id: 4,
      title: 'Vegan / Vegetarian',
      description: 'Plant-based nourishment for every lifestyle',
      category: 'Vegan',
      price: 1500,
      originalPrice: 1600,
      rating: 4.5,
      reviewCount: 2100,
      badge: 'Healthy Choice',
      features: ['100% Plant-based', 'Protein-rich', 'Nutrient-dense'],
      image: '🌱',
    },
    {
      id: 5,
      title: 'Diabetic Friendly Meals',
      description: 'Gentle, nutritious meals for health management',
      category: 'Diabetic',
      price: 1500,
      originalPrice: 1650,
      rating: 4.9,
      reviewCount: 1500,
      badge: 'Trusted by Families',
      features: ['Low sugar', 'Controlled carbs', 'Blood sugar friendly'],
      image: '🍎',
    },
  ];

  const filteredMealPlans = mealPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plan.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || plan.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderMealPlan = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.mealPlanCard}>
      <View style={styles.mealPlanHeader}>
        <View style={styles.mealPlanImage}>
          <Text style={styles.mealPlanEmoji}>{item.image}</Text>
        </View>
        <View style={styles.mealPlanInfo}>
          <View style={styles.mealPlanTitleRow}>
            <Text style={styles.mealPlanTitle}>{item.title}</Text>
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.mealPlanDescription}>{item.description}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount} reviews)</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.featuresContainer}>
        {item.features.map((feature: string, index: number) => (
          <View key={index} style={styles.featureTag}>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.mealPlanFooter}>
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>₹{item.price}</Text>
          <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
        </View>
        <TouchableOpacity style={styles.selectButton}>
          <Text style={styles.selectButtonText}>Select Plan</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meal plans..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Meal Plans List */}
      <FlatList
        data={filteredMealPlans}
        renderItem={renderMealPlan}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.mealPlansList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  categoriesContainer: {
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  mealPlansList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealPlanCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealPlanHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mealPlanImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealPlanEmoji: {
    fontSize: 24,
  },
  mealPlanInfo: {
    flex: 1,
  },
  mealPlanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealPlanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  mealPlanDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  featureTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  mealPlanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  selectButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
