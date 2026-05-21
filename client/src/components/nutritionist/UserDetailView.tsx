import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, Utensils, MessageSquare, Activity, Heart, MapPin } from "lucide-react";
import { format } from "date-fns";
import ActivityTimeline from "./ActivityTimeline";
import EmptyState from "@/components/EmptyState";

interface UserDetailViewProps {
  userId: string;
}

export default function UserDetailView({ userId }: UserDetailViewProps) {
  const { toast } = useToast();
  const [note, setNote] = useState("");

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery({
    queryKey: [`/api/nutritionist/user/${userId}/details`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
  });

  // Fetch activities
  const { data: activities } = useQuery({
    queryKey: [`/api/nutritionist/user/${userId}/activities`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!note.trim()) {
        throw new Error("Note cannot be empty");
      }
      const res = await apiRequest("POST", `/api/nutritionist/user/${userId}/notes`, {
        user_id: userId,
        subscription_id: userDetails?.subscription?.id || "",
        note: note.trim(),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "Your note has been saved",
      });
      setNote("");
      queryClient.invalidateQueries({ queryKey: [`/api/nutritionist/user/${userId}/activities`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <EmptyState
        icon={User}
        title="User not found"
        description="Unable to load user details"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6" />
                {userDetails.user?.name}
              </CardTitle>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">{userDetails.user?.email}</p>
                {userDetails.user?.phone && (
                  <p className="text-sm text-muted-foreground">{userDetails.user.phone}</p>
                )}
              </div>
            </div>
            <Badge variant={userDetails.subscription?.status === "active" ? "default" : "outline"}>
              {userDetails.subscription?.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-semibold">{userDetails.subscription?.meal_plan_title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-semibold">{userDetails.subscription?.duration_days} days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-semibold">
                {userDetails.subscription?.start_date
                  ? format(new Date(userDetails.subscription.start_date), "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-semibold">
                {userDetails.subscription?.end_date
                  ? format(new Date(userDetails.subscription.end_date), "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
            {userDetails.client?.age && (
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">{userDetails.client.age} years</p>
              </div>
            )}
            {userDetails.client?.gender && (
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{userDetails.client.gender}</p>
              </div>
            )}
            {userDetails.client?.weight_start && userDetails.client?.weight_goal && (
              <div>
                <p className="text-sm text-muted-foreground">Weight Progress</p>
                <p className="font-medium">
                  {userDetails.client.weight_start} → {userDetails.client.weight_goal} kg
                </p>
              </div>
            )}
          </div>
          
          {userDetails.client?.health_conditions && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Health Conditions:</p>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(userDetails.client.health_conditions)
                  ? userDetails.client.health_conditions.map((condition: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {condition}
                      </Badge>
                    ))
                  : (
                    <Badge variant="secondary">{userDetails.client.health_conditions}</Badge>
                  )}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm">
              Send Message
            </Button>
            <Button variant="outline" size="sm">
              Update Diet Plan
            </Button>
            <Button variant="outline" size="sm">
              Request Feedback
            </Button>
            <Button variant="outline" size="sm">
              Mark Plan Completed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile & Health</TabsTrigger>
          <TabsTrigger value="meal-plan">Meal Plan & Schedule</TabsTrigger>
          <TabsTrigger value="consultation">Consultation & Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity Tracking</TabsTrigger>
        </TabsList>

        {/* Profile & Health Data */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Health Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userDetails.client && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {userDetails.client.age && (
                    <div>
                      <p className="text-muted-foreground">Age</p>
                      <p className="font-medium">{userDetails.client.age} years</p>
                    </div>
                  )}
                  {userDetails.client.gender && (
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{userDetails.client.gender}</p>
                    </div>
                  )}
                  {userDetails.client.height && (
                    <div>
                      <p className="text-muted-foreground">Height</p>
                      <p className="font-medium">{userDetails.client.height} cm</p>
                    </div>
                  )}
                  {userDetails.client.weight_start && (
                    <div>
                      <p className="text-muted-foreground">Current Weight</p>
                      <p className="font-medium">{userDetails.client.weight_start} kg</p>
                    </div>
                  )}
                  {userDetails.client.weight_goal && (
                    <div>
                      <p className="text-muted-foreground">Target Weight</p>
                      <p className="font-medium">{userDetails.client.weight_goal} kg</p>
                    </div>
                  )}
                </div>
              )}
              {userDetails.checkout_data?.health_inputs && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Plan-Specific Inputs:</p>
                  <div className="space-y-1 text-sm">
                    {Object.entries(userDetails.checkout_data.health_inputs).map(
                      ([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
              {userDetails.client?.dietary_preferences && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Dietary Preferences:</p>
                  <p className="text-sm">{userDetails.client.dietary_preferences}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meal Plan & Schedule */}
        <TabsContent value="meal-plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Meal Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userDetails.checkout_data?.meal_timing && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breakfast:</span>
                    <span className="font-medium">
                      {userDetails.checkout_data.meal_timing.breakfast_time || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lunch:</span>
                    <span className="font-medium">
                      {userDetails.checkout_data.meal_timing.lunch_time || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dinner:</span>
                    <span className="font-medium">
                      {userDetails.checkout_data.meal_timing.dinner_time || "N/A"}
                    </span>
                  </div>
                  {userDetails.checkout_data.meal_timing.snack_times &&
                    userDetails.checkout_data.meal_timing.snack_times.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Snacks: </span>
                        <span className="font-medium">
                          {userDetails.checkout_data.meal_timing.snack_times.join(", ")}
                        </span>
                      </div>
                    )}
                </div>
              )}
              {userDetails.checkout_data?.delivery_addresses && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Addresses
                  </p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(userDetails.checkout_data.delivery_addresses).map(
                      ([meal, address]: [string, any]) => (
                        <div key={meal}>
                          <span className="font-medium capitalize">{meal}:</span>{" "}
                          <span className="text-muted-foreground">{String(address)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consultation & Notes */}
        <TabsContent value="consultation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consultations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userDetails.consultations && userDetails.consultations.length > 0 ? (
                <div className="space-y-3">
                  {userDetails.consultations.map((cons: any) => {
                    // Support both camelCase (API format) and snake_case (legacy)
                    const consultationDate = cons.scheduledDate || cons.date || cons.sessionDate;
                    const timeSlot = cons.timeSlot || cons.time_slot;
                    const consultationMode = cons.mode || cons.consultationMode;
                    
                    return (
                      <div key={cons.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">
                              {consultationDate ? format(new Date(consultationDate), "PPP") : "Date TBD"}
                            </p>
                            {timeSlot && (
                              <p className="text-sm text-muted-foreground">
                                {timeSlot}{consultationMode ? ` - ${consultationMode}` : ''}
                              </p>
                            )}
                          </div>
                          <Badge variant={cons.status === "scheduled" ? "default" : "outline"}>
                            {cons.status}
                          </Badge>
                        </div>
                        {cons.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{cons.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No consultations scheduled</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Private Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">Add a note (only visible to you and admin)</Label>
                <Textarea
                  id="note"
                  placeholder="Add your notes about this client..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={() => addNoteMutation.mutate()}
                disabled={!note.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending ? "Saving..." : "Save Note"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tracking */}
        <TabsContent value="activity">
          <ActivityTimeline activities={activities || []} />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline">
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Message
        </Button>
        <Button variant="outline">
          Update Diet Plan
        </Button>
        <Button variant="outline">
          Request Feedback
        </Button>
      </div>
    </div>
  );
}

