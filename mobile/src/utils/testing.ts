import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock implementations will be added when testing is needed

// Test utilities
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  );
};

// Custom render function will be implemented when testing is needed

// Mock data generators
export const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  phone: '+91 9876543210',
  role: 'client',
};

export const mockMealPlan = {
  id: 1,
  name: 'Weight Loss Plan',
  price: 2999,
  duration: 30,
  description: 'Personalized weight loss meals',
  features: ['1200-1500 calories/day', 'Low carb options', 'Nutritionist support'],
};

export const mockOrder = {
  id: 1,
  orderNumber: '#NB001',
  status: 'preparing',
  items: ['Weight Loss Plan - Lunch', 'Weight Loss Plan - Dinner'],
  total: 299,
  date: 'Today, 2:30 PM',
  estimatedDelivery: '4:30 PM',
};

export const mockNutritionist = {
  id: 1,
  name: 'Dr. Priya Sharma',
  specialization: 'Weight Management',
  experience: '8 years experience',
  rating: 4.9,
  price: '₹500/session',
  available: true,
};

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiResponse = (data: any, delay = 0) => {
  return new Promise(resolve => {
    setTimeout(() => resolve({ data }), delay);
  });
};

export const mockApiError = (message: string, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
};

// Navigation testing helpers
export const mockNavigation = {
  navigate: () => {},
  goBack: () => {},
  reset: () => {},
  setParams: () => {},
  dispatch: () => {},
  canGoBack: () => true,
  isFocused: () => true,
  addListener: () => {},
  removeListener: () => {},
};

export const mockRoute = {
  key: 'test-route',
  name: 'TestScreen',
  params: {},
};