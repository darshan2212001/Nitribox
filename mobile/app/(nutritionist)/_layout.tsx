import { Stack } from 'expo-router';

export default function NutritionistLayout() {
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
          title: 'Nutritionist Dashboard',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="clients"
        options={{
          title: 'My Clients',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="consultations"
        options={{
          title: 'Consultations',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="meal-plans"
        options={{
          title: 'Meal Plans',
          headerShown: true,
        }}
      />
    </Stack>
  );
}