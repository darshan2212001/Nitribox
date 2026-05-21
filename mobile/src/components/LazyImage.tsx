import { useState, useCallback } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, ImageStyle } from 'react-native';

interface LazyImageProps {
  source: { uri: string };
  style?: ImageStyle;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export default function LazyImage({
  source,
  style,
  placeholder,
  onLoad,
  onError,
  resizeMode = 'cover',
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="#2d5016" />
        </View>
      )}
      
      {!hasError && (
        <Image
          source={source}
          style={[styles.image, style]}
          onLoad={handleLoad}
          onError={handleError}
          resizeMode={resizeMode}
        />
      )}
      
      {hasError && (
        <View style={styles.errorContainer}>
          <Image
            source={{ uri: placeholder || 'https://via.placeholder.com/150' }}
            style={[styles.image, style]}
            resizeMode={resizeMode}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
  },
});
