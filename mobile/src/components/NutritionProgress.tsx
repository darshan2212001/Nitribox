import { View, Text, StyleSheet } from 'react-native';

interface NutritionProgressProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export default function NutritionProgress({
  calories,
  protein,
  carbs,
  fat,
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFat,
}: NutritionProgressProps) {
  const ProgressBar = ({ current, target, color, label }: {
    current: number;
    target: number;
    color: string;
    label: string;
  }) => {
    const percentage = Math.min((current / target) * 100, 100);
    
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>{current}g / {target}g</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Nutrition</Text>
      
      <View style={styles.caloriesContainer}>
        <Text style={styles.caloriesLabel}>Calories</Text>
        <Text style={styles.caloriesValue}>{calories} / {targetCalories}</Text>
        <View style={styles.caloriesProgressContainer}>
          <View style={[
            styles.caloriesProgressBar,
            { width: `${Math.min((calories / targetCalories) * 100, 100)}%` }
          ]} />
        </View>
      </View>
      
      <View style={styles.macrosContainer}>
        <ProgressBar
          current={protein}
          target={targetProtein}
          color="#4CAF50"
          label="Protein"
        />
        <ProgressBar
          current={carbs}
          target={targetCarbs}
          color="#2196F3"
          label="Carbs"
        />
        <ProgressBar
          current={fat}
          target={targetFat}
          color="#FF9800"
          label="Fat"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
  },
  caloriesContainer: {
    marginBottom: 20,
  },
  caloriesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  caloriesValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  caloriesProgressContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  caloriesProgressBar: {
    height: '100%',
    backgroundColor: '#2d5016',
  },
  macrosContainer: {
    gap: 12,
  },
  progressItem: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: '#333',
  },
  progressValue: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});
