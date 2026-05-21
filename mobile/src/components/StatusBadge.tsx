import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBadgeProps {
  status: string;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  customColor?: string;
}

export default function StatusBadge({
  status,
  type = 'default',
  size = 'medium',
  showIcon = false,
  customColor,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (customColor) {
      return {
        color: customColor,
        backgroundColor: `${customColor}20`,
        icon: 'circle' as keyof typeof Ionicons.glyphMap,
      };
    }

    switch (type) {
      case 'success':
        return {
          color: '#10B981',
          backgroundColor: '#D1FAE5',
          icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
        };
      case 'warning':
        return {
          color: '#F59E0B',
          backgroundColor: '#FEF3C7',
          icon: 'warning' as keyof typeof Ionicons.glyphMap,
        };
      case 'error':
        return {
          color: '#EF4444',
          backgroundColor: '#FEE2E2',
          icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
        };
      case 'info':
        return {
          color: '#3B82F6',
          backgroundColor: '#DBEAFE',
          icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
        };
      default:
        return {
          color: '#6B7280',
          backgroundColor: '#F3F4F6',
          icon: 'circle' as keyof typeof Ionicons.glyphMap,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: 10,
          iconSize: 12,
        };
      case 'large':
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 14,
          iconSize: 16,
        };
      default: // medium
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 12,
          iconSize: 14,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: statusConfig.backgroundColor,
        paddingHorizontal: sizeConfig.paddingHorizontal,
        paddingVertical: sizeConfig.paddingVertical,
      }
    ]}>
      {showIcon && (
        <Ionicons
          name={statusConfig.icon}
          size={sizeConfig.iconSize}
          color={statusConfig.color}
          style={styles.icon}
        />
      )}
      <Text style={[
        styles.text,
        {
          color: statusConfig.color,
          fontSize: sizeConfig.fontSize,
        }
      ]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
});
