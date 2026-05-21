import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ClientDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'plans' | 'notes'>('overview');

  const clientData = {
    id: id as string,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91 98765 43210',
    age: 28,
    gender: 'Male',
    height: 175,
    weight: 75,
    targetWeight: 70,
    bmi: 24.5,
    healthGoals: ['Weight Loss', 'Muscle Gain'],
    medicalConditions: ['None'],
    allergies: ['Peanuts'],
    currentPlan: 'Weight Loss Plan',
    joinDate: '2024-01-01',
    lastConsultation: '2024-01-10',
    nextAppointment: '2024-01-20',
    progress: {
      weightHistory: [
        { date: '2024-01-01', weight: 78 },
        { date: '2024-01-05', weight: 77 },
        { date: '2024-01-10', weight: 75 },
      ],
      calorieHistory: [
        { date: '2024-01-15', consumed: 1200, goal: 1500 },
        { date: '2024-01-14', consumed: 1350, goal: 1500 },
        { date: '2024-01-13', consumed: 1100, goal: 1500 },
      ],
      waterIntake: [
        { date: '2024-01-15', glasses: 8, goal: 10 },
        { date: '2024-01-14', glasses: 6, goal: 10 },
        { date: '2024-01-13', glasses: 9, goal: 10 },
      ]
    },
    mealPlans: [
      {
        id: '1',
        name: 'Weight Loss Breakfast',
        calories: 400,
        protein: 25,
        carbs: 30,
        fat: 15,
        description: 'High protein breakfast with whole grains'
      },
      {
        id: '2',
        name: 'Weight Loss Lunch',
        calories: 450,
        protein: 35,
        carbs: 25,
        fat: 12,
        description: 'Balanced lunch with lean protein and vegetables'
      }
    ],
    notes: [
      {
        id: '1',
        date: '2024-01-10',
        content: 'Client showing good progress. Weight down 3kg in 10 days. Continue current plan.',
        type: 'progress'
      },
      {
        id: '2',
        date: '2024-01-05',
        content: 'Client mentioned feeling more energetic. No side effects from current meal plan.',
        type: 'feedback'
      }
    ]
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{clientData.age} years</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{clientData.gender}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height</Text>
            <Text style={styles.infoValue}>{clientData.height} cm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Weight</Text>
            <Text style={styles.infoValue}>{clientData.weight} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target Weight</Text>
            <Text style={styles.infoValue}>{clientData.targetWeight} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>BMI</Text>
            <Text style={styles.infoValue}>{clientData.bmi}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Health Goals</Text>
          <View style={styles.goalsContainer}>
            {clientData.healthGoals.map((goal, index) => (
              <View key={index} style={styles.goalTag}>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.infoLabel}>Medical Conditions</Text>
          <Text style={styles.infoValue}>{clientData.medicalConditions.join(', ')}</Text>
          
          <Text style={styles.infoLabel}>Allergies</Text>
          <Text style={styles.infoValue}>{clientData.allergies.join(', ')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Plan</Text>
        <View style={styles.infoCard}>
          <Text style={styles.planName}>{clientData.currentPlan}</Text>
          <Text style={styles.planDetails}>
            Started: {clientData.joinDate} | Last consultation: {clientData.lastConsultation}
          </Text>
          {clientData.nextAppointment && (
            <Text style={styles.nextAppointment}>
              Next appointment: {clientData.nextAppointment}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderProgress = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weight Progress</Text>
        <View style={styles.progressCard}>
          {clientData.progress.weightHistory.map((entry, index) => (
            <View key={index} style={styles.progressEntry}>
              <Text style={styles.progressDate}>{entry.date}</Text>
              <Text style={styles.progressValue}>{entry.weight} kg</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calorie Intake</Text>
        <View style={styles.progressCard}>
          {clientData.progress.calorieHistory.map((entry, index) => (
            <View key={index} style={styles.progressEntry}>
              <Text style={styles.progressDate}>{entry.date}</Text>
              <Text style={styles.progressValue}>
                {entry.consumed}/{entry.goal} cal
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(entry.consumed / entry.goal) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Water Intake</Text>
        <View style={styles.progressCard}>
          {clientData.progress.waterIntake.map((entry, index) => (
            <View key={index} style={styles.progressEntry}>
              <Text style={styles.progressDate}>{entry.date}</Text>
              <Text style={styles.progressValue}>
                {entry.glasses}/{entry.goal} glasses
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPlans = () => (
    <View style={styles.tabContent}>
      {clientData.mealPlans.map((plan) => (
        <View key={plan.id} style={styles.planCard}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planDescription}>{plan.description}</Text>
          
          <View style={styles.nutritionInfo}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>{plan.calories}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{plan.protein}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>{plan.carbs}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>{plan.fat}g</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderNotes = () => (
    <View style={styles.tabContent}>
      {clientData.notes.map((note) => (
        <View key={note.id} style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteDate}>{note.date}</Text>
            <View style={[
              styles.noteType, 
              { backgroundColor: note.type === 'progress' ? '#4CAF50' : '#2196F3' }
            ]}>
              <Text style={styles.noteTypeText}>{note.type}</Text>
            </View>
          </View>
          <Text style={styles.noteContent}>{note.content}</Text>
        </View>
      ))}
      
      <TouchableOpacity style={styles.addNoteButton}>
        <Text style={styles.addNoteText}>+ Add New Note</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Client Header */}
      <View style={styles.header}>
        <Text style={styles.clientName}>{clientData.name}</Text>
        <Text style={styles.clientEmail}>{clientData.email}</Text>
        <Text style={styles.clientPhone}>{clientData.phone}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['overview', 'progress', 'plans', 'notes'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'progress' && renderProgress()}
        {activeTab === 'plans' && renderPlans()}
        {activeTab === 'notes' && renderNotes()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.consultButton}
          onPress={() => router.push(`/(nutritionist)/consultation?clientId=${id}`)}
        >
          <Text style={styles.consultButtonText}>Start Consultation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 16,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2d5016',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2d5016',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  goalTag: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  goalText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 4,
  },
  planDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nextAppointment: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressDate: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
  },
  noteType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteTypeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  noteContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  addNoteButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#2d5016',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addNoteText: {
    fontSize: 16,
    color: '#2d5016',
    fontWeight: '600',
  },
  actionContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  consultButton: {
    backgroundColor: '#2d5016',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  consultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
