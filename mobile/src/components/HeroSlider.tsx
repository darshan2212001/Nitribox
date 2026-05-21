import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';


interface Slide {
  id: number;
  title: string;
  subtitle: string;
  ctaText: string;
  backgroundImage?: string;
  backgroundColor?: string;
}

interface HeroSliderProps {
  slides: Slide[];
  autoRotateInterval?: number;
  onCtaClick?: (slideId: number) => void;
}

export default function HeroSlider({ 
  slides, 
  autoRotateInterval = 5000, 
  onCtaClick 
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (autoRotateInterval > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === slides.length - 1 ? 0 : prevIndex + 1
        );
      }, autoRotateInterval);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRotateInterval, slides.length]);

  const handleCtaPress = () => {
    if (onCtaClick) {
      onCtaClick(slides[currentIndex].id);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.sliderContainer}>
        <View style={[
          styles.slide,
          { backgroundColor: currentSlide.backgroundColor || '#10B981' }
        ]}>
          {currentSlide.backgroundImage && (
            <Image 
              source={{ uri: currentSlide.backgroundImage }} 
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.slideContent}>
            <Text style={styles.slideTitle}>{currentSlide.title}</Text>
            <Text style={styles.slideSubtitle}>{currentSlide.subtitle}</Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={handleCtaPress}
            >
              <Text style={styles.ctaText}>{currentSlide.ctaText}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot
            ]}
            onPress={() => goToSlide(index)}
          />
        ))}
      </View>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={() => goToSlide(currentIndex === 0 ? slides.length - 1 : currentIndex - 1)}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={() => goToSlide(currentIndex === slides.length - 1 ? 0 : currentIndex + 1)}
          >
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 24,
  },
  sliderContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  slideSubtitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 12,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
});