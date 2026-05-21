import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import apiClient from '../../src/lib/apiClient';
import { log } from '../../src/lib/logger';
import { mapKitchenOrder } from '../../src/lib/apiMappers';

interface KitchenOrder {
  id: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string;
  mealType: string;
  dietPlan: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  estimatedTime?: number;
  createdAt: string;
  specialInstructions?: string;
  kitchenStatus?: string;
}

export default function KitchenDashboard() {
  const { user: _user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');

  // Fetch kitchen orders from API
  const { data: orders = [], isLoading, error, refetch, isRefetching } = useQuery<KitchenOrder[]>({
    queryKey: ['kitchen-orders', selectedFilter],
    queryFn: async () => {
      try {
        let endpoint = '/api/kitchen/orders';
        
        // Apply filter if not 'all'
        if (selectedFilter !== 'all') {
          endpoint += `?status=${selectedFilter}`;
        }
        
        const response = await apiClient.get(endpoint);
        
        // Transform API response to match our interface using mapper
        return (response.data || []).map((order: any) => mapKitchenOrder(order));
      } catch (err: any) {
        log.error('Error fetching kitchen orders', err);
        Alert.alert('Error', 'Failed to load orders. Please try again.');
        return [];
      }
    },
    refetchInterval: 5000,
  });

  // Update order status mutation
  const { mutate: updateStatusMutation, isPending: _isPending } = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      try {
        if (status === 'preparing') {
          await apiClient.patch(`/api/kitchen/orders/${orderId}/start-preparing`);
        } else if (status === 'ready') {
          await apiClient.patch(`/api/kitchen/orders/${orderId}/mark-ready`);
        } else if (status === 'completed') {
          await apiClient.patch(`/api/kitchen/orders/${orderId}/complete`);
        } else {
          await apiClient.patch(`/api/kitchen/orders/${orderId}`, { status });
        }
        return { success: true };
      } catch (err: any) {
        log.error('Error updating order status', err);
        throw new Error(err.response?.data?.detail || 'Failed to update order status');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      Alert.alert('Success', 'Order status updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update order status');
    },
  });

  // Memoize filtered orders to avoid recalculation
  const filteredOrders = useMemo(() => 
    orders.filter(order => 
      selectedFilter === 'all' || order.status === selectedFilter
    ), [orders, selectedFilter]
  );

  // Memoize helper functions
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'preparing': return '#2196F3';
      case 'ready': return '#4CAF50';
      case 'completed': return '#9E9E9E';
      default: return '#666';
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  }, []);

  const handleStatusUpdate = useCallback((orderId: string, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Change order status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateStatusMutation({ orderId, status: newStatus }) },
      ]
    );
  }, [updateStatusMutation]);

  const renderOrder = useCallback(({ item }: { item: KitchenOrder }) => (
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
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Meal Type:</Text>
          <Text style={styles.detailValue}>{item.mealType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Diet Plan:</Text>
          <Text style={styles.detailValue}>{item.dietPlan}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{item.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Est. Time:</Text>
          <Text style={styles.detailValue}>{item.estimatedTime} min</Text>
        </View>
      </View>

      {item.specialInstructions && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsLabel}>Special Instructions:</Text>
          <Text style={styles.instructionsText}>{item.specialInstructions}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        {item.status === 'pending' && (
          <Button
            title="Start Preparing"
            onPress={() => handleStatusUpdate(item.id, 'preparing')}
            size="small"
            variant="primary"
          />
        )}
        {item.status === 'preparing' && (
          <Button
            title="Mark Ready"
            onPress={() => handleStatusUpdate(item.id, 'ready')}
            size="small"
            variant="primary"
          />
        )}
        {item.status === 'ready' && (
          <Button
            title="Mark Completed"
            onPress={() => handleStatusUpdate(item.id, 'completed')}
            size="small"
            variant="secondary"
          />
        )}
        <Button
          title="View Details"
          onPress={() => log.debug('View order details', { orderId: item.id })}
          size="small"
          variant="outline"
        />
      </View>
    </Card>
  ), [handleStatusUpdate, getPriorityColor, getStatusColor]);

  // Memoize stats calculation
  const stats = useMemo(() => ({
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    total: orders.length,
  }), [orders]);

  const ListHeader = () => (
    <View>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.preparing}</Text>
          <Text style={styles.statLabel}>Preparing</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.ready}</Text>
          <Text style={styles.statLabel}>Ready</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Card>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'preparing', 'ready'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List Header */}
      <View style={styles.ordersContainer}>
        <Text style={styles.sectionTitle}>
          Orders ({filteredOrders.length})
        </Text>
      </View>
    </View>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2d5016" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to load orders</Text>
        <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No orders found</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedFilter === 'all' 
                ? 'Orders will appear here when they are placed'
                : `No ${selectedFilter} orders at the moment`}
            </Text>
          </View>
        }
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#2d5016',
    borderColor: '#2d5016',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  ordersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    marginHorizontal: 16,
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
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
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
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
