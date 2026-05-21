import type { ReactNode } from 'react';
import { Children } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface ResponsiveContainerProps {
  children: ReactNode;
  padding?: number;
  maxWidth?: number;
}

export default function ResponsiveContainer({ 
  children, 
  padding = 16,
  maxWidth = 1200 
}: ResponsiveContainerProps) {
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  
  const containerStyle = [
    styles.container,
    {
      paddingHorizontal: isTablet ? padding * 2 : padding,
      maxWidth: isDesktop ? maxWidth : undefined,
    }
  ];

  return (
    <View style={containerStyle}>
      {children as any}
    </View>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: number;
  gap?: number;
}

export function ResponsiveGrid({ 
  children, 
  columns = 2,
  gap = 16 
}: ResponsiveGridProps) {
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  
  const actualColumns = isDesktop ? Math.min(columns + 1, 4) : 
                       isTablet ? Math.min(columns, 3) : 
                       Math.min(columns, 2);

  const itemWidth = (width - (gap * (actualColumns + 1))) / actualColumns;

  return (
    <View style={[styles.grid, { gap }]}>
      {Children.map(children, (child, index) => (
        <View key={index} style={[styles.gridItem, { width: itemWidth }]}>
          {child as any}
        </View>
      ))}
    </View>
  );
}

interface ResponsiveTextProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  style?: any;
}

export function ResponsiveText({ 
  children, 
  variant = 'body',
  style 
}: ResponsiveTextProps) {
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  
  const getFontSize = () => {
    const baseSizes = {
      h1: 32,
      h2: 24,
      h3: 20,
      body: 16,
      caption: 14,
    };
    
    const baseSize = baseSizes[variant];
    
    if (isDesktop) return baseSize * 1.2;
    if (isTablet) return baseSize * 1.1;
    return baseSize;
  };

  const getFontWeight = () => {
    switch (variant) {
      case 'h1':
      case 'h2':
        return 'bold';
      case 'h3':
        return '600';
      default:
        return 'normal';
    }
  };

  return (
    <Text style={[
      styles.text,
      {
        fontSize: getFontSize(),
        fontWeight: getFontWeight(),
      },
      style
    ]}>
      {children as any}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: 16,
  },
  text: {
    color: '#1F2937',
  },
});
