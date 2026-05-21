import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';

interface NutritionData {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

interface EnhancedTrackingProps {
  nutritionData?: NutritionData[];
  onDownloadReport?: () => void;
  onAddWeight?: (weight: number) => void;
}

export default function EnhancedTracking({ 
  nutritionData = [],
  onDownloadReport,
  onAddWeight 
}: EnhancedTrackingProps) {
  const [activeTab, setActiveTab] = useState('daily');
  const [waterIntake, setWaterIntake] = useState(6);
  const [newWeight, setNewWeight] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Default nutrition data if none provided
  const defaultNutritionData: NutritionData[] = [
    { label: 'Calories', current: 1200, target: 1800, unit: 'kcal', color: '#10B981' },
    { label: 'Protein', current: 45, target: 80, unit: 'g', color: '#3B82F6' },
    { label: 'Carbs', current: 120, target: 200, unit: 'g', color: '#F59E0B' },
    { label: 'Fat', current: 35, target: 60, unit: 'g', color: '#8B5CF6' },
    { label: 'Fiber', current: 15, target: 25, unit: 'g', color: '#059669' },
  ];

  const data = nutritionData.length > 0 ? nutritionData : defaultNutritionData;

  const handleAddWeight = () => {
    if (newWeight && onAddWeight) {
      const weight = parseFloat(newWeight);
      if (weight > 0) {
        onAddWeight(weight);
        setNewWeight('');
        setModalVisible(false);
        Alert.alert('Success', 'Weight added successfully!');
      } else {
        Alert.alert('Error', 'Please enter a valid weight');
      }
    }
  };

  const addWaterGlass = () => {
    setWaterIntake(prev => Math.min(prev + 1, 12));
  };

  const removeWaterGlass = () => {
    setWaterIntake(prev => Math.max(prev - 1, 0));
  };

  const waterGoal = 8;

  const renderNutritionProgress = () => (
    <View style={styles.nutritionContainer}>
      <Text style={styles.sectionTitle}>Nutrition Progress</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.nutritionItem}>
          <View style={styles.nutritionHeader}>
            <Text style={styles.nutritionLabel}>{item.label}</Text>
            <Text style={styles.nutritionValue}>
              {item.current}/{item.target} {item.unit}
            </Text>
          </View>
          <ProgressBar
            progress={(item.current / item.target) * 100}
            height={8}
            backgroundColor="#E5E7EB"
            progressColor={item.color}
          />
        </View>
      ))}
    </View>
  );

  const renderWaterIntake = () => (
    <View style={styles.waterContainer}>
      <Text style={styles.sectionTitle}>Water Intake</Text>
      <View style={styles.waterProgress}>
        <View style={styles.waterGlasses}>
          {Array.from({ length: 12 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.waterGlass,
                index < waterIntake && styles.filledGlass
              ]}
            />
          ))}
        </View>
        <View style={styles.waterControls}>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={removeWaterGlass}
            disabled={waterIntake === 0}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.waterText}>{waterIntake}/{waterGoal} glasses</Text>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={addWaterGlass}
            disabled={waterIntake === 12}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderWeightTracking = () => (
    <View style={styles.weightContainer}>
      <View style={styles.weightHeader}>
        <Text style={styles.sectionTitle}>Weight Tracking</Text>
        <TouchableOpacity
          style={styles.addWeightButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addWeightText}>Add Weight</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.weightChart}>
        <Text style={styles.weightChartText}>Weight tracking chart would go here</Text>
        <Text style={styles.weightChartSubtext}>Track your progress over time</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Track Your Progress</Text>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={onDownloadReport}
        >
          <Ionicons name="download" size={16} color="#6B7280" />
          <Text style={styles.downloadText}>Download Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['daily', 'weekly', 'monthly'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderNutritionProgress()}
        {renderWaterIntake()}
        {renderWeightTracking()}
      </ScrollView>

      {/* Add Weight Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Weight</Text>
            <TextInput
              style={styles.weightInput}
              placeholder="Enter weight (kg)"
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddWeight}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  downloadText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  nutritionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  nutritionItem: {
    marginBottom: 16,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  nutritionValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  waterContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  waterProgress: {
    alignItems: 'center',
  },
  waterGlasses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  waterGlass: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#fff',
  },
  filledGlass: {
    backgroundColor: '#3B82F6',
  },
  waterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  waterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  weightContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addWeightText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  weightChart: {
    height: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightChartText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  weightChartSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  weightInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
