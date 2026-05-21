import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/hooks/useAuth';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { SessionTimeoutWarning } from '../src/components/SessionTimeoutWarning';
import { WebSocketInitializer } from '../src/components/WebSocketInitializer';
import { OfflineIndicator } from '../src/components/OfflineIndicator';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <OfflineIndicator />
              <WebSocketInitializer />
              <SessionTimeoutWarning />
              <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#10B981',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              />
              <StatusBar style="light" />
            </AuthProvider>
          </QueryClientProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
