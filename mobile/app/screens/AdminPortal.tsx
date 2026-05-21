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
import { log } from '../../src/lib/logger';
import apiClient from '../../src/lib/apiClient';
import { safeFormatDate, safeFormatTime, safeFormatDateTime, getCurrentISOString } from '../../src/lib/dateUtils';

interface AdminPortalProps {
  onBackToRoles: () => void;
}

interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  mealPlan: string;
  status: string;
  total: number;
  createdAt: string;
}

export default function AdminPortal({ onBackToRoles }: AdminPortalProps) {
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'users' | 'orders' | 'alerts'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch alerts from API (if endpoint exists, otherwise use mock for now)
  const { data: alerts = [] } = useQuery({
    queryKey: ['/api/admin/alerts'],
    queryFn: async () => {
      try {
        // Try to fetch from admin endpoint
        const response = await apiClient.get('/api/admin/alerts');
        return response.data || [];
      } catch (err) {
        log.error('Error fetching alerts (may not exist yet)', err);
        // Return empty array if endpoint doesn't exist
        return [];
      }
    },
    // Fallback to empty array if API not available
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/admin/users');
        return (response.data || []).map((user: any) => ({
          id: user.id,
          name: user.name || 'Unknown',
          email: user.email || '',
          role: user.role || 'client',
          status: (user.status || 'active') as 'active' | 'inactive' | 'suspended',
          lastLogin: user.lastLogin || getCurrentISOString(),
          createdAt: user.createdAt || getCurrentISOString(),
        }));
      } catch (err) {
        log.error('Error fetching users', err);
        return [];
      }
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/admin/orders'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/admin/orders');
        return (response.data || []).map((order: any) => ({
          id: order.id,
          orderNumber: order.id?.substring(0, 8).toUpperCase() || 'N/A',
          clientName: order.clientName || 'Unknown',
          mealPlan: order.dietPlan || 'Standard Plan',
          status: order.status || 'pending',
          total: order.price || 0,
          createdAt: order.createdAt || getCurrentISOString(),
        }));
      } catch (err) {
        log.error('Error fetching orders', err);
        return [];
      }
    },
  });

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'info':
        return '#3B82F6';
      case 'warning':
        return '#F59E0B';
      case 'error':
        return '#EF4444';
      case 'success':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'inactive':
        return '#6B7280';
      case 'suspended':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'preparing':
        return '#3B82F6';
      case 'delivered':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const handleUserAction = (userId: string, action: string) => {
    log.debug(`${action} user`, { userId });
  };

  const handleAlertAction = (alertId: string, action: string) => {
    log.debug(`${action} alert`, { alertId });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderAlert = ({ item }: { item: SystemAlert }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <View style={[styles.alertTypeIndicator, { backgroundColor: getAlertColor(item.type) }]} />
          <Text style={[styles.alertType, { color: getAlertColor(item.type) }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.alertTime}>
          {safeFormatTime(item.timestamp)}
        </Text>
      </View>
      <Text style={styles.alertTitle}>{item.title}</Text>
      <Text style={styles.alertMessage}>{item.message}</Text>
      <View style={styles.alertActions}>
        {!item.resolved && (
          <TouchableOpacity
            style={[styles.alertButton, { backgroundColor: getAlertColor(item.type) }]}
            onPress={() => handleAlertAction(item.id, 'resolve')}
          >
            <Text style={styles.alertButtonText}>Resolve</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.alertButtonSecondary}
          onPress={() => handleAlertAction(item.id, 'view')}
        >
          <Text style={styles.alertButtonSecondaryText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userRole}>{item.role.toUpperCase()}</Text>
        </View>
        <View style={[styles.userStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.userStatusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.userDetails}>
        <Text style={styles.userDetailText}>
          Last Login: {safeFormatDate(item.lastLogin)}
        </Text>
        <Text style={styles.userDetailText}>
          Created: {safeFormatDate(item.createdAt)}
        </Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.userActionButton, styles.primaryButton]}
          onPress={() => handleUserAction(item.id, 'view')}
        >
          <Text style={styles.userActionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.userActionButton, styles.secondaryButton]}
          onPress={() => handleUserAction(item.id, 'edit')}
        >
          <Text style={styles.userActionSecondaryText}>Edit</Text>
        </TouchableOpacity>
        {item.status === 'active' ? (
          <TouchableOpacity
            style={[styles.userActionButton, styles.warningButton]}
            onPress={() => handleUserAction(item.id, 'suspend')}
          >
            <Text style={styles.userActionText}>Suspend</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.userActionButton, styles.successButton]}
            onPress={() => handleUserAction(item.id, 'activate')}
          >
            <Text style={styles.userActionText}>Activate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderClient}>{item.clientName}</Text>
          <Text style={styles.orderMealPlan}>{item.mealPlan}</Text>
        </View>
        <View style={styles.orderStatusContainer}>
          <View style={[styles.orderStatusBadge, { backgroundColor: getOrderStatusColor(item.status) }]}>
            <Text style={styles.orderStatusText}>{item.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.orderTotal}>₹{item.total}</Text>
        </View>
      </View>
      <Text style={styles.orderDate}>
        {safeFormatDateTime(item.createdAt)}
      </Text>
    </View>
  );

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3B82F6" />
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="receipt" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="warning" size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{alerts.filter((a: SystemAlert) => !a.resolved).length}</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#8B5CF6" />
          <Text style={styles.statNumber}>
            ₹{orders.reduce((sum: number, order: Order) => sum + order.total, 0).toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Ionicons name="person-add" size={16} color="#10B981" />
            <Text style={styles.activityText}>New user registered: John Doe</Text>
            <Text style={styles.activityTime}>2 min ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="receipt" size={16} color="#3B82F6" />
            <Text style={styles.activityText}>Order ORD-001 completed</Text>
            <Text style={styles.activityTime}>15 min ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="warning" size={16} color="#F59E0B" />
            <Text style={styles.activityText}>High order volume alert</Text>
            <Text style={styles.activityTime}>1 hour ago</Text>
          </View>
        </View>
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
        <Text style={styles.headerTitle}>Admin Portal</Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['dashboard', 'users', 'orders', 'alerts'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {selectedTab === 'dashboard' && renderDashboard()}

      {selectedTab === 'alerts' && (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {selectedTab === 'users' && (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {selectedTab === 'orders' && (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6B46C1',
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
    backgroundColor: '#6B46C1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  dashboardContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  recentActivity: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  alertCard: {
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
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  alertButtonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertButtonSecondaryText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  userStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  userDetails: {
    marginBottom: 12,
  },
  userDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#6B46C1',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  userActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userActionSecondaryText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 8,
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
  orderClient: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  orderMealPlan: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderStatusContainer: {
    alignItems: 'flex-end',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  orderStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
  },
});
