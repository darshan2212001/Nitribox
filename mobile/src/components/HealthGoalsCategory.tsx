import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

const { } = Dimensions.get('window');

interface HealthGoalsCategoryProps {
  goals: Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    description: string;
  }>;
  selectedGoal: number;
  onGoalSelect: (goal: any) => void;
  onCategorySelect?: (categoryId: any) => void;
}

interface HealthGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  mealPlans: number;
}

export default function HealthGoalsCategory({ onCategorySelect }: HealthGoalsCategoryProps) {
  const [selectedCategory] = useState<string | null>(null);

  const healthGoals: HealthGoal[] = [
    {
      id: 'weight-loss',
      title: 'Weight Loss',
      description: 'Shed pounds with balanced nutrition',
      icon: 'trending-down',
      color: '#10B981',
      mealPlans: 12,
    },
    {
      id: 'muscle-gain',
      title: 'Muscle Gain',
      description: 'Build lean muscle mass',
      icon: 'fitness',
      color: '#3B82F6',
      mealPlans: 8,
    },
    {
      id: 'pcos-friendly',
      title: 'PCOS Friendly',
      description: 'Manage PCOS with proper nutrition',
      icon: 'heart',
      color: '#8B5CF6',
      mealPlans: 10,
    },
    {
      id: 'vegan',
      title: 'Vegan',
      description: 'Plant-based nutrition plans',
      icon: 'leaf',
      color: '#F59E0B',
      mealPlans: 6,
    },
  ];

  const handleCategoryPress = (categoryId: any) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };

  const renderGoalCard = (goal: HealthGoal) => (
    <TouchableOpacity
      key={goal.id}
      style={[
        styles.goalCard,
        { backgroundColor: goal.color },
        selectedCategory === goal.id && styles.selectedCard,
      ]}
      onPress={() => handleCategoryPress(goal.id)}
    >
      <View style={styles.goalContent}>
        <Text style={styles.goalIcon}>{goal.icon}</Text>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalDescription}>{goal.description}</Text>
        <Text style={styles.mealPlansCount}>{goal.mealPlans} meal plans</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Choose Your Health Goal</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {healthGoals.map(renderGoalCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  goalCard: {
    width: 160,
    height: 140,
    borderRadius: 16,
    marginRight: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  goalContent: {
    alignItems: 'center',
  },
  goalIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },
  mealPlansCount: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});