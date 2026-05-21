import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Edit, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CheckoutSummaryProps {
  mealPlanId: string;
  mealPlanTitle?: string;
  formData: any;
  checkoutId: string;
  onEdit: (step: "health" | "timing" | "consultation") => void;
  onComplete: (checkoutId: string, subscriptionId?: string) => void;
}

export default function CheckoutSummary({
  mealPlanId,
  mealPlanTitle,
  formData,
  checkoutId,
  onEdit,
  onComplete,
}: CheckoutSummaryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discountCode, setDiscountCode] = useState("");
  const [editSection, setEditSection] = useState<string | null>(null);

  // Fetch meal plan details
  const { data: mealPlan, isLoading: isLoadingMealPlan, error: mealPlanError } = useQuery({
    queryKey: [`/api/meal-plans/${mealPlanId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!mealPlanId,
  });

  // Calculate price with fallback - use camelCase (API format), fallback to snake_case, then 0
  const planPrice = useMemo(() => {
    if (!mealPlan) return 0;
    // API returns camelCase due to alias_generator, but support both formats for compatibility
    const currentPrice = (mealPlan as any).currentPrice || (mealPlan as any).current_price;
    const originalPrice = (mealPlan as any).originalPrice || (mealPlan as any).original_price;
    const price = currentPrice || originalPrice || 0;
    // Debug log to help identify issues
    if (price === 0 && mealPlan) {
      console.warn('[CheckoutSummary] Meal plan price is 0:', {
        mealPlanId,
        currentPrice: (mealPlan as any).currentPrice,
        current_price: (mealPlan as any).current_price,
        originalPrice: (mealPlan as any).originalPrice,
        original_price: (mealPlan as any).original_price,
        mealPlan
      });
    }
    return price;
  }, [mealPlan, mealPlanId]);

  // Fetch user/client data
  const { data: clientData } = useQuery({
    queryKey: [`/api/clients/user/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  // Fetch addresses for display
  const { data: addresses = [] } = useQuery({
    queryKey: [`/api/addresses`, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/addresses?client_id=${user.id}`);
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!user?.id,
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout/save", {
        checkout_id: checkoutId,
        meal_plan_id: mealPlanId,
        plan_category: mealPlan?.category || formData.plan_category || "",
        health_inputs: formData.health_inputs,
        meal_timing: formData.meal_timing,
        consultation_preference: formData.consultation_preference,
        consultation_date: formData.consultation_date,
        consultation_time_slot: formData.consultation_time_slot,
        consultation_mode: formData.consultation_mode,
        delivery_addresses: formData.meal_timing?.delivery_addresses,
      });
      if (!res.ok) throw new Error("Failed to save draft");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "You can continue later from your dashboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    },
  });

  // Complete checkout mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      // Validate checkoutId before making request
      if (!checkoutId) {
        throw new Error("Checkout ID is missing. Please try again.");
      }

      const res = await apiRequest("POST", "/api/checkout/complete", {
        checkout_id: checkoutId,
        discount_code: discountCode || null,
      });
      
      if (!res.ok) {
        // Extract detailed error message from response
        let errorMessage = "Failed to complete checkout";
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.already_completed ? "Checkout already completed" : "Checkout completed!",
        description: data.message || "Redirecting to payment...",
      });
      // Pass both checkoutId and subscription_id to parent
      onComplete(checkoutId, data.subscription_id);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete checkout",
        variant: "destructive",
      });
    },
  });

  const handleComplete = () => {
    // Prevent duplicate calls
    if (completeMutation.isPending || !checkoutId) {
      return;
    }
    completeMutation.mutate();
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate();
  };

  // Helper to get address display text
  const getAddressDisplay = (addressId: string) => {
    if (!addressId) return "Default address";
    const address = addresses.find((addr: any) => addr.id === addressId);
    if (!address) return "Address not found";
    return `${address.label || address.line1} - ${address.city}`;
  };

  return (
    <div>
      <CardHeader>
        <CardTitle>Review Your Plan Before Payment</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          We'll match you with the right nutritionist for your goal. Please review all details and make any necessary changes before proceeding.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">User Details</CardTitle>
              <Badge variant="outline">Read-only</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{user?.name}</span>
            </div>
            {clientData && (
              <>
                {clientData.age && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-medium">{clientData.age} years</span>
                  </div>
                )}
                {clientData.gender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium">{clientData.gender}</span>
                  </div>
                )}
                {clientData.height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Height:</span>
                    <span className="font-medium">{clientData.height} cm</span>
                  </div>
                )}
                {clientData.weight_start && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Weight:</span>
                    <span className="font-medium">{clientData.weight_start} kg</span>
                  </div>
                )}
                {clientData.weight_goal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Weight:</span>
                    <span className="font-medium">{clientData.weight_goal} kg</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Goal & Plan */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Goal & Plan</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit("health")}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium">{mealPlanTitle || mealPlan?.title || "Meal Plan"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">30 days</span>
            </div>
            {formData.health_inputs && Object.keys(formData.health_inputs).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-muted-foreground mb-2 font-medium">Health Inputs:</p>
                <div className="space-y-2">
                  {Object.entries(formData.health_inputs).map(([key, value]: [string, any]) => {
                    if (value === null || value === undefined || value === "") return null;
                    if (Array.isArray(value)) {
                      return (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {value.map((item: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {String(item)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="font-medium text-right max-w-[60%] break-words">
                          {String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery & Timing */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Delivery & Timing</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit("timing")}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {formData.meal_timing && (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground mb-2">Meal Times:</p>
                    <div className="space-y-1 pl-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Breakfast:</span>
                        <span className="font-medium">{formData.meal_timing.breakfast_time || "08:00"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lunch:</span>
                        <span className="font-medium">{formData.meal_timing.lunch_time || "13:00"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dinner:</span>
                        <span className="font-medium">{formData.meal_timing.dinner_time || "19:00"}</span>
                      </div>
                      {formData.meal_timing.snack_times && formData.meal_timing.snack_times.length > 0 && (
                        <div className="mt-2">
                          <span className="text-muted-foreground">Snacks: </span>
                          <span className="font-medium">
                            {formData.meal_timing.snack_times.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delivery Addresses */}
                  {formData.meal_timing.delivery_addresses && (
                    <div className="pt-3 border-t">
                      <p className="text-muted-foreground mb-2">Delivery Addresses:</p>
                      <div className="space-y-2 pl-2">
                        {formData.meal_timing.delivery_addresses.breakfast ? (
                          <div>
                            <span className="text-muted-foreground text-xs">Breakfast: </span>
                            <span className="font-medium text-xs">
                              {getAddressDisplay(formData.meal_timing.delivery_addresses.breakfast)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted-foreground text-xs">Breakfast: </span>
                            <span className="font-medium text-xs">Default address</span>
                          </div>
                        )}
                        {formData.meal_timing.delivery_addresses.lunch ? (
                          <div>
                            <span className="text-muted-foreground text-xs">Lunch: </span>
                            <span className="font-medium text-xs">
                              {getAddressDisplay(formData.meal_timing.delivery_addresses.lunch)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted-foreground text-xs">Lunch: </span>
                            <span className="font-medium text-xs">Default address</span>
                          </div>
                        )}
                        {formData.meal_timing.delivery_addresses.dinner ? (
                          <div>
                            <span className="text-muted-foreground text-xs">Dinner: </span>
                            <span className="font-medium text-xs">
                              {getAddressDisplay(formData.meal_timing.delivery_addresses.dinner)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted-foreground text-xs">Dinner: </span>
                            <span className="font-medium text-xs">Default address</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-2 pt-2 border-t">
                    <span className="text-muted-foreground">Meal Reminders:</span>
                    <Badge variant={formData.meal_timing.meal_reminders ? "default" : "outline"}>
                      {formData.meal_timing.meal_reminders ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Consultation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Consultation</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit("consultation")}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {formData.consultation_preference && formData.consultation_date ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Scheduled</span>
                </div>
                <div className="space-y-1 pl-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {formData.consultation_date && format(new Date(formData.consultation_date), "PPP")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium capitalize">{formData.consultation_time_slot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium capitalize">{formData.consultation_mode}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Not scheduled yet</p>
            )}
          </CardContent>
        </Card>

        {/* Price & Payment Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Price & Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p className="text-muted-foreground mb-1">
                💡 You can apply a coupon code and select payment method (Card, UPI, or Net Banking) on the payment screen.
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Subscription auto-renewal option will also be available during payment.
              </p>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              {isLoadingMealPlan ? (
                <div className="text-center py-4 text-muted-foreground">Loading price...</div>
              ) : mealPlanError ? (
                <div className="text-center py-4 text-destructive text-sm">
                  Failed to load price. Please refresh the page.
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Price:</span>
                    <span className="font-medium">
                      ₹{planPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total Payable:</span>
                    <span>₹{planPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * Final amount may vary if coupon code is applied
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending}
            className="flex-1"
          >
            {saveDraftMutation.isPending ? "Saving..." : "Save & Complete Later"}
          </Button>
          <Button
            onClick={handleComplete}
            disabled={completeMutation.isPending || !checkoutId}
            className="flex-1"
          >
            {completeMutation.isPending ? (
              "Processing..."
            ) : (
              <>
                Confirm & Proceed to Payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </div>
  );
}

