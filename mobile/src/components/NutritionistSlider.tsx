import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { } = Dimensions.get('window');

interface Nutritionist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  reviewCount: number;
  image: string;
  consultationFee: number;
  availability: string;
}

interface NutritionistSliderProps {
  nutritionists: Nutritionist[];
  onConsult?: (nutritionistId: string) => void;
  onNutritionistSelect?: (nutritionist: any) => void;
}

export default function NutritionistSlider({ nutritionists, onConsult }: NutritionistSliderProps) {
  const handleConsultPress = (nutritionistId: string) => {
    if (onConsult) {
      onConsult(nutritionistId);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={12} color="#F59E0B" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#F59E0B" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#D1D5DB" />
      );
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expert Nutritionists</Text>
        <Text style={styles.subtitle}>Get personalized nutrition guidance</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {nutritionists.map((nutritionist) => (
          <View key={nutritionist.id} style={styles.nutritionistCard}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: nutritionist.image }}
                style={styles.nutritionistImage}
                resizeMode="cover"
              />
              <View style={styles.availabilityBadge}>
                <View style={[styles.availabilityDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.availabilityText}>Available</Text>
              </View>
            </View>

            <View style={styles.nutritionistInfo}>
              <Text style={styles.nutritionistName}>{nutritionist.name}</Text>
              <Text style={styles.specialization}>{nutritionist.specialization}</Text>
              <Text style={styles.experience}>{nutritionist.experience}</Text>

              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  {renderStars(nutritionist.rating)}
                </View>
                <Text style={styles.ratingText}>
                  {nutritionist.rating} ({nutritionist.reviewCount} reviews)
                </Text>
              </View>

              <View style={styles.feeContainer}>
                <Text style={styles.feeLabel}>Consultation Fee</Text>
                <Text style={styles.feeAmount}>₹{nutritionist.consultationFee}</Text>
              </View>

              <TouchableOpacity
                style={styles.consultButton}
                onPress={() => handleConsultPress(nutritionist.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.consultButtonText}>Book Consultation</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  nutritionistCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  nutritionistImage: {
    width: '100%',
    height: '100%',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  nutritionistInfo: {
    padding: 16,
  },
  nutritionistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 2,
  },
  experience: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  consultButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});