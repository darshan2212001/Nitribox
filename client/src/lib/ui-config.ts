import { Clock, ChefHat, Package, Truck, Home, CheckCircle, XCircle } from 'lucide-react';

// Shared status configuration for consistent UI across all components
export const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-muted text-muted-foreground',
    progress: 0,
    description: 'Waiting for kitchen to start preparation'
  },
  preparing: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'bg-primary/10 text-primary',
    progress: 25,
    description: 'Your meal is being prepared in the kitchen'
  },
  packed: {
    label: 'Packed',
    icon: Package,
    color: 'bg-accent text-accent-foreground',
    progress: 50,
    description: 'Meal is packed and ready for delivery'
  },
  assigned: {
    label: 'Assigned',
    icon: Truck,
    color: 'bg-secondary text-secondary-foreground',
    progress: 60,
    description: 'Delivery agent has been assigned'
  },
  in_transit: {
    label: 'In Transit',
    icon: Truck,
    color: 'bg-primary/20 text-primary',
    progress: 80,
    description: 'Your meal is out for delivery'
  },
  delivered: {
    label: 'Delivered',
    icon: Home,
    color: 'bg-emerald-100 text-emerald-800',
    progress: 100,
    description: 'Your meal has been delivered'
  },
  consumed: {
    label: 'Consumed',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
    progress: 100,
    description: 'Meal has been consumed'
  },
  skipped: {
    label: 'Skipped',
    icon: XCircle,
    color: 'bg-destructive/10 text-destructive',
    progress: 0,
    description: 'Meal was skipped'
  }
};

// Meal type configuration for consistent styling
export const mealTypeConfig = {
  breakfast: {
    label: 'Breakfast',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    time: '7:00 AM'
  },
  lunch: {
    label: 'Lunch',
    icon: ChefHat,
    color: 'bg-yellow-100 text-yellow-800',
    time: '12:00 PM'
  },
  dinner: {
    label: 'Dinner',
    icon: Home,
    color: 'bg-purple-100 text-purple-800',
    time: '7:00 PM'
  }
};

// Portal theme configuration for consistent headers
export const portalThemes = {
  client: {
    gradient: 'bg-gradient-to-r from-primary via-primary/90 to-primary/80',
    title: 'Client Portal',
    subtitle: 'Track your nutrition journey',
    headerHeight: 'py-6 md:py-8 lg:py-10'
  },
  nutritionist: {
    gradient: 'bg-gradient-to-r from-primary via-primary/90 to-primary/80',
    title: 'Nutritionist Dashboard',
    subtitle: 'Manage your clients and track their progress',
    headerHeight: 'py-6 md:py-8 lg:py-10'
  },
  kitchen: {
    gradient: 'bg-gradient-to-r from-red-600 via-red-550 to-red-500',
    title: 'Cloud Kitchen Dashboard',
    subtitle: 'Manage orders and coordinate with delivery',
    headerHeight: 'py-6 md:py-8 lg:py-10'
  },
  delivery: {
    gradient: 'bg-gradient-to-r from-orange-600 via-orange-550 to-orange-500',
    title: 'Delivery Dashboard',
    subtitle: 'Navigate, track & complete deliveries',
    headerHeight: 'py-6 md:py-8 lg:py-10'
  },
  admin: {
    gradient: 'bg-gradient-to-r from-slate-700 via-slate-650 to-slate-600',
    title: 'Admin Dashboard',
    subtitle: 'Monitor system performance and operations',
    headerHeight: 'py-6 md:py-8 lg:py-10'
  }
};
