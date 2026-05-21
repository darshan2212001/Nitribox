import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface MealStatusCardProps {
  mealName: string;
  status: 'preparing' | 'ready' | 'delivered' | 'cancelled';
  estimatedTime?: string;
  onTrackPress?: () => void;
}

export default function MealStatusCard({
  mealName,
  status,
  estimatedTime,
  onTrackPress,
}: MealStatusCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'preparing': return '#FF9800';
      case 'ready': return '#2196F3';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready for Pickup';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mealName}>{mealName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>
      
      {estimatedTime && (
        <Text style={styles.estimatedTime}>
          Estimated: {estimatedTime}
        </Text>
      )}
      
      {status === 'preparing' && onTrackPress && (
        <TouchableOpacity style={styles.trackButton} onPress={onTrackPress}>
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  estimatedTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  trackButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
