import { Stack } from 'expo-router';

export default function KitchenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2d5016',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Kitchen Dashboard',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="order-details"
        options={{
          title: 'Order Details',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="queue"
        options={{
          title: 'Order Queue',
          headerShown: true,
        }}
      />
    </Stack>
  );
}