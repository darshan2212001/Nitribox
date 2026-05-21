import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Step1HealthInputs from "./Step1HealthInputs";
import Step2MealTiming from "./Step2MealTiming";
import Step3Consultation from "./Step3Consultation";
import CheckoutSummary from "./CheckoutSummary";
import PaymentScreen from "./PaymentScreen";

interface CheckoutWizardProps {
  mealPlanId: string;
  mealPlanTitle?: string;
  mealPlanCategory?: string;
  onComplete: (checkoutId: string, subscriptionId?: string) => void;
  onCancel: () => void;
}

type Step = "health" | "timing" | "consultation" | "summary";

const steps: { id: Step; title: string; description: string }[] = [
  { id: "health", title: "Health Inputs", description: "Tell us about your health goals" },
  { id: "timing", title: "Meal Timing", description: "Set your meal schedule" },
  { id: "consultation", title: "Consultation", description: "Schedule with your nutritionist" },
  { id: "summary", title: "Review", description: "Review and confirm" },
];

export default function CheckoutWizard({
  mealPlanId,
  mealPlanTitle,
  mealPlanCategory,
  onComplete,
  onCancel,
}: CheckoutWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("health");
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [formData, setFormData] = useState({
    health_inputs: null as any,
    meal_timing: null as any,
    consultation_preference: false,
    consultation_date: null as Date | null,
    consultation_time_slot: null as string | null,
    consultation_mode: null as string | null,
    delivery_addresses: null as any,
  });

  // Start checkout session
  const { data: checkoutData, isLoading: isLoadingCheckout, error: checkoutError } = useQuery({
    queryKey: [`/api/checkout/start`, mealPlanId],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/checkout/start", {
        meal_plan_id: mealPlanId,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to start checkout: ${errorText || res.statusText}`);
      }
      const data = await res.json();
      setCheckoutId(data.id);
      // Restore existing data if any
      if (data.health_inputs) {
        try {
          const parsed = typeof data.health_inputs === 'string' ? JSON.parse(data.health_inputs) : data.health_inputs;
          setFormData(prev => ({ ...prev, health_inputs: parsed }));
        } catch (e) {
          // If parsing fails, use as-is
          setFormData(prev => ({ ...prev, health_inputs: data.health_inputs }));
        }
      }
      if (data.meal_timing) {
        try {
          const parsed = typeof data.meal_timing === 'string' ? JSON.parse(data.meal_timing) : data.meal_timing;
          setFormData(prev => ({ ...prev, meal_timing: parsed }));
        } catch (e) {
          setFormData(prev => ({ ...prev, meal_timing: data.meal_timing }));
        }
      }
      if (data.consultation_preference !== undefined) setFormData(prev => ({ ...prev, consultation_preference: data.consultation_preference }));
      if (data.consultation_date) setFormData(prev => ({ ...prev, consultation_date: new Date(data.consultation_date) }));
      if (data.consultation_time_slot) setFormData(prev => ({ ...prev, consultation_time_slot: data.consultation_time_slot }));
      if (data.consultation_mode) setFormData(prev => ({ ...prev, consultation_mode: data.consultation_mode }));
      if (data.delivery_addresses) {
        try {
          const parsed = typeof data.delivery_addresses === 'string' ? JSON.parse(data.delivery_addresses) : data.delivery_addresses;
          setFormData(prev => ({ ...prev, delivery_addresses: parsed }));
        } catch (e) {
          setFormData(prev => ({ ...prev, delivery_addresses: data.delivery_addresses }));
        }
      }
      return data;
    },
    enabled: !!mealPlanId && !!user,
    retry: 1,
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!checkoutId) return;
      const res = await apiRequest("POST", "/api/checkout/save", {
        checkout_id: checkoutId,
        meal_plan_id: mealPlanId,
        plan_category: mealPlanCategory || checkoutData?.plan_category || "",
        ...data,
      });
      if (!res.ok) throw new Error("Failed to save draft");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "Your progress has been saved.",
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

  // Auto-save draft
  useEffect(() => {
    if (!checkoutId || currentStep === "summary") return;
    const timer = setTimeout(() => {
      saveDraftMutation.mutate(formData);
    }, 2000); // Auto-save after 2 seconds of inactivity
    return () => clearTimeout(timer);
  }, [formData, checkoutId, currentStep]);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep === "health") {
      setCurrentStep("timing");
    } else if (currentStep === "timing") {
      setCurrentStep("consultation");
    } else if (currentStep === "consultation") {
      setCurrentStep("summary");
    }
  };

  const handleBack = () => {
    if (currentStep === "summary") {
      setCurrentStep("consultation");
    } else if (currentStep === "consultation") {
      setCurrentStep("timing");
    } else if (currentStep === "timing") {
      setCurrentStep("health");
    }
  };

  const handleStepDataChange = (step: Step, data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleSaveDraft = () => {
    if (checkoutId) {
      saveDraftMutation.mutate(formData);
      toast({
        title: "Draft saved",
        description: "You can continue later from where you left off.",
      });
      onCancel();
    }
  };


  if (!mealPlanId) {
    console.error("[CheckoutWizard] No mealPlanId provided");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error: No meal plan selected</p>
          <Button onClick={onCancel}>Back to Cart</Button>
        </div>
      </div>
    );
  }

  if (isLoadingCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Starting checkout session...</p>
        </div>
      </div>
    );
  }

  if (checkoutError) {
    console.error("[CheckoutWizard] Checkout error:", checkoutError);
    const errorMessage = (checkoutError as any)?.message || "Failed to initialize checkout session. Please try again.";
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('credentials');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-destructive font-semibold">
                {isAuthError ? "Authentication Error" : "Error Starting Checkout"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAuthError 
                  ? "Your session may have expired. Please log in again to continue."
                  : errorMessage
                }
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={onCancel}>
                  Back to Cart
                </Button>
                {isAuthError ? (
                  <Button onClick={() => {
                    // Clear auth and redirect to login
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user_data');
                    window.location.href = '/';
                  }}>
                    Go to Login
                  </Button>
                ) : (
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show payment screen if checkout is completed
  if (showPayment && checkoutId) {
    return (
      <PaymentScreen
        checkoutId={checkoutId}
        subscriptionId={subscriptionId || undefined}
        mealPlanId={mealPlanId}
        onPaymentSuccess={(paymentId) => {
          toast({
            title: "Success!",
            description: "Your subscription is now active.",
          });
          onComplete(checkoutId);
        }}
        onBack={() => setShowPayment(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Complete Your Checkout</h1>
          <p className="text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex]?.title}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            {steps.map((step, index) => (
              <span
                key={step.id}
                className={index <= currentStepIndex ? "text-primary font-medium" : ""}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {currentStep === "health" && (
                <motion.div
                  key="health"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Step1HealthInputs
                    planCategory={mealPlanCategory || checkoutData?.plan_category || ""}
                    initialData={formData.health_inputs}
                    onChange={(data) => handleStepDataChange("health", { health_inputs: data })}
                  />
                </motion.div>
              )}

              {currentStep === "timing" && (
                <motion.div
                  key="timing"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Step2MealTiming
                    initialData={formData.meal_timing}
                    onChange={(data) => handleStepDataChange("timing", { meal_timing: data })}
                  />
                </motion.div>
              )}

              {currentStep === "consultation" && (
                <motion.div
                  key="consultation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Step3Consultation
                    initialData={{
                      preference: formData.consultation_preference,
                      date: formData.consultation_date,
                      time_slot: formData.consultation_time_slot,
                      mode: formData.consultation_mode,
                    }}
                    onChange={(data) => handleStepDataChange("consultation", data)}
                  />
                </motion.div>
              )}

              {currentStep === "summary" && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <CheckoutSummary
                    mealPlanId={mealPlanId}
                    mealPlanTitle={mealPlanTitle}
                    formData={formData}
                    checkoutId={checkoutId || ""}
                    onEdit={(step) => {
                      if (step === "health") setCurrentStep("health");
                      else if (step === "timing") setCurrentStep("timing");
                      else if (step === "consultation") setCurrentStep("consultation");
                    }}
                    onComplete={(completedCheckoutId, subscriptionIdFromResponse) => {
                      // Use subscription_id from checkout completion response
                      if (subscriptionIdFromResponse) {
                        setSubscriptionId(subscriptionIdFromResponse);
                        setShowPayment(true);
                        onComplete(completedCheckoutId, subscriptionIdFromResponse);
                      } else {
                        // Fallback: fetch subscription_id if not provided
                        const fetchSubscription = async () => {
                          try {
                            const res = await apiRequest("GET", `/api/checkout/${completedCheckoutId}`);
                            if (res.ok) {
                              const data = await res.json();
                              if (data.subscription_id) {
                                setSubscriptionId(data.subscription_id);
                                setShowPayment(true);
                                onComplete(completedCheckoutId, data.subscription_id);
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Subscription ID not found. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            } else {
                              toast({
                                title: "Error",
                                description: "Failed to fetch subscription details.",
                                variant: "destructive",
                              });
                            }
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to fetch subscription.",
                              variant: "destructive",
                            });
                          }
                        };
                        fetchSubscription();
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        {currentStep !== "summary" && (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={saveDraftMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save & Continue Later
              </Button>
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

