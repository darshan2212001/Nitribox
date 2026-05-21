import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: number;
  currency: string;
  mealsPerDay: number;
  deliveryDays: string[];
  nextBillingDate?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // in days
  mealsPerDay: number;
  deliveryDays: string[];
  features: string[];
  popular?: boolean;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  churnRate: number;
}

export function useSubscriptions(userId?: string) {
  const queryClient = useQueryClient();

  // Fetch user's subscriptions
  const { data: subscriptions = [], isLoading, error } = useQuery<Subscription[]>({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      const response = await fetch(`/api/subscriptions${userId ? `?userId=${userId}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch available subscription plans
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription-plans');
      if (!response.ok) throw new Error('Failed to fetch subscription plans');
      return response.json();
    },
  });

  // Create new subscription
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: {
      planId: string;
      userId: string;
      paymentMethodId: string;
    }) => {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  // Update subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Subscription> }) => {
      const response = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  // Cancel subscription
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to cancel subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  // Pause subscription
  const pauseSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, pauseUntil }: { subscriptionId: string; pauseUntil: string }) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pauseUntil }),
      });
      if (!response.ok) throw new Error('Failed to pause subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  // Resume subscription
  const resumeSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resume subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  return {
    subscriptions,
    plans,
    isLoading,
    error,
    createSubscription: createSubscriptionMutation.mutate,
    updateSubscription: updateSubscriptionMutation.mutate,
    cancelSubscription: cancelSubscriptionMutation.mutate,
    pauseSubscription: pauseSubscriptionMutation.mutate,
    resumeSubscription: resumeSubscriptionMutation.mutate,
    isCreating: createSubscriptionMutation.isPending,
    isUpdating: updateSubscriptionMutation.isPending,
    isCancelling: cancelSubscriptionMutation.isPending,
    isPausing: pauseSubscriptionMutation.isPending,
    isResuming: resumeSubscriptionMutation.isPending,
  };
}

export function useSubscriptionStats() {
  const { data: stats, isLoading, error } = useQuery<SubscriptionStats>({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions/stats');
      if (!response.ok) throw new Error('Failed to fetch subscription stats');
      return response.json();
    },
  });

  return { stats, isLoading, error };
}

export function useSubscriptionBilling(subscriptionId: string) {
  const { data: billingHistory = [], isLoading, error } = useQuery({
    queryKey: ['subscription-billing', subscriptionId],
    queryFn: async () => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/billing`);
      if (!response.ok) throw new Error('Failed to fetch billing history');
      return response.json();
    },
    enabled: !!subscriptionId,
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/payment-method`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      });
      if (!response.ok) throw new Error('Failed to update payment method');
      return response.json();
    },
  });

  return {
    billingHistory,
    isLoading,
    error,
    updatePaymentMethod: updatePaymentMethodMutation.mutate,
    isUpdatingPaymentMethod: updatePaymentMethodMutation.isPending,
  };
}

// Hook for subscription analytics
export function useSubscriptionAnalytics() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions/analytics');
      if (!response.ok) throw new Error('Failed to fetch subscription analytics');
      return response.json();
    },
  });

  return { analytics, isLoading, error };
}
