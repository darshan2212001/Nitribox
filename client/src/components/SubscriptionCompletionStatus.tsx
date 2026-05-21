import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Edit, Calendar } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import EditCheckoutDetails from "./checkout/EditCheckoutDetails";
import { useState } from "react";

interface SubscriptionCompletionStatusProps {
  subscription: any;
  onCompleteDetails?: () => void;
}

export default function SubscriptionCompletionStatus({
  subscription,
  onCompleteDetails,
}: SubscriptionCompletionStatusProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch incomplete items
  const { data: incompleteItemsData, isLoading } = useQuery({
    queryKey: [`/api/subscriptions/${subscription?.id}/incomplete-items`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!subscription?.id,
  });

  if (isLoading || !subscription) {
    return null;
  }

  const incompleteItems = incompleteItemsData?.incomplete_items || [];
  const isComplete = incompleteItemsData?.is_complete || false;
  const completionPercentage = incompleteItemsData?.completion_percentage || 100;

  if (isComplete) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-900 dark:text-green-100">
                All details completed!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your subscription information is complete.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Complete Your Details
            </CardTitle>
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {completionPercentage}% Complete
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {4 - incompleteItems.length} of 4 sections completed
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    {incompleteItems.length} item{incompleteItems.length > 1 ? 's' : ''} remaining
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {incompleteItems.map((item: any, index: number) => (
                      <li key={index}>{item.label}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowEditModal(true)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Complete Details
              </Button>
              {incompleteItems.some((item: any) => item.type === "consultation") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Open consultation scheduling - this will be handled by parent
                    if (onCompleteDetails) {
                      onCompleteDetails();
                    }
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Consultation
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showEditModal && subscription && (
        <EditCheckoutDetails
          subscriptionId={subscription.id}
          mealPlanId={subscription.meal_plan_id}
          planCategory="weight_loss" // Will be fetched from checkout data
          onComplete={() => {
            setShowEditModal(false);
            if (onCompleteDetails) {
              onCompleteDetails();
            }
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}

