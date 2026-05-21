import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import CheckoutWizard from "@/components/checkout/CheckoutWizard";
import MockPaymentGateway from "@/components/MockPaymentGateway";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CheckoutPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentData, setPaymentData] = useState<any>(null);

  // Get meal plan ID from URL params
  useEffect(() => {
    // Get query params from current URL - this works even with SPA navigation
    const params = new URLSearchParams(window.location.search);
    const planId = params.get("planId");
    
    if (planId && planId !== mealPlanId) {
      setMealPlanId(planId);
    } else if (!planId && !mealPlanId) {
      // Only redirect if we're sure there's no plan ID after a brief delay
      const timer = setTimeout(() => {
        setLocation("/client?tab=cart");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location, setLocation, mealPlanId]); // React to location and mealPlanId changes

  // Fetch meal plan details
  const { data: mealPlan } = useQuery({
    queryKey: [`/api/meal-plans/${mealPlanId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!mealPlanId,
  });

  useEffect(() => {
    if (mealPlan) {
      // API returns camelCase due to alias_generator, but support both formats for compatibility
      const currentPrice = (mealPlan as any).currentPrice || (mealPlan as any).current_price;
      const originalPrice = (mealPlan as any).originalPrice || (mealPlan as any).original_price;
      const price = currentPrice || originalPrice || 0;
      setTotalAmount(price);
    }
  }, [mealPlan]);

  const handleCheckoutComplete = (completedCheckoutId: string, subscriptionIdFromCheckout?: string) => {
    setCheckoutId(completedCheckoutId);
    if (subscriptionIdFromCheckout) {
      setSubscriptionId(subscriptionIdFromCheckout);
    }
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      if (!user?.id || !subscriptionId) {
        toast({
          title: "Error",
          description: "Unable to process payment. Subscription ID is missing. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setPaymentData(paymentData);

      // Create payment record with all payment details
      // Use subscription_id from checkout completion, not checkoutId
      await apiRequest("POST", "/api/payments", {
        subscription_id: subscriptionId,
        amount: paymentData.amount || totalAmount,
        payment_method: paymentData.method || "card",
        currency: "INR",
        transaction_id: paymentData.transactionId,
        subscription_enabled: paymentData.subscription || false,
        coupon_code: paymentData.couponCode || null,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });

      toast({
        title: "Payment Successful!",
        description: "Your subscription has been created and is awaiting nutritionist allocation.",
      });

      // Redirect to client portal with consultation scheduling flag
      // This will trigger the appointment booking modal to open
      setLocation("/client?tab=orders&scheduleConsultation=true");
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Payment was successful but subscription creation failed.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentFailure = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Show loading while waiting for mealPlanId
  if (!mealPlanId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Show payment gateway when payment screen is active
  if (showPayment) {
    return (
      <div className="min-h-screen bg-background">
        <MockPaymentGateway
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          totalAmount={totalAmount}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
        />
      </div>
    );
  }

  // Render checkout wizard
  return (
    <div className="min-h-screen bg-background">
      <CheckoutWizard
        mealPlanId={mealPlanId}
        mealPlanTitle={mealPlan?.title}
        mealPlanCategory={mealPlan?.category}
        onComplete={handleCheckoutComplete}
        onCancel={() => setLocation("/client?tab=cart")}
      />
    </div>
  );
}

