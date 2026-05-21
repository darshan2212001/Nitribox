import { Stack } from 'expo-router';

export default function DeliveryLayout() {
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
          title: 'Delivery Dashboard',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: 'My Orders',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="tracking"
        options={{
          title: 'Live Tracking',
          headerShown: true,
        }}
      />
    </Stack>
  );
}