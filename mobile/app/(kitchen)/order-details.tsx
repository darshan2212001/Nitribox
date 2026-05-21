import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function OrderDetails() {
  const { id } = useLocalSearchParams();
  const [orderStatus, setOrderStatus] = useState<'pending' | 'preparing' | 'ready'>('preparing');

  const orderDetails = {
    id: id as string,
    orderNumber: '#NB001',
    clientName: 'John Doe',
    clientPhone: '+91 98765 43210',
    mealName: 'Weight Loss Lunch',
    dietPlan: 'Weight Loss Plan',
    specialInstructions: 'No onions, extra vegetables, low sodium',
    prepTime: 25,
    status: orderStatus,
    createdAt: '2024-01-15T14:30:00Z',
    ingredients: [
      'Grilled chicken breast (150g)',
      'Mixed vegetables (broccoli, carrots, bell peppers)',
      'Quinoa (50g)',
      'Olive oil (1 tsp)',
      'Lemon juice',
      'Herbs and spices'
    ],
    nutritionInfo: {
      calories: 450,
      protein: 35,
      carbs: 25,
      fat: 12,
      fiber: 8
    }
  };

  const handleStatusChange = (newStatus: typeof orderStatus) => {
    setOrderStatus(newStatus);
    Alert.alert('Status Updated', `Order status changed to ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'preparing': return '#2196F3';
      case 'ready': return '#4CAF50';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Order Header */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{orderDetails.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderDetails.status) }]}>
          <Text style={styles.statusText}>{orderDetails.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Client Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{orderDetails.clientName}</Text>
          
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{orderDetails.clientPhone}</Text>
        </View>
      </View>

      {/* Meal Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Details</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Meal Name</Text>
          <Text style={styles.infoValue}>{orderDetails.mealName}</Text>
          
          <Text style={styles.infoLabel}>Diet Plan</Text>
          <Text style={styles.infoValue}>{orderDetails.dietPlan}</Text>
          
          <Text style={styles.infoLabel}>Prep Time</Text>
          <Text style={styles.infoValue}>{orderDetails.prepTime} minutes</Text>
          
          {orderDetails.specialInstructions && (
            <>
              <Text style={styles.infoLabel}>Special Instructions</Text>
              <Text style={styles.infoValue}>{orderDetails.specialInstructions}</Text>
            </>
          )}
        </View>
      </View>

      {/* Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients Required</Text>
        <View style={styles.ingredientsCard}>
          {orderDetails.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem}>
              <Text style={styles.ingredientBullet}>•</Text>
              <Text style={styles.ingredientText}>{ingredient}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Nutrition Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Information</Text>
        <View style={styles.nutritionCard}>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>{orderDetails.nutritionInfo.calories}</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>{orderDetails.nutritionInfo.protein}g</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>{orderDetails.nutritionInfo.carbs}g</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>{orderDetails.nutritionInfo.fat}g</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Fiber</Text>
            <Text style={styles.nutritionValue}>{orderDetails.nutritionInfo.fiber}g</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {orderDetails.status === 'pending' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton]}
            onPress={() => handleStatusChange('preparing')}
          >
            <Text style={styles.actionButtonText}>Start Preparation</Text>
          </TouchableOpacity>
        )}
        
        {orderDetails.status === 'preparing' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.readyButton]}
            onPress={() => handleStatusChange('ready')}
          >
            <Text style={styles.actionButtonText}>Mark as Ready</Text>
          </TouchableOpacity>
        )}
        
        {orderDetails.status === 'ready' && (
          <View style={styles.readyContainer}>
            <Text style={styles.readyText}>✅ Order Ready for Pickup</Text>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  ingredientsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ingredientBullet: {
    fontSize: 16,
    color: '#2d5016',
    marginRight: 8,
    marginTop: 2,
  },
  ingredientText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  nutritionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#666',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5016',
  },
  actionContainer: {
    padding: 20,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  readyButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  readyContainer: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  readyText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
