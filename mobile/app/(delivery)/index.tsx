import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import apiClient from '../../src/lib/apiClient';
import { log } from '../../src/lib/logger';
import { mapDeliveryOrder } from '../../src/lib/apiMappers';

interface DeliveryOrder {
  id: string;
  orderId?: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  mealType: string;
  quantity?: number;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  priority?: 'low' | 'medium' | 'high';
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  distance?: number;
  deliveryFee?: number;
  specialInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  currentLocation?: {
    latitude: string | number;
    longitude: string | number;
  };
}

interface DeliveryStats {
  totalDeliveries: number;
  completedToday: number;
  pendingDeliveries: number;
  averageRating: number;
  totalEarnings: number;
  todayEarnings: number;
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);

  // Fetch delivery orders from API
  const { data: orders = [], isLoading, error } = useQuery<DeliveryOrder[]>({
    queryKey: ['delivery-orders', user?.id],
    queryFn: async () => {
      try {
        // Use user ID as delivery agent ID (for delivery role users, their user ID is their agent ID)
        // If the backend requires a separate agent ID, it should be included in the user profile
        const agentId = user?.id;
        if (!agentId) {
          throw new Error('User ID not available');
        }
        
        // Get active deliveries for this agent
        const response = await apiClient.get(`/api/delivery-tracking/agent/${agentId}/active`);
        
        // Transform API response using mapper
        return (response.data || []).map((order: any) => mapDeliveryOrder(order));
      } catch (err: any) {
        log.error('Error fetching delivery orders', err);
        // If agent-specific endpoint fails, try general orders endpoint
        try {
          const response = await apiClient.get('/api/orders?status=assigned,packed,in-transit');
          return (response.data || []).map((order: any) => mapDeliveryOrder(order));
        } catch (fallbackErr) {
          log.error('Fallback delivery orders fetch failed', fallbackErr);
          return [];
        }
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    enabled: !!user?.id, // Only fetch if user is logged in
  });

  // Fetch delivery stats (calculate from orders or use API if available)
  const { data: stats } = useQuery<DeliveryStats>({
    queryKey: ['delivery-stats', user?.id, orders.length],
    queryFn: async () => {
      // Calculate stats from orders
      const completedToday = orders.filter(o => o.status === 'delivered').length;
      const pendingDeliveries = orders.filter(o => o.status !== 'delivered').length;
      
      return {
        totalDeliveries: orders.length,
        completedToday,
        pendingDeliveries,
        averageRating: 4.5, // Can be fetched from API if available
        totalEarnings: orders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0),
        todayEarnings: orders
          .filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + (o.deliveryFee || 0), 0),
      };
    },
    initialData: {
      totalDeliveries: 0,
      completedToday: 0,
      pendingDeliveries: 0,
      averageRating: 0,
      totalEarnings: 0,
      todayEarnings: 0,
    },
  });

  // Update order status mutation
  const { mutate: updateStatusMutation, isPending: _isPending } = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      try {
        // Normalize status for API (in-transit vs in_transit)
        const apiStatus = status.replace('_', '-');
        
        // Update order status using PATCH (not PUT)
        await apiClient.patch(`/api/orders/${orderId}/status`, { status: apiStatus });
        
        // If starting delivery, create tracking
        if (status === 'picked_up') {
          try {
            await apiClient.post(`/api/delivery-tracking/assign`, {
              order_id: orderId,
              delivery_agent_id: user?.id,
            });
          } catch (trackingErr) {
            log.debug('Tracking creation optional, continuing...');
          }
        }
        
        return { success: true };
      } catch (err: any) {
        log.error('Error updating order status', err);
        throw new Error(err.response?.data?.detail || 'Failed to update order status');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      Alert.alert('Success', 'Order status updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update order status');
    },
  });

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Change order status to ${newStatus.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateStatusMutation({ orderId, status: newStatus }) },
      ]
    );
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    // Update online status in backend
    log.debug('Toggle online status', { isOnline: !isOnline });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#FF9800';
      case 'picked_up': return '#2196F3';
      case 'in_transit': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const renderOrder = ({ item }: { item: DeliveryOrder }) => (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.clientPhone}>{item.clientPhone}</Text>
        </View>
        <View style={styles.orderMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority || 'medium') }]}>
            <Text style={styles.priorityText}>{(item.priority || 'medium').toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={styles.detailValue}>{item.clientAddress}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Meal:</Text>
          <Text style={styles.detailValue}>{item.mealType} ({item.quantity}x)</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Distance:</Text>
          <Text style={styles.detailValue}>{item.distance} km</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fee:</Text>
          <Text style={styles.detailValue}>₹{item.deliveryFee}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Est. Time:</Text>
          <Text style={styles.detailValue}>{item.estimatedDeliveryTime}</Text>
        </View>
      </View>

      {item.specialInstructions && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsLabel}>Instructions:</Text>
          <Text style={styles.instructionsText}>{item.specialInstructions}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        {item.status === 'assigned' && (
          <Button
            title="Pick Up Order"
            onPress={() => handleStatusUpdate(item.id, 'picked_up')}
            size="small"
            variant="primary"
          />
        )}
        {item.status === 'picked_up' && (
          <Button
            title="Start Delivery"
            onPress={() => handleStatusUpdate(item.id, 'in_transit')}
            size="small"
            variant="primary"
          />
        )}
        {item.status === 'in_transit' && (
          <Button
            title="Mark Delivered"
            onPress={() => handleStatusUpdate(item.id, 'delivered')}
            size="small"
            variant="primary"
          />
        )}
        {item.coordinates && item.coordinates.latitude !== 0 && (
          <Button
            title="Navigate"
            onPress={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coordinates!.latitude},${item.coordinates!.longitude}`;
              Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open navigation'));
            }}
            size="small"
            variant="outline"
          />
        )}
        <Button
          title="Call Client"
          onPress={() => {
            const phoneUrl = `tel:${item.clientPhone}`;
            Linking.openURL(phoneUrl).catch(() => Alert.alert('Error', 'Could not make call'));
          }}
          size="small"
          variant="outline"
        />
      </View>
    </Card>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to load deliveries</Text>
        <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
      </View>
    );
  }

  const ListHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.name || 'Delivery Agent'}</Text>
      </View>

      {/* Online Status Toggle */}
      <View style={styles.statusContainer}>
        <Card style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {isOnline ? 'Online - Available for deliveries' : 'Offline - Not accepting orders'}
            </Text>
          </View>
          <Button
            title={isOnline ? 'Go Offline' : 'Go Online'}
            onPress={toggleOnlineStatus}
            size="small"
            variant={isOnline ? 'secondary' : 'primary'}
          />
        </Card>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completedToday}</Text>
          <Text style={styles.statLabel}>Today's Deliveries</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingDeliveries}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.averageRating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>₹{stats.todayEarnings}</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </Card>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Card style={styles.quickStatsCard}>
          <View style={styles.quickStatsRow}>
            <Text style={styles.quickStatsLabel}>Total Deliveries:</Text>
            <Text style={styles.quickStatsValue}>{stats.totalDeliveries}</Text>
          </View>
          <View style={styles.quickStatsRow}>
            <Text style={styles.quickStatsLabel}>Total Earnings:</Text>
            <Text style={styles.quickStatsValue}>₹{stats.totalEarnings}</Text>
          </View>
        </Card>
      </View>

      {/* Orders List Header */}
      <View style={styles.ordersContainer}>
        <Text style={styles.sectionTitle}>
          My Orders ({orders.length})
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#2d5016',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
  },
  statusContainer: {
    padding: 16,
  },
  statusCard: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  quickStatsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickStatsCard: {
    padding: 16,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quickStatsLabel: {
    fontSize: 14,
    color: '#666',
  },
  quickStatsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  ordersContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
  },
  orderCard: {
    marginBottom: 16,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 12,
    color: '#666',
  },
  orderMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  instructionsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d5016',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});