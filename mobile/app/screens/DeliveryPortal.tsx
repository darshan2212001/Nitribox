import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../src/lib/apiClient';
import { log } from '../../src/lib/logger';
import { mapDeliveryOrder } from '../../src/lib/apiMappers';
import { safeFormatTime, getCurrentISOString } from '../../src/lib/dateUtils';

interface DeliveryPortalProps {
  onBackToRoles: () => void;
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  mealPlan: string;
  status: 'assigned' | 'picked-up' | 'picked_up' | 'in-transit' | 'in_transit' | 'delivered' | 'failed';
  priority: 'low' | 'medium' | 'high';
  estimatedDelivery: string;
  actualDelivery?: string;
  distance: number;
  items: string[];
  specialInstructions?: string;
  assignedAt: string;
}

export default function DeliveryPortal({ onBackToRoles }: DeliveryPortalProps) {
  const [selectedTab, setSelectedTab] = useState<'assigned' | 'in-transit' | 'delivered'>('assigned');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch delivery orders from API
  const { data: orders = [] } = useQuery({
    queryKey: ['/api/delivery/orders'],
    queryFn: async () => {
      try {
        // Get orders for delivery agent
        const response = await apiClient.get('/api/orders?status=assigned,packed,in-transit,delivered');
        return (response.data || []).map((order: any) => {
          const mapped = mapDeliveryOrder(order);
          return {
            ...mapped,
            mealPlan: order.dietPlan || order.diet_plan || 'Standard Plan',
            estimatedDelivery: mapped.estimatedDeliveryTime || getCurrentISOString(),
            items: [],
            assignedAt: order.assignedAt || order.assigned_at || order.createdAt || order.created_at || getCurrentISOString(),
            actualDelivery: mapped.actualDeliveryTime || order.deliveredAt || order.delivered_at,
          };
        });
      } catch (err) {
        log.error('Error fetching delivery orders', err);
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const filteredOrders = orders.filter((order: DeliveryOrder) => {
    switch (selectedTab) {
      case 'assigned':
        return order.status === 'assigned';
      case 'in-transit':
        // Support both formats for backward compatibility
        return order.status === 'in_transit' || order.status === 'in-transit' || order.status === 'picked_up' || order.status === 'picked-up';
      case 'delivered':
        return order.status === 'delivered';
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return '#F59E0B';
      case 'picked-up':
        return '#3B82F6';
      case 'in-transit':
        return '#8B5CF6';
      case 'delivered':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    log.debug('Updating order status', { orderId, newStatus });
  };

  const handleCallClient = (phone: string) => {
    log.debug('Calling phone', { phone });
    // Implement phone call functionality
  };

  const handleNavigateToAddress = (address: string) => {
    log.debug('Navigating to address', { address });
    // Implement navigation functionality
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderOrder = ({ item }: { item: DeliveryOrder }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.mealPlan}>{item.mealPlan}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.replace('-', ' ').toUpperCase()}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.addressContainer}>
        <View style={styles.addressHeader}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.addressLabel}>Delivery Address</Text>
        </View>
        <Text style={styles.addressText}>{item.clientAddress}</Text>
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => handleNavigateToAddress(item.clientAddress)}
        >
          <Ionicons name="navigate-outline" size={16} color="#3B82F6" />
          <Text style={styles.navigateText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contactContainer}>
        <View style={styles.contactItem}>
          <Ionicons name="call-outline" size={16} color="#6B7280" />
          <Text style={styles.contactText}>{item.clientPhone}</Text>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCallClient(item.clientPhone)}
          >
            <Ionicons name="call" size={16} color="#10B981" />
          </TouchableOpacity>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.contactText}>
            ETA: {safeFormatTime(item.estimatedDelivery)}
          </Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="speedometer-outline" size={16} color="#6B7280" />
          <Text style={styles.contactText}>{item.distance} km</Text>
        </View>
      </View>

      {item.specialInstructions && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsLabel}>Special Instructions:</Text>
          <Text style={styles.instructionsText}>{item.specialInstructions}</Text>
        </View>
      )}

      <View style={styles.itemsContainer}>
        <Text style={styles.itemsTitle}>Items:</Text>
        {item.items.map((itemName, index) => (
          <Text key={index} style={styles.itemText}>• {itemName}</Text>
        ))}
      </View>

      <View style={styles.actionButtons}>
        {item.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.pickupButton]}
            onPress={() => handleStatusUpdate(item.id, 'picked-up')}
          >
            <Text style={styles.actionButtonText}>Mark Picked Up</Text>
          </TouchableOpacity>
        )}
        {item.status === 'picked-up' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.transitButton]}
            onPress={() => handleStatusUpdate(item.id, 'in-transit')}
          >
            <Text style={styles.actionButtonText}>Start Delivery</Text>
          </TouchableOpacity>
        )}
        {(item.status === 'in-transit' || item.status === 'picked-up') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deliveredButton]}
            onPress={() => handleStatusUpdate(item.id, 'delivered')}
          >
            <Text style={styles.actionButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
        {item.status === 'delivered' && (
          <View style={styles.deliveredInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.deliveredText}>
              Delivered at {safeFormatTime(item.actualDelivery)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToRoles} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Portal</Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{orders.filter((o: DeliveryOrder) => o.status === 'assigned').length}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{orders.filter((o: DeliveryOrder) => o.status === 'in-transit' || o.status === 'picked-up').length}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{orders.filter((o: DeliveryOrder) => o.status === 'delivered').length}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['assigned', 'in-transit', 'delivered'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.replace('-', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No {selectedTab} deliveries</Text>
            <Text style={styles.emptyStateText}>
              {selectedTab === 'assigned' 
                ? "No assigned deliveries at the moment."
                : `No ${selectedTab.replace('-', ' ')} deliveries right now.`
              }
            </Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  ordersList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
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
    color: '#1F2937',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  mealPlan: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  navigateText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '600',
  },
  contactContainer: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  callButton: {
    padding: 4,
  },
  instructionsContainer: {
    marginBottom: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  pickupButton: {
    backgroundColor: '#F59E0B',
  },
  transitButton: {
    backgroundColor: '#8B5CF6',
  },
  deliveredButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deliveredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
