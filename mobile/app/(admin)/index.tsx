import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import apiClient from '../../src/lib/apiClient';
import { log } from '../../src/lib/logger';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'orders' | 'alerts'>('overview');

  // Fetch admin alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/admin/alerts'],
    queryFn: async () => {
      try {
        // Try to fetch from admin endpoint
        const response = await apiClient.get('/api/admin/alerts');
        return response.data || [];
      } catch (err: any) {
        log.error('Error fetching admin alerts', err);
        return [];
      }
    },
  });

  // Fetch user stats
  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/admin/users');
        return response.data || { total: 0, active: 0, inactive: 0 };
      } catch (err: any) {
        log.error('Error fetching user stats', err);
        return { total: 0, active: 0, inactive: 0 };
      }
    },
  });

  // Fetch order stats
  const { data: orderStats, isLoading: orderStatsLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/admin/orders');
        return response.data || { total: 0, pending: 0, completed: 0 };
      } catch (err: any) {
        log.error('Error fetching order stats', err);
        return { total: 0, pending: 0, completed: 0 };
      }
    },
  });

  if (alertsLoading || userStatsLoading || orderStatsLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.name || 'Admin'}</Text>
        </View>

        <View style={styles.tabContainer}>
          {(['overview', 'users', 'orders', 'alerts'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTab === 'overview' && (
          <View style={styles.content}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statValue}>{userStats?.total || 0}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Active Users</Text>
              <Text style={styles.statValue}>{userStats?.active || 0}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Total Orders</Text>
              <Text style={styles.statValue}>{orderStats?.total || 0}</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Pending Orders</Text>
              <Text style={styles.statValue}>{orderStats?.pending || 0}</Text>
            </Card>
          </View>
        )}

        {selectedTab === 'users' && (
          <View style={styles.content}>
            <Button
              title="Manage Users"
              onPress={() => router.push('/(admin)/users')}
              variant="primary"
            />
          </View>
        )}

        {selectedTab === 'alerts' && (
          <View style={styles.content}>
            {alerts.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No alerts</Text>
              </Card>
            ) : (
              alerts.map((alert: any) => (
                <Card key={alert.id} style={styles.alertCard}>
                  <Text style={styles.alertTitle}>{alert.title || 'Alert'}</Text>
                  <Text style={styles.alertMessage}>{alert.message || ''}</Text>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#2d5016',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2d5016',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#2d5016',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  statCard: {
    marginBottom: 12,
    padding: 16,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  alertCard: {
    marginBottom: 12,
    padding: 16,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

