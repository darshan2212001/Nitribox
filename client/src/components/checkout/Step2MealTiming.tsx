import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, X, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Step2MealTimingProps {
  initialData?: any;
  onChange: (data: any) => void;
}

export default function Step2MealTiming({
  initialData,
  onChange,
}: Step2MealTimingProps) {
  const { user } = useAuth();
  
  // Fetch user addresses
  const { data: addresses } = useQuery({
    queryKey: [`/api/addresses`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const [formData, setFormData] = useState<any>(initialData || {
    breakfast_time: "08:00",
    lunch_time: "13:00",
    dinner_time: "19:00",
    snack_times: [] as string[],
    meal_reminders: true,
    delivery_addresses: {
      breakfast: "",
      lunch: "",
      dinner: "",
    },
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const addSnackTime = () => {
    setFormData((prev: any) => ({
      ...prev,
      snack_times: [...(prev.snack_times || []), "15:00"],
    }));
  };

  const removeSnackTime = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      snack_times: (prev.snack_times || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const updateSnackTime = (index: number, value: string) => {
    setFormData((prev: any) => {
      const snack_times = [...(prev.snack_times || [])];
      snack_times[index] = value;
      return { ...prev, snack_times };
    });
  };

  return (
    <div>
      <CardHeader>
        <CardTitle>Step 2 of 3 - Your Daily Meal Schedule</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Set your preferred meal times. We'll remind you before each meal.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breakfast */}
        <div className="space-y-2">
          <Label htmlFor="breakfast_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Breakfast Time
          </Label>
          <Input
            id="breakfast_time"
            type="time"
            value={formData.breakfast_time || "08:00"}
            onChange={(e) => updateField("breakfast_time", e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Lunch */}
        <div className="space-y-2">
          <Label htmlFor="lunch_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Lunch Time
          </Label>
          <Input
            id="lunch_time"
            type="time"
            value={formData.lunch_time || "13:00"}
            onChange={(e) => updateField("lunch_time", e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Dinner */}
        <div className="space-y-2">
          <Label htmlFor="dinner_time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Dinner Time
          </Label>
          <Input
            id="dinner_time"
            type="time"
            value={formData.dinner_time || "19:00"}
            onChange={(e) => updateField("dinner_time", e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Snack Times */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Snack Times (Optional)
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSnackTime}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Snack
            </Button>
          </div>
          {formData.snack_times && formData.snack_times.length > 0 && (
            <div className="space-y-2">
              {formData.snack_times.map((time: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateSnackTime(index, e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSnackTime(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meal Reminders Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="meal_reminders" className="text-base">
              Remind me before each meal
            </Label>
            <p className="text-sm text-muted-foreground">
              Get push notifications 15 minutes before your scheduled meal times
            </p>
          </div>
          <Switch
            id="meal_reminders"
            checked={formData.meal_reminders !== false}
            onCheckedChange={(checked) => updateField("meal_reminders", checked)}
          />
        </div>

        {/* Delivery Addresses */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Delivery Addresses
          </Label>
          <p className="text-sm text-muted-foreground">
            Select different delivery addresses for each meal (optional)
          </p>

          {addresses && Array.isArray(addresses) && addresses.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="breakfast_address">Breakfast Address</Label>
                <Select
                  value={formData.delivery_addresses?.breakfast || ""}
                  onValueChange={(value) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      delivery_addresses: {
                        ...prev.delivery_addresses,
                        breakfast: value,
                      },
                    }));
                  }}
                >
                  <SelectTrigger id="breakfast_address">
                    <SelectValue placeholder="Select address for breakfast" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Same as default</SelectItem>
                    {addresses.map((addr: any) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label || addr.address_line1} - {addr.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lunch_address">Lunch Address</Label>
                <Select
                  value={formData.delivery_addresses?.lunch || ""}
                  onValueChange={(value) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      delivery_addresses: {
                        ...prev.delivery_addresses,
                        lunch: value,
                      },
                    }));
                  }}
                >
                  <SelectTrigger id="lunch_address">
                    <SelectValue placeholder="Select address for lunch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Same as default</SelectItem>
                    {addresses.map((addr: any) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label || addr.address_line1} - {addr.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dinner_address">Dinner Address</Label>
                <Select
                  value={formData.delivery_addresses?.dinner || ""}
                  onValueChange={(value) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      delivery_addresses: {
                        ...prev.delivery_addresses,
                        dinner: value,
                      },
                    }));
                  }}
                >
                  <SelectTrigger id="dinner_address">
                    <SelectValue placeholder="Select address for dinner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Same as default</SelectItem>
                    {addresses.map((addr: any) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label || addr.address_line1} - {addr.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              No addresses found. Your default address will be used for all meals.
            </div>
          )}
        </div>

        {/* Visual Timeline */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <Label className="text-sm font-medium mb-3 block">Your Daily Schedule</Label>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Breakfast:</span>
              <span className="font-medium">{formData.breakfast_time || "08:00"}</span>
            </div>
            {formData.snack_times && formData.snack_times.length > 0 && (
              <>
                {formData.snack_times.map((time: string, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-muted-foreground">Snack {index + 1}:</span>
                    <span className="font-medium">{time}</span>
                  </div>
                ))}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lunch:</span>
              <span className="font-medium">{formData.lunch_time || "13:00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dinner:</span>
              <span className="font-medium">{formData.dinner_time || "19:00"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}

