import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { safeFormatDate } from '../../src/lib/dateUtils';
import { useAuth } from '../../src/hooks/useAuth';
import Card from '../../src/components/ui/Card';
import Button from '../../src/components/ui/Button';
import { log } from '../../src/lib/logger';

const { width } = Dimensions.get('window');

interface ProgressData {
  date: string;
  weight: number;
  calories: number;
  protein: number;
  water: number;
  steps: number;
}

interface GoalData {
  weight: number;
  calories: number;
  protein: number;
  water: number;
  steps: number;
}

export default function TrackingScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  // Mock data - replace with actual API calls
  const { data: progressData = [] } = useQuery<ProgressData[]>({
    queryKey: ['progress', user?.id, selectedPeriod],
    queryFn: async () => {
      // Mock data for demonstration
      return [
        { date: '2024-01-01', weight: 70, calories: 1800, protein: 120, water: 2.5, steps: 8000 },
        { date: '2024-01-02', weight: 69.8, calories: 1750, protein: 115, water: 2.3, steps: 7500 },
        { date: '2024-01-03', weight: 69.5, calories: 1900, protein: 130, water: 2.8, steps: 9000 },
        { date: '2024-01-04', weight: 69.2, calories: 1650, protein: 110, water: 2.2, steps: 7000 },
        { date: '2024-01-05', weight: 69.0, calories: 2000, protein: 140, water: 3.0, steps: 10000 },
        { date: '2024-01-06', weight: 68.8, calories: 1850, protein: 125, water: 2.6, steps: 8500 },
        { date: '2024-01-07', weight: 68.5, calories: 1950, protein: 135, water: 2.9, steps: 9500 },
      ];
    },
  });

  const { data: goals = { weight: 65, calories: 2000, protein: 150, water: 3, steps: 10000 } } = useQuery<GoalData>({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      return { weight: 65, calories: 2000, protein: 150, water: 3, steps: 10000 };
    },
  });

  const currentData = progressData[progressData.length - 1] || {
    weight: 70,
    calories: 1800,
    protein: 120,
    water: 2.5,
    steps: 8000,
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#4CAF50';
    if (progress >= 60) return '#FF9800';
    return '#F44336';
  };

  const ProgressBar = ({ current, goal, label, unit, icon }: {
    current: number;
    goal: number;
    label: string;
    unit: string;
    icon: string;
  }) => {
    const progress = calculateProgress(current, goal);
    const color = getProgressColor(progress);

    return (
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressIcon}>{icon}</Text>
          <Text style={styles.progressLabel}>{label}</Text>
        </View>
        <View style={styles.progressContent}>
          <Text style={styles.progressValue}>
            {current}{unit} / {goal}{unit}
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
          </View>
          <Text style={[styles.progressPercentage, { color }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </Card>
    );
  };

  const StatCard = ({ title, value, change, icon }: {
    title: string;
    value: string;
    change: string;
    icon: string;
  }) => (
    <Card style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statChange}>{change}</Text>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Progress Tracking</Text>
        <Text style={styles.subtitle}>Monitor your health journey</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Current Weight"
          value={`${currentData.weight} kg`}
          change="-0.5 kg this week"
          icon="⚖️"
        />
        <StatCard
          title="BMI"
          value="22.5"
          change="Healthy range"
          icon="📊"
        />
        <StatCard
          title="Active Days"
          value="5/7"
          change="This week"
          icon="🏃"
        />
        <StatCard
          title="Streak"
          value="12 days"
          change="Personal best!"
          icon="🔥"
        />
      </View>

      {/* Progress Bars */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <ProgressBar
          current={currentData.calories}
          goal={goals.calories}
          label="Calories"
          unit=" cal"
          icon="🔥"
        />
        <ProgressBar
          current={currentData.protein}
          goal={goals.protein}
          label="Protein"
          unit=" g"
          icon="🥩"
        />
        <ProgressBar
          current={currentData.water}
          goal={goals.water}
          label="Water"
          unit=" L"
          icon="💧"
        />
        <ProgressBar
          current={currentData.steps}
          goal={goals.steps}
          label="Steps"
          unit=""
          icon="👟"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Button
            title="Log Weight"
            onPress={() => log.debug('Log weight clicked')}
            variant="outline"
            size="small"
          />
          <Button
            title="Add Meal"
            onPress={() => log.debug('Add meal clicked')}
            variant="outline"
            size="small"
          />
          <Button
            title="Log Water"
            onPress={() => log.debug('Log water clicked')}
            variant="outline"
            size="small"
          />
          <Button
            title="View History"
            onPress={() => log.debug('View history clicked')}
            variant="outline"
            size="small"
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {progressData.slice(-3).map((data) => (
          <Card key={data.date} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityDate}>
                {safeFormatDate(data.date)}
              </Text>
              <Text style={styles.activityWeight}>{data.weight} kg</Text>
            </View>
            <View style={styles.activityStats}>
              <Text style={styles.activityStat}>🔥 {data.calories} cal</Text>
              <Text style={styles.activityStat}>🥩 {data.protein}g protein</Text>
              <Text style={styles.activityStat}>💧 {data.water}L water</Text>
              <Text style={styles.activityStat}>👟 {data.steps} steps</Text>
            </View>
          </Card>
        ))}
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
  periodSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2d5016',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
  },
  progressCard: {
    marginBottom: 16,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressContent: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityCard: {
    marginBottom: 12,
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
  },
  activityWeight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  activityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  activityStat: {
    fontSize: 12,
    color: '#666',
  },
});
