import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Calendar, MapPin, Heart, Utensils, Star, Users } from "lucide-react";
import { format } from "date-fns";

interface UserDetailsDrawerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onAllocationComplete: () => void;
}

export default function UserDetailsDrawer({
  userId,
  isOpen,
  onClose,
  onAllocationComplete,
}: UserDetailsDrawerProps) {
  const { toast } = useToast();
  const [selectedNutritionistId, setSelectedNutritionistId] = useState<string>("");

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery({
    queryKey: [`/api/admin/nutritionist-allocation/user/${userId}/details`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isOpen && !!userId,
  });

  // Fetch available nutritionists
  const { data: nutritionists } = useQuery({
    queryKey: ["/api/admin/nutritionist-allocation/nutritionists"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isOpen,
  });

  // Allocate mutation
  const allocateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNutritionistId || !userDetails?.subscription_id) {
        throw new Error("Please select a nutritionist");
      }
      const res = await apiRequest("POST", "/api/admin/nutritionist-allocation/allocate", {
        subscription_id: userDetails.subscription_id,
        nutritionist_id: selectedNutritionistId,
      });
      if (!res.ok) throw new Error("Failed to allocate nutritionist");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Allocation successful!",
        description: `User has been allocated to ${data.nutritionist_name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nutritionist-allocation/pending"] });
      onAllocationComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Allocation failed",
        description: error.message || "Failed to allocate nutritionist",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!userDetails) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">User details not found</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            Review user information and allocate to a nutritionist
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{userDetails.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{userDetails.user_email}</span>
              </div>
              {userDetails.user_phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{userDetails.user_phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan & Goal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Plan & Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan:</span>
                <Badge>{userDetails.meal_plan_title}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{userDetails.plan_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{userDetails.duration_days} days</span>
              </div>
              {userDetails.primary_goal && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primary Goal:</span>
                  <span className="font-medium">{userDetails.primary_goal}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Data */}
          {(userDetails.client_age || userDetails.client_gender || userDetails.health_conditions) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Health Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {userDetails.client_age && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-medium">{userDetails.client_age} years</span>
                  </div>
                )}
                {userDetails.client_gender && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="font-medium">{userDetails.client_gender}</span>
                  </div>
                )}
                {userDetails.client_height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Height:</span>
                    <span className="font-medium">{userDetails.client_height} cm</span>
                  </div>
                )}
                {userDetails.client_weight_start && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Weight:</span>
                    <span className="font-medium">{userDetails.client_weight_start} kg</span>
                  </div>
                )}
                {userDetails.client_weight_goal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Weight:</span>
                    <span className="font-medium">{userDetails.client_weight_goal} kg</span>
                  </div>
                )}
                {userDetails.health_conditions && userDetails.health_conditions.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Health Conditions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userDetails.health_conditions.map((condition: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Health Inputs */}
          {userDetails.health_inputs && Object.keys(userDetails.health_inputs).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plan-Specific Health Inputs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {Object.entries(userDetails.health_inputs).map(([key, value]: [string, any]) => {
                    if (value === null || value === undefined || value === "") return null;
                    if (Array.isArray(value)) {
                      return (
                        <div key={key}>
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
                      <div key={key} className="flex justify-between">
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
              </CardContent>
            </Card>
          )}

          {/* Meal Timing & Delivery Addresses */}
          {userDetails.meal_timing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Meal Schedule & Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breakfast:</span>
                    <span className="font-medium">{userDetails.meal_timing.breakfast_time || "08:00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lunch:</span>
                    <span className="font-medium">{userDetails.meal_timing.lunch_time || "13:00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dinner:</span>
                    <span className="font-medium">{userDetails.meal_timing.dinner_time || "19:00"}</span>
                  </div>
                  {userDetails.meal_timing.snack_times && userDetails.meal_timing.snack_times.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Snacks: </span>
                      <span className="font-medium">{userDetails.meal_timing.snack_times.join(", ")}</span>
                    </div>
                  )}
                </div>
                
                {/* Delivery Addresses */}
                {userDetails.delivery_addresses && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Delivery Addresses:</span>
                    </div>
                    {userDetails.delivery_addresses.breakfast && (
                      <div className="pl-4 text-xs">
                        <span className="text-muted-foreground">Breakfast: </span>
                        <span className="font-medium">Custom address selected</span>
                      </div>
                    )}
                    {userDetails.delivery_addresses.lunch && (
                      <div className="pl-4 text-xs">
                        <span className="text-muted-foreground">Lunch: </span>
                        <span className="font-medium">Custom address selected</span>
                      </div>
                    )}
                    {userDetails.delivery_addresses.dinner && (
                      <div className="pl-4 text-xs">
                        <span className="text-muted-foreground">Dinner: </span>
                        <span className="font-medium">Custom address selected</span>
                      </div>
                    )}
                    {!userDetails.delivery_addresses.breakfast && 
                     !userDetails.delivery_addresses.lunch && 
                     !userDetails.delivery_addresses.dinner && (
                      <div className="pl-4 text-xs text-muted-foreground">
                        Default address for all meals
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Consultation */}
          {userDetails.consultation_preference && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Consultation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {userDetails.consultation_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {format(new Date(userDetails.consultation_date), "PPP")}
                    </span>
                  </div>
                )}
                {userDetails.consultation_time_slot && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Slot:</span>
                    <span className="font-medium capitalize">{userDetails.consultation_time_slot}</span>
                  </div>
                )}
                {userDetails.consultation_mode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium capitalize">{userDetails.consultation_mode}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Allocation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Allocate Nutritionist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nutritionist">Select Nutritionist</Label>
                <Select
                  value={selectedNutritionistId}
                  onValueChange={setSelectedNutritionistId}
                >
                  <SelectTrigger id="nutritionist">
                    <SelectValue placeholder="Choose a nutritionist" />
                  </SelectTrigger>
                  <SelectContent>
                    {nutritionists?.map((nut: any) => (
                      <SelectItem key={nut.id} value={nut.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{nut.name}</span>
                            {nut.specialization && (
                              <Badge variant="outline" className="text-xs">
                                {nut.specialization}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {nut.current_load}
                            </div>
                            {nut.rating && nut.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {nut.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedNutritionistId && (
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    {(() => {
                      const selected = nutritionists?.find((n: any) => n.id === selectedNutritionistId);
                      if (!selected) return null;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{selected.name}</span>
                            {selected.rating && selected.rating > 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {selected.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                          {selected.specialization && (
                            <Badge variant="secondary" className="text-xs">
                              {selected.specialization}
                            </Badge>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {selected.current_load || 0}
                            </div>
                            {selected.is_available !== undefined && (
                              <div className="flex items-center gap-1">
                                {selected.is_available ? (
                                  <span className="text-emerald-600">Available</span>
                                ) : (
                                  <span className="text-muted-foreground">Unavailable</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground pt-1">
                            This nutritionist will be notified of the assignment
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <Button
                onClick={() => allocateMutation.mutate()}
                disabled={!selectedNutritionistId || allocateMutation.isPending}
                className="w-full"
              >
                {allocateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Allocating...
                  </>
                ) : (
                  "Allocate & Notify Nutritionist"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

