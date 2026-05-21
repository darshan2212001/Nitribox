// Type definitions for ZyaeL NutriBox Mobile App
export interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  mealPlan: string;
  status: "pending" | "preparing" | "ready" | "completed";
  priority: "low" | "medium" | "high";
  estimatedTime: number;
  items: string[];
  createdAt: string;
}

export interface DeliveryOrder {
  id: string;
  orderId?: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  mealType: string;
  quantity?: number;
  status: "assigned" | "picked_up" | "in_transit" | "delivered";
  priority?: "low" | "medium" | "high";
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  distance?: number;
  deliveryFee?: number;
  specialInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  currentLocation?: {
    latitude: string | number;
    longitude: string | number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  lastLogin: string;
  createdAt: string;
}

export interface SystemAlert {
  id: string;
  type: "warning" | "info" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  weightStart: number;
  weightGoal: number;
  currentWeight: number;
  height: number;
  bmi: number;
  goal: string;
  lastSession: string;
  nextSession: string;
  progress: number;
  status: "completed" | "active" | "inactive";
}

export interface Session {
  id: string;
  clientId: string;
  clientName: string;
  type: "consultation" | "follow-up" | "assessment";
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string;
}

export interface Nutritionist {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  image: string;
  price: string;
  available: boolean;
  reviewCount: number;
  consultationFee: number;
  availability: 'available' | 'unavailable';
}

export interface HealthGoalsCategoryProps {
  goals: Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    description: string;
  }>;
  selectedGoal: number;
  onGoalSelect: (goal: any) => void;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface NotificationTriggerInput {
  type: string;
  seconds?: number;
}

export interface TimeIntervalTriggerInput extends NotificationTriggerInput {
  type: "timeInterval";
  seconds: number;
}

// Icon props for tab layout
export interface IconProps {
  color: string;
  size: number;
}