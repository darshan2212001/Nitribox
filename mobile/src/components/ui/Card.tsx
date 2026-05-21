import { View, StyleSheet, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: boolean;
  animated?: boolean;
  delay?: number;
}

export default function Card({
  children,
  style,
  padding = 16,
  margin = 0,
  shadow = true,
  animated: _animated = true,
  delay: _delay = 0,
}: CardProps) {
  const cardStyle: any[] = [
    styles.card,
    { padding, margin },
    shadow && styles.shadow,
    style,
  ].filter(Boolean);

  return <View style={cardStyle}>{children as any}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
