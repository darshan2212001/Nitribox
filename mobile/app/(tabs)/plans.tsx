import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';

const plans = [
  {
    id: 1,
    name: 'Weight Loss Plan',
    price: '₹2,999',
    duration: '30 Days',
    description: 'Personalized weight loss meals with calorie tracking',
    features: ['1200-1500 calories/day', 'Low carb options', 'Nutritionist support'],
    image: '🥗',
  },
  {
    id: 2,
    name: 'Muscle Gain Plan',
    price: '₹3,499',
    duration: '30 Days',
    description: 'High protein meals for muscle building',
    features: ['2000-2500 calories/day', 'High protein', 'Post-workout meals'],
    image: '💪',
  },
  {
    id: 3,
    name: 'Balanced Nutrition',
    price: '₹2,499',
    duration: '30 Days',
    description: 'Complete balanced meals for overall health',
    features: ['1800-2000 calories/day', 'All nutrients', 'Family-friendly'],
    image: '❤️',
  },
  {
    id: 4,
    name: 'Diabetic Friendly',
    price: '₹2,799',
    duration: '30 Days',
    description: 'Low glycemic meals for diabetes management',
    features: ['Low sugar', 'High fiber', 'Blood sugar friendly'],
    image: '🍛',
  },
];

export default function PlansScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  // Fetch meal plans from API
  const { } = useQuery({
    queryKey: ['meal-plans'],
    queryFn: async () => {
      // Mock API call - replace with actual API
      return plans;
    },
  });

  // Fetch user's current subscription
  const { data: currentSubscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      // Mock data - replace with actual API
      return null; // No current subscription
    },
  });

  // Subscribe to a plan mutation
  const { mutate: subscribeMutation, isPending } = useMutation({
    mutationFn: async (_planId: number) => {
      // Mock API call - replace with actual API
      return { success: true, subscriptionId: 'sub_123' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', user?.id] });
      Alert.alert('Success', 'Plan subscribed successfully!');
    },
    onError: (_error) => {
      Alert.alert('Error', 'Failed to subscribe to plan. Please try again.');
    },
  });

  const handleSelectPlan = (planId: number) => {
    setSelectedPlan(planId);
    Alert.alert(
      'Subscribe to Plan',
      'Are you sure you want to subscribe to this plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Subscribe', onPress: () => subscribeMutation(planId) },
      ]
    );
  };

  const renderPlan = ({ item }: { item: any }) => (
    <Card style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planIcon}>{item.image}</Text>
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{item.name}</Text>
          <Text style={styles.planDuration}>{item.duration}</Text>
        </View>
        <Text style={styles.planPrice}>{item.price}</Text>
      </View>
      
      <Text style={styles.planDescription}>{item.description}</Text>
      
      <View style={styles.featuresContainer}>
        {item.features.map((feature: string, index: number) => (
          <View key={index} style={styles.feature}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <Button
        title={currentSubscription ? "Current Plan" : "Select Plan"}
        onPress={() => handleSelectPlan(item.id)}
        disabled={!!currentSubscription || isPending}
        loading={isPending && selectedPlan === item.id}
        variant={currentSubscription ? "secondary" : "primary"}
      />
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Plan</Text>
      <Text style={styles.subtitle}>Select the perfect nutrition plan for your goals</Text>
      
      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  listContainer: {
    padding: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    color: '#4CAF50',
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#2d5016',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
