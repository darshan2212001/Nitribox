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
import { useAuth } from '../../src/hooks/useAuth';
import apiClient from '../../src/lib/apiClient';
import { log } from '../../src/lib/logger';
import { mapConsultation } from '../../src/lib/apiMappers';
import { safeFormatDateTime } from '../../src/lib/dateUtils';

interface NutritionistPortalProps {
  onBackToRoles: () => void;
}

interface Client {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  weightStart: number;
  weightGoal: number;
  currentWeight: number;
  height: number;
  bmi: number;
  goal: string;
  lastSession: string;
  nextSession: string;
  progress: number;
  status: 'active' | 'inactive' | 'completed';
}

interface Session {
  id: string;
  clientId: string;
  clientName: string;
  type: 'consultation' | 'follow-up' | 'assessment';
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
}

export default function NutritionistPortal({ onBackToRoles }: NutritionistPortalProps) {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'clients' | 'sessions' | 'progress'>('clients');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch clients from API
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/clients');
        return (response.data || []).map((client: any) => {
          // Calculate BMI if weight and height available
          const bmi = client.weight && client.height 
            ? (client.weight / Math.pow(client.height / 100, 2))
            : 0;
          
          // Calculate progress (can be improved with actual progress tracking)
          const progress = client.weightStart && client.weightGoal
            ? Math.min(100, Math.max(0, ((client.weightStart - client.currentWeight) / (client.weightStart - client.weightGoal)) * 100))
            : 50;
          
          return {
            id: client.id,
            name: client.name || 'Unknown',
            email: client.email || '',
            age: client.age || 0,
            gender: client.gender || 'Unknown',
            weightStart: client.weightStart || 0,
            weightGoal: client.weightGoal || 0,
            currentWeight: client.currentWeight || client.weightStart || 0,
            height: client.height || 0,
            bmi: typeof bmi === 'string' ? parseFloat(bmi) : bmi,
            goal: client.goal || 'Health Improvement',
            lastSession: client.lastSession || '',
            nextSession: client.nextSession || '',
            progress: Math.round(progress),
            status: (client.status || 'active') as 'active' | 'inactive' | 'completed',
          };
        });
      } catch (err) {
        log.error('Error fetching clients', err);
        return [];
      }
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['/api/consultations', user?.id],
    queryFn: async () => {
      try {
        if (!user?.id) return [];
        // Get consultations for this nutritionist (use user.id from auth)
        const response = await apiClient.get(`/api/consultations/nutritionist/${user.id}`);
        // Transform API response using mapper
        return (response.data || []).map((consultation: any) => mapConsultation(consultation, clients));
      } catch (err) {
        log.error('Error fetching consultations', err);
        return [];
      }
    },
    enabled: clients.length > 0, // Wait for clients to load
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'inactive':
        return '#6B7280';
      case 'completed':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#F59E0B';
      case 'in-progress':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const handleClientAction = (clientId: string, action: string) => {
    log.debug(`${action} client`, { clientId });
  };

  const handleSessionAction = (sessionId: string, action: string) => {
    log.debug(`${action} session`, { sessionId });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderClient = ({ item }: { item: Client }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.name}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
          <Text style={styles.clientDetails}>
            {item.age}y, {item.gender} • BMI: {item.bmi.toFixed(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress: {item.goal}</Text>
          <Text style={styles.progressPercentage}>{item.progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
        </View>
        <Text style={styles.weightInfo}>
          {item.weightStart}kg → {item.currentWeight}kg (Goal: {item.weightGoal}kg)
        </Text>
      </View>

      <View style={styles.sessionInfo}>
        <View style={styles.sessionItem}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.sessionText}>Last: {item.lastSession}</Text>
        </View>
        <View style={styles.sessionItem}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.sessionText}>Next: {item.nextSession}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => handleClientAction(item.id, 'view')}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => handleClientAction(item.id, 'message')}
        >
          <Text style={styles.secondaryButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSession = ({ item }: { item: Session }) => (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionClientName}>{item.clientName}</Text>
          <Text style={styles.sessionType}>{item.type.replace('-', ' ').toUpperCase()}</Text>
          <Text style={styles.sessionTime}>
            {safeFormatDateTime(item.scheduledAt)}
          </Text>
        </View>
        <View style={[styles.sessionStatusBadge, { backgroundColor: getSessionStatusColor(item.status) }]}>
          <Text style={styles.sessionStatusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {item.notes && (
        <Text style={styles.sessionNotes}>{item.notes}</Text>
      )}

      <View style={styles.sessionFooter}>
        <Text style={styles.sessionDuration}>{item.duration} minutes</Text>
        <View style={styles.sessionActions}>
          {item.status === 'scheduled' && (
            <TouchableOpacity
              style={[styles.sessionActionButton, styles.startButton]}
              onPress={() => handleSessionAction(item.id, 'start')}
            >
              <Text style={styles.sessionActionText}>Start</Text>
            </TouchableOpacity>
          )}
          {item.status === 'in-progress' && (
            <TouchableOpacity
              style={[styles.sessionActionButton, styles.completeButton]}
              onPress={() => handleSessionAction(item.id, 'complete')}
            >
              <Text style={styles.sessionActionText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderProgressStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{clients.length}</Text>
        <Text style={styles.statLabel}>Total Clients</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{clients.filter((c: Client) => c.status === 'active').length}</Text>
        <Text style={styles.statLabel}>Active Clients</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{sessions.filter((s: Session) => s.status === 'scheduled').length}</Text>
        <Text style={styles.statLabel}>Upcoming Sessions</Text>
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
        <Text style={styles.headerTitle}>Nutritionist Portal</Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['clients', 'sessions', 'progress'] as const).map((tab) => (
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
      {selectedTab === 'progress' && renderProgressStats()}

      {selectedTab === 'clients' && (
        <FlatList
          data={clients}
          renderItem={renderClient}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No clients</Text>
              <Text style={styles.emptyStateText}>You don't have any clients assigned yet.</Text>
            </View>
          }
        />
      )}

      {selectedTab === 'sessions' && (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No sessions</Text>
              <Text style={styles.emptyStateText}>No sessions scheduled at the moment.</Text>
            </View>
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
    backgroundColor: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
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
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  clientCard: {
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
    color: '#1F2937',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientDetails: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  weightInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionClientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  sessionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  sessionNotes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  sessionActions: {
    flexDirection: 'row',
  },
  sessionActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  sessionActionText: {
    color: '#fff',
    fontSize: 12,
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
