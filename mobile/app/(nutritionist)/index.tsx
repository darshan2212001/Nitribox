import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import { log } from '../../src/lib/logger';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentWeight: number;
  targetWeight: number;
  height: number;
  age: number;
  gender: string;
  healthConditions: string[];
  lastConsultation: string;
  nextConsultation?: string;
  progress: {
    weightLoss: number;
    adherence: number;
    satisfaction: number;
  };
}

interface Consultation {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  type: 'initial' | 'follow-up' | 'emergency';
  notes?: string;
}

export default function NutritionistDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'clients' | 'consultations'>('overview');

  // Fetch nutritionist's clients
  const { data: clients = [], refetch: refetchClients, isRefetching: isRefetchingClients } = useQuery<Client[]>({
    queryKey: ['nutritionist-clients', user?.id],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+91 98765 43210',
          currentWeight: 75,
          targetWeight: 70,
          height: 175,
          age: 30,
          gender: 'Male',
          healthConditions: ['Diabetes Type 2'],
          lastConsultation: '2024-01-10',
          nextConsultation: '2024-01-20',
          progress: {
            weightLoss: 2.5,
            adherence: 85,
            satisfaction: 4.5,
          },
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+91 98765 43211',
          currentWeight: 65,
          targetWeight: 60,
          height: 165,
          age: 28,
          gender: 'Female',
          healthConditions: ['PCOS'],
          lastConsultation: '2024-01-12',
          nextConsultation: '2024-01-22',
          progress: {
            weightLoss: 1.8,
            adherence: 92,
            satisfaction: 4.8,
          },
        },
      ];
    },
  });

  // Fetch upcoming consultations
  const { data: consultations = [], refetch: refetchConsultations, isRefetching: isRefetchingConsultations } = useQuery<Consultation[]>({
    queryKey: ['nutritionist-consultations', user?.id],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: '1',
          clientId: '1',
          clientName: 'John Doe',
          date: '2024-01-20',
          time: '10:00 AM',
          duration: 30,
          status: 'scheduled',
          type: 'follow-up',
        },
        {
          id: '2',
          clientId: '2',
          clientName: 'Jane Smith',
          date: '2024-01-22',
          time: '2:00 PM',
          duration: 45,
          status: 'scheduled',
          type: 'follow-up',
        },
      ];
    },
  });

  // Memoize stats calculation to avoid recalculation on every render
  const stats = useMemo(() => ({
    totalClients: clients.length,
    activeClients: clients.filter(c => c.nextConsultation).length,
    upcomingConsultations: consultations.filter(c => c.status === 'scheduled').length,
    averageSatisfaction: clients.length > 0 
      ? (clients.reduce((sum, c) => sum + c.progress.satisfaction, 0) / clients.length).toFixed(1)
      : '0.0',
  }), [clients, consultations]);

  // Memoize render functions to prevent unnecessary re-renders
  const renderClient = useCallback(({ item }: { item: Client }) => (
    <Card style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientDetails}>
            {item.age}y, {item.gender} • {item.currentWeight}kg → {item.targetWeight}kg
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>-{item.progress.weightLoss}kg</Text>
        </View>
      </View>
      
      <View style={styles.clientStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.progress.adherence}%</Text>
          <Text style={styles.statLabel}>Adherence</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.progress.satisfaction}</Text>
          <Text style={styles.statLabel}>Satisfaction</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.healthConditions.length}</Text>
          <Text style={styles.statLabel}>Conditions</Text>
        </View>
      </View>

      <View style={styles.clientActions}>
        <Button
          title="View Details"
          onPress={() => log.debug('View client details', { clientId: item.id })}
          size="small"
          variant="outline"
        />
        <Button
          title="Schedule Call"
          onPress={() => log.debug('Schedule consultation', { clientId: item.id })}
          size="small"
          variant="primary"
        />
      </View>
    </Card>
  ), []);

  const renderConsultation = useCallback(({ item }: { item: Consultation }) => (
    <Card style={styles.consultationCard}>
      <View style={styles.consultationHeader}>
        <View style={styles.consultationInfo}>
          <Text style={styles.consultationClient}>{item.clientName}</Text>
          <Text style={styles.consultationType}>{item.type.replace('-', ' ').toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.consultationDetails}>
        <Text style={styles.consultationDate}>{item.date} at {item.time}</Text>
        <Text style={styles.consultationDuration}>{item.duration} minutes</Text>
      </View>

      <View style={styles.consultationActions}>
        <Button
          title="View Details"
          onPress={() => log.debug('View consultation', { consultationId: item.id })}
          size="small"
          variant="outline"
        />
        {item.status === 'scheduled' && (
          <Button
            title="Start Call"
            onPress={() => log.debug('Start consultation', { consultationId: item.id })}
            size="small"
            variant="primary"
          />
        )}
      </View>
    </Card>
  ), []);

  // Memoize status color function
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'scheduled': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  }, []);

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    await Promise.all([refetchClients(), refetchConsultations()]);
  }, [refetchClients, refetchConsultations]);

  const isRefreshing = isRefetchingClients || isRefetchingConsultations;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, Dr. {user?.name || 'Nutritionist'}</Text>
        <Text style={styles.subtitle}>Manage your clients and consultations</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeClients}</Text>
          <Text style={styles.statLabel}>Active Clients</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcomingConsultations}</Text>
          <Text style={styles.statLabel}>Upcoming Calls</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.averageSatisfaction}</Text>
          <Text style={styles.statLabel}>Avg. Rating</Text>
        </Card>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['overview', 'clients', 'consultations'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              selectedTab === tab && styles.tabButtonActive,
            ]}
            onPress={() => setSelectedTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedTab === tab }}
            accessibilityLabel={`${tab} tab`}
          >
            <Text
              style={[
                styles.tabButtonText,
                selectedTab === tab && styles.tabButtonTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {selectedTab === 'overview' && (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          <View>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <Button
                title="Add New Client"
                onPress={() => log.debug('Add new client clicked')}
                variant="primary"
              />
              <Button
                title="Schedule Consultation"
                onPress={() => log.debug('Schedule consultation clicked')}
                variant="outline"
              />
              <Button
                title="Create Meal Plan"
                onPress={() => log.debug('Create meal plan clicked')}
                variant="outline"
              />
              <Button
                title="View Reports"
                onPress={() => log.debug('View reports clicked')}
                variant="outline"
              />
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.activityCard}>
              <Text style={styles.activityText}>• Completed consultation with John Doe</Text>
              <Text style={styles.activityText}>• Updated meal plan for Jane Smith</Text>
              <Text style={styles.activityText}>• New client registration: Mike Johnson</Text>
            </Card>
          </View>
        </ScrollView>
      )}

      {selectedTab === 'clients' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>My Clients ({clients.length})</Text>
          {clients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No clients yet</Text>
              <Text style={styles.emptyStateSubtext}>Start by adding your first client</Text>
              <View style={styles.emptyStateButton}>
                <Button
                  title="Add New Client"
                  onPress={() => log.debug('Add new client clicked')}
                  variant="primary"
                  fullWidth
                />
              </View>
            </View>
          ) : (
            <FlatList
              data={clients}
              renderItem={renderClient}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefetchingClients} onRefresh={refetchClients} />
              }
            />
          )}
        </View>
      )}

      {selectedTab === 'consultations' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Upcoming Consultations</Text>
          {consultations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No upcoming consultations</Text>
              <Text style={styles.emptyStateSubtext}>Schedule a consultation to get started</Text>
              <View style={styles.emptyStateButton}>
                <Button
                  title="Schedule Consultation"
                  onPress={() => log.debug('Schedule consultation clicked')}
                  variant="primary"
                  fullWidth
                />
              </View>
            </View>
          ) : (
            <FlatList
              data={consultations}
              renderItem={renderConsultation}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefetchingConsultations} onRefresh={refetchConsultations} />
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tabButtonActive: {
    backgroundColor: '#2d5016',
    borderColor: '#2d5016',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
  },
  quickActions: {
    gap: 12,
    marginBottom: 24,
  },
  activityCard: {
    padding: 16,
    marginBottom: 20,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  clientCard: {
    marginBottom: 16,
    padding: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  clientDetails: {
    fontSize: 12,
    color: '#666',
  },
  progressBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  clientStats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  consultationCard: {
    marginBottom: 16,
    padding: 16,
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  consultationInfo: {
    flex: 1,
  },
  consultationClient: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  consultationDetails: {
    marginBottom: 12,
  },
  consultationDate: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  consultationDuration: {
    fontSize: 12,
    color: '#666',
  },
  consultationActions: {
    flexDirection: 'row',
    gap: 8,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyStateButton: {
    width: '100%',
    maxWidth: 300,
    marginTop: 8,
  },
});