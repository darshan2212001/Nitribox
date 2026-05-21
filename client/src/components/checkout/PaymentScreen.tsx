import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CreditCard, Smartphone, Building2, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PaymentScreenProps {
  checkoutId: string;
  subscriptionId?: string;
  mealPlanId: string;
  onPaymentSuccess?: (paymentId: string) => void;
  onBack?: () => void;
}

export default function PaymentScreen({
  checkoutId,
  subscriptionId,
  mealPlanId,
  onPaymentSuccess,
  onBack,
}: PaymentScreenProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [couponCode, setCouponCode] = useState("");
  const [enableAutoRenewal, setEnableAutoRenewal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Fetch meal plan details
  const { data: mealPlan } = useQuery({
    queryKey: [`/api/meal-plans/${mealPlanId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!mealPlanId,
  });

  // Fetch subscription details if available
  const { data: subscription } = useQuery({
    queryKey: [`/api/subscriptions/${subscriptionId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!subscriptionId,
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create payment record - API returns camelCase, but support both formats
      const planCurrentPrice = mealPlan ? ((mealPlan as any).currentPrice || (mealPlan as any).current_price) : 0;
      const planOriginalPrice = mealPlan ? ((mealPlan as any).originalPrice || (mealPlan as any).original_price) : 0;
      const planPrice = planCurrentPrice || planOriginalPrice || 0;
      const paymentData = {
        subscription_id: subscriptionId,
        amount_cents: Math.round(planPrice * 100), // Convert to cents
        currency: "INR",
        payment_method: paymentMethod,
        metadata: {
          checkout_id: checkoutId,
          coupon_code: couponCode || null,
          auto_renewal: enableAutoRenewal,
        },
      };

      const res = await apiRequest("POST", "/api/payments", paymentData);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Payment processing failed");
      }
      
      const paymentResult = await res.json();
      setPaymentId(paymentResult.id);
      
      // Update subscription payment status if subscription exists
      if (subscriptionId) {
        const updateRes = await apiRequest("PATCH", `/api/subscriptions/${subscriptionId}`, {
          payment_status: "completed",
        });
        if (!updateRes.ok) {
          console.warn("Failed to update subscription payment status");
        }
      }
      
      return paymentResult;
    },
    onSuccess: (data) => {
      setPaymentSuccess(true);
      toast({
        title: "Payment Successful!",
        description: "Your Zyael NutriBox plan is now active.",
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again or use a different payment method",
        variant: "destructive",
      });
    },
  });

  const handlePayment = () => {
    processPaymentMutation.mutate();
  };

  const handleGoToPlan = () => {
    if (onPaymentSuccess && paymentId) {
      onPaymentSuccess(paymentId);
    } else {
      navigate("/dashboard");
    }
  };

  const handleViewConsultation = () => {
    navigate("/consultations");
  };

  // Calculate price with fallback - API returns camelCase, but support both formats
  const currentPrice = mealPlan ? ((mealPlan as any).currentPrice || (mealPlan as any).current_price) : 0;
  const originalPrice = mealPlan ? ((mealPlan as any).originalPrice || (mealPlan as any).original_price) : 0;
  const totalAmount = currentPrice || originalPrice || 0;
  const discountAmount = 0; // TODO: Calculate from coupon code
  const finalAmount = totalAmount - discountAmount;

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground">
                  Your Zyael NutriBox plan is now active.
                </p>
              </div>
              <div className="space-y-3 pt-4">
                <Button onClick={handleGoToPlan} className="w-full" size="lg">
                  Go to My Plan
                </Button>
                <Button
                  onClick={handleViewConsultation}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  View Consultation Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Complete Payment</h1>
            <p className="text-sm text-muted-foreground">
              Secure payment powered by our payment gateway
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Order Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-medium">{mealPlan?.title || "Meal Plan"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">30 days</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{totalAmount.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>₹{finalAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="card" id="payment-card" />
                      <Label htmlFor="payment-card" className="flex-1 cursor-pointer flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <div className="font-medium">Credit/Debit Card</div>
                          <div className="text-xs text-muted-foreground">Visa, Mastercard, RuPay</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="upi" id="payment-upi" />
                      <Label htmlFor="payment-upi" className="flex-1 cursor-pointer flex items-center gap-3">
                        <Smartphone className="h-5 w-5" />
                        <div>
                          <div className="font-medium">UPI</div>
                          <div className="text-xs text-muted-foreground">Google Pay, PhonePe, Paytm</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="netbanking" id="payment-netbanking" />
                      <Label htmlFor="payment-netbanking" className="flex-1 cursor-pointer flex items-center gap-3">
                        <Building2 className="h-5 w-5" />
                        <div>
                          <div className="font-medium">Net Banking</div>
                          <div className="text-xs text-muted-foreground">All major banks</div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Coupon Code */}
            <Card>
              <CardHeader>
                <CardTitle>Apply Coupon / Referral Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <Button variant="outline" disabled>
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Coupon code validation will be implemented with payment gateway integration
                </p>
              </CardContent>
            </Card>

            {/* Auto Renewal Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-renewal" className="text-base font-medium">
                      Enable Auto-Renewal
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically renew your subscription at the end of the billing period
                    </p>
                  </div>
                  <Switch
                    id="auto-renewal"
                    checked={enableAutoRenewal}
                    onCheckedChange={setEnableAutoRenewal}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={isProcessing || processPaymentMutation.isPending}
              className="w-full"
              size="lg"
            >
              {isProcessing || processPaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay ₹{finalAmount.toLocaleString()}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              🔒 Your payment is secure and encrypted. This is a mock payment for development purposes.
            </p>
          </div>

          {/* Sidebar - Order Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Price:</span>
                    <span className="font-medium">₹{totalAmount.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Payable:</span>
                    <span>₹{finalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's Included</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Fresh meals delivered daily</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Nutritionist consultation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Progress tracking dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>24/7 support</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

