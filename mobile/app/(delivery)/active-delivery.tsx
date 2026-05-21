import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { log } from '../../src/lib/logger';
import { safeFormatTime } from '../../src/lib/dateUtils';

export default function ActiveDelivery() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [_currentLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [deliveryStatus, setDeliveryStatus] = useState<'picked_up' | 'in_transit' | 'delivered'>('picked_up');
  const [estimatedTime, setEstimatedTime] = useState(15);

  const deliveryData = {
    id: id as string,
    orderNumber: '#NB001',
    clientName: 'John Doe',
    clientPhone: '+91 98765 43210',
    clientAddress: '123 Main St, City, State 12345',
    mealName: 'Weight Loss Lunch',
    pickupAddress: 'ZyaeL Kitchen, 456 Food St',
    deliveryAddress: '123 Main St, City, State 12345',
    distance: 5.2,
    estimatedTime: estimatedTime,
    status: deliveryStatus,
    pickedUpAt: '2024-01-15T14:45:00Z',
    specialInstructions: 'Call before delivery, leave at door if no answer',
  };

  useEffect(() => {
    // Simulate real-time location updates
    const interval = setInterval(() => {
      setEstimatedTime(prev => Math.max(0, prev - 1));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = (newStatus: typeof deliveryStatus) => {
    setDeliveryStatus(newStatus);
    if (newStatus === 'delivered') {
      Alert.alert(
        'Delivery Complete',
        'Order has been successfully delivered!',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } else {
      Alert.alert('Status Updated', `Delivery status changed to ${newStatus}`);
    }
  };

  const handleCallClient = () => {
    Alert.alert(
      'Call Client',
      `Call ${deliveryData.clientName} at ${deliveryData.clientPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            log.debug('Calling client', { phone: deliveryData.clientPhone });
            Linking.openURL(`tel:${deliveryData.clientPhone}`);
          }
        }
      ]
    );
  };

  const handleNavigate = () => {
    Alert.alert(
      'Navigation',
      'Opening navigation to delivery address...',
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'picked_up': return '#2196F3';
      case 'in_transit': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Delivery Header */}
      <View style={styles.header}>
        <Text style={styles.orderNumber}>{deliveryData.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(deliveryData.status) }]}>
          <Text style={styles.statusText}>{deliveryData.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      {/* Client Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.clientName}>{deliveryData.clientName}</Text>
          <Text style={styles.clientPhone}>📞 {deliveryData.clientPhone}</Text>
          <Text style={styles.clientAddress}>📍 {deliveryData.clientAddress}</Text>
          <Text style={styles.mealName}>🍽️ {deliveryData.mealName}</Text>
        </View>
      </View>

      {/* Delivery Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup Address:</Text>
            <Text style={styles.detailValue}>{deliveryData.pickupAddress}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Address:</Text>
            <Text style={styles.detailValue}>{deliveryData.deliveryAddress}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distance:</Text>
            <Text style={styles.detailValue}>{deliveryData.distance} km</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Time:</Text>
            <Text style={styles.detailValue}>{deliveryData.estimatedTime} minutes</Text>
          </View>
          {deliveryData.specialInstructions && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Special Instructions:</Text>
              <Text style={styles.detailValue}>{deliveryData.specialInstructions}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Progress</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.timelineText}>Order Picked Up</Text>
            <Text style={styles.timelineTime}>
              {safeFormatTime(deliveryData.pickedUpAt)}
            </Text>
          </View>
          
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot, 
              { backgroundColor: deliveryStatus === 'in_transit' || deliveryStatus === 'delivered' ? '#4CAF50' : '#e0e0e0' }
            ]} />
            <Text style={[
              styles.timelineText,
              (deliveryStatus === 'in_transit' || deliveryStatus === 'delivered') && styles.timelineTextActive
            ]}>
              In Transit
            </Text>
            <Text style={styles.timelineTime}>
              {deliveryStatus === 'in_transit' || deliveryStatus === 'delivered' ? 'Now' : 'Pending'}
            </Text>
          </View>
          
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot, 
              { backgroundColor: deliveryStatus === 'delivered' ? '#4CAF50' : '#e0e0e0' }
            ]} />
            <Text style={[
              styles.timelineText,
              deliveryStatus === 'delivered' && styles.timelineTextActive
            ]}>
              Delivered
            </Text>
            <Text style={styles.timelineTime}>
              {deliveryStatus === 'delivered' ? 'Now' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCallClient}>
            <Text style={styles.actionButtonIcon}>📞</Text>
            <Text style={styles.actionButtonText}>Call Client</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
            <Text style={styles.actionButtonIcon}>🧭</Text>
            <Text style={styles.actionButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>

        {deliveryStatus === 'picked_up' && (
          <TouchableOpacity 
            style={[styles.statusButton, styles.inTransitButton]}
            onPress={() => handleStatusChange('in_transit')}
          >
            <Text style={styles.statusButtonText}>Start Delivery</Text>
          </TouchableOpacity>
        )}
        
        {deliveryStatus === 'in_transit' && (
          <TouchableOpacity 
            style={[styles.statusButton, styles.deliveredButton]}
            onPress={() => handleStatusChange('delivered')}
          >
            <Text style={styles.statusButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}
        
        {deliveryStatus === 'delivered' && (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>✅ Delivery Completed Successfully!</Text>
            <Text style={styles.completedSubtext}>
              Thank you for your service. Order has been delivered.
            </Text>
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
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 8,
  },
  clientPhone: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 14,
    color: '#2d5016',
    fontWeight: '600',
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  timelineText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  timelineTextActive: {
    color: '#2d5016',
    fontWeight: '600',
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  actionContainer: {
    padding: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2d5016',
    fontWeight: '600',
  },
  statusButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  inTransitButton: {
    backgroundColor: '#9C27B0',
  },
  deliveredButton: {
    backgroundColor: '#4CAF50',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  completedSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
