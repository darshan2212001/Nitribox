import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';


interface PromotionalBannerProps {
  autoRotateInterval?: number;
  onBannerClick?: (bannerId: string) => void;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  backgroundColor: string[];
  icon: string;
  discount?: string;
}

export default function PromotionalBanner({ 
  autoRotateInterval = 4000, 
  onBannerClick 
}: PromotionalBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners: Banner[] = [
    {
      id: 'new-user',
      title: 'Welcome Offer!',
      subtitle: 'Get 20% off on your first order',
      ctaText: 'Claim Now',
      backgroundColor: ['#10B981', '#059669'],
      icon: 'gift',
      discount: '20% OFF',
    },
    {
      id: 'subscription',
      title: 'Monthly Plan',
      subtitle: 'Save up to ₹500 with our subscription',
      ctaText: 'Subscribe',
      backgroundColor: ['#3B82F6', '#2563EB'],
      icon: 'calendar',
      discount: 'Save ₹500',
    },
    {
      id: 'referral',
      title: 'Refer & Earn',
      subtitle: 'Get ₹200 for each successful referral',
      ctaText: 'Refer Now',
      backgroundColor: ['#8B5CF6', '#7C3AED'],
      icon: 'people',
      discount: '₹200',
    },
  ];

  useEffect(() => {
    if (autoRotateInterval > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === banners.length - 1 ? 0 : prevIndex + 1
        );
      }, autoRotateInterval);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRotateInterval, banners.length]);

  const currentBanner = banners[currentIndex];

  const handleBannerPress = () => {
    if (onBannerClick) {
      onBannerClick(currentBanner.id);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.banner}
        onPress={handleBannerPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={currentBanner.backgroundColor as [string, string]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.bannerContent}>
            <View style={styles.textContainer}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{currentBanner.discount}</Text>
              </View>
              <Text style={styles.bannerTitle}>{currentBanner.title}</Text>
              <Text style={styles.bannerSubtitle}>{currentBanner.subtitle}</Text>
              <View style={styles.ctaContainer}>
                <Text style={styles.ctaText}>{currentBanner.ctaText}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </View>
            <View style={styles.iconContainer}>
              <Ionicons name={currentBanner.icon as any} size={48} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    padding: 20,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 18,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  activeDot: {
    backgroundColor: '#6B7280',
    width: 12,
  },
});
