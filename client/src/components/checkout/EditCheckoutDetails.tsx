import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Step1HealthInputs from "./Step1HealthInputs";
import Step2MealTiming from "./Step2MealTiming";
import Step3Consultation from "./Step3Consultation";

interface EditCheckoutDetailsProps {
  subscriptionId: string;
  mealPlanId: string;
  planCategory: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "health" | "timing" | "consultation";

const steps: { id: Step; title: string; description: string }[] = [
  { id: "health", title: "Health Information", description: "Complete your health goals and preferences" },
  { id: "timing", title: "Meal Timing", description: "Set your meal schedule and delivery addresses" },
  { id: "consultation", title: "Consultation", description: "Schedule with your nutritionist" },
];

export default function EditCheckoutDetails({
  subscriptionId,
  mealPlanId,
  planCategory,
  onComplete,
  onCancel,
}: EditCheckoutDetailsProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("health");
  const [formData, setFormData] = useState({
    health_inputs: null as any,
    meal_timing: null as any,
    consultation_preference: false,
    consultation_date: null as Date | null,
    consultation_time_slot: null as string | null,
    consultation_mode: null as string | null,
    delivery_addresses: null as any,
  });

  // Fetch checkout data by subscription
  const { data: checkoutData, isLoading: isLoadingCheckout } = useQuery({
    queryKey: [`/api/checkout/subscription/${subscriptionId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!subscriptionId,
  });

  // Use plan_category from checkoutData if available, otherwise use prop
  const effectivePlanCategory = checkoutData?.plan_category || planCategory;

  // Fetch incomplete items
  const { data: incompleteItemsData } = useQuery({
    queryKey: [`/api/subscriptions/${subscriptionId}/incomplete-items`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!subscriptionId,
  });

  // Load existing data when checkout data is fetched
  useEffect(() => {
    if (checkoutData) {
      if (checkoutData.health_inputs) {
        try {
          const parsed = typeof checkoutData.health_inputs === 'string' 
            ? JSON.parse(checkoutData.health_inputs) 
            : checkoutData.health_inputs;
          setFormData(prev => ({ ...prev, health_inputs: parsed }));
        } catch (e) {
          setFormData(prev => ({ ...prev, health_inputs: checkoutData.health_inputs }));
        }
      }
      if (checkoutData.meal_timing) {
        try {
          const parsed = typeof checkoutData.meal_timing === 'string' 
            ? JSON.parse(checkoutData.meal_timing) 
            : checkoutData.meal_timing;
          setFormData(prev => ({ ...prev, meal_timing: parsed }));
        } catch (e) {
          setFormData(prev => ({ ...prev, meal_timing: checkoutData.meal_timing }));
        }
      }
      if (checkoutData.consultation_preference !== undefined) {
        setFormData(prev => ({ ...prev, consultation_preference: checkoutData.consultation_preference }));
      }
      if (checkoutData.consultation_date) {
        setFormData(prev => ({ ...prev, consultation_date: new Date(checkoutData.consultation_date) }));
      }
      if (checkoutData.consultation_time_slot) {
        setFormData(prev => ({ ...prev, consultation_time_slot: checkoutData.consultation_time_slot }));
      }
      if (checkoutData.consultation_mode) {
        setFormData(prev => ({ ...prev, consultation_mode: checkoutData.consultation_mode }));
      }
      if (checkoutData.delivery_addresses) {
        try {
          const parsed = typeof checkoutData.delivery_addresses === 'string' 
            ? JSON.parse(checkoutData.delivery_addresses) 
            : checkoutData.delivery_addresses;
          setFormData(prev => ({ ...prev, delivery_addresses: parsed }));
        } catch (e) {
          setFormData(prev => ({ ...prev, delivery_addresses: checkoutData.delivery_addresses }));
        }
      }
    }
  }, [checkoutData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/checkout/save", {
        checkout_id: checkoutData?.id,
        meal_plan_id: mealPlanId,
        plan_category: effectivePlanCategory,
        ...data,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to save");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/checkout/subscription/${subscriptionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/subscriptions/${subscriptionId}/incomplete-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/subscriptions`] });
      toast({
        title: "Details saved",
        description: "Your information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save details",
        variant: "destructive",
      });
    },
  });

  const handleStepDataChange = (step: Step, data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep === "health") {
      setCurrentStep("timing");
    } else if (currentStep === "timing") {
      setCurrentStep("consultation");
    }
  };

  const handleBack = () => {
    if (currentStep === "consultation") {
      setCurrentStep("timing");
    } else if (currentStep === "timing") {
      setCurrentStep("health");
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleComplete = () => {
    saveMutation.mutate(formData, {
      onSuccess: () => {
        onComplete();
      },
    });
  };

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const incompleteItems = incompleteItemsData?.incomplete_items || [];
  const isComplete = incompleteItemsData?.is_complete || false;

  if (isLoadingCheckout) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Complete Your Details</h2>
            <p className="text-sm text-muted-foreground">
              {steps[currentStepIndex]?.description}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Incomplete items alert */}
          {incompleteItems.length > 0 && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    {incompleteItems.length} item{incompleteItems.length > 1 ? 's' : ''} remaining
                  </span>
                  <span className="text-sm font-medium">
                    {incompleteItemsData?.completion_percentage || 0}% Complete
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Step content */}
          <div className="min-h-[400px]">
            {currentStep === "health" && (
              <Step1HealthInputs
                planCategory={effectivePlanCategory}
                initialData={formData.health_inputs}
                onChange={(data) => handleStepDataChange("health", { health_inputs: data })}
              />
            )}

            {currentStep === "timing" && (
              <Step2MealTiming
                initialData={formData.meal_timing}
                deliveryAddresses={formData.delivery_addresses}
                onChange={(data) => handleStepDataChange("timing", { 
                  meal_timing: data.meal_timing,
                  delivery_addresses: data.delivery_addresses 
                })}
              />
            )}

            {currentStep === "consultation" && (
              <Step3Consultation
                initialData={{
                  consultation_preference: formData.consultation_preference,
                  consultation_date: formData.consultation_date,
                  consultation_time_slot: formData.consultation_time_slot,
                  consultation_mode: formData.consultation_mode,
                }}
                onChange={(data) => handleStepDataChange("consultation", data)}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? onCancel : handleBack}
            >
              {currentStepIndex === 0 ? "Cancel" : "Back"}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                Save Progress
              </Button>
              {currentStepIndex === steps.length - 1 ? (
                <Button
                  onClick={handleComplete}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving..." : "Complete"}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

