import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for auth check

    // Determine the correct route based on authentication and user role
    if (!isAuthenticated) {
      // User is not logged in, redirect to login
      router.replace('/(auth)/login');
    } else if (user) {
      // User is logged in, redirect based on role
      switch (user.role) {
        case 'client':
          router.replace('/(tabs)');
          break;
        case 'kitchen':
          router.replace('/(kitchen)');
          break;
        case 'delivery':
          router.replace('/(delivery)');
          break;
        case 'nutritionist':
          router.replace('/(nutritionist)');
          break;
        case 'admin':
          router.replace('/(admin)');
          break;
        default:
          router.replace('/(auth)/login');
      }
    } else {
      // Fallback to login
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading screen while checking auth
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
