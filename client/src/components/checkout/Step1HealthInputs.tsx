import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Step1HealthInputsProps {
  planCategory: string;
  initialData?: any;
  onChange: (data: any) => void;
}

export default function Step1HealthInputs({
  planCategory,
  initialData,
  onChange,
}: Step1HealthInputsProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<any>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const onChangeRef = useRef(onChange);

  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Fetch client data for validation
  const { data: clientData } = useQuery({
    queryKey: [`/api/clients/user/${user?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  // Only call onChange when formData changes, not when onChange prop changes
  useEffect(() => {
    onChangeRef.current(formData);
  }, [formData]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateWeightLossGain = () => {
    const newErrors: Record<string, string> = {};
    const currentWeight = clientData?.weight_start;
    const targetWeight = formData.target_weight;

    if (targetWeight) {
      if (targetWeight <= 0 || targetWeight > 500) {
        newErrors.target_weight = "Please enter a valid weight between 1 and 500 kg";
      } else if (currentWeight) {
        const category = planCategory.toLowerCase();
        const isWeightLoss = category.includes("weight loss") || category.includes("weight-loss");
        const isWeightGain = category.includes("weight gain") || category.includes("weight-gain") || category.includes("muscle");
        
        if (isWeightLoss && targetWeight >= currentWeight) {
          newErrors.target_weight = `Target weight should be less than your current weight (${currentWeight} kg)`;
        } else if (isWeightGain && targetWeight <= currentWeight) {
          newErrors.target_weight = `Target weight should be greater than your current weight (${currentWeight} kg)`;
        }
      }
    }

    if (!formData.timeline) {
      newErrors.timeline = "Please select a timeline";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Weight Loss / Weight Gain Plan
  const renderWeightLossGain = () => {
    const currentWeight = clientData?.weight_start;
    
    return (
    <div className="space-y-6">
      {currentWeight && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your current weight: <strong>{currentWeight} kg</strong>
          </AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="target_weight">Target Weight (kg) *</Label>
        <Input
          id="target_weight"
          type="number"
          placeholder="e.g., 70"
          min="1"
          max="500"
          step="0.1"
          value={formData.target_weight || ""}
          onChange={(e) => {
            const value = e.target.value ? parseFloat(e.target.value) : "";
            updateField("target_weight", value);
            if (value) validateWeightLossGain();
          }}
          className={errors.target_weight ? "border-destructive" : ""}
        />
        {errors.target_weight && (
          <p className="text-sm text-destructive mt-1">{errors.target_weight}</p>
        )}
        {currentWeight && formData.target_weight && !errors.target_weight && (
          <p className="text-sm text-muted-foreground mt-1">
            Difference: {Math.abs((formData.target_weight - currentWeight).toFixed(1))} kg
          </p>
        )}
      </div>

      <div>
        <Label>Timeline: How soon would you like to achieve it? *</Label>
        <RadioGroup
          value={formData.timeline || ""}
          onValueChange={(value) => {
            updateField("timeline", value);
            validateWeightLossGain();
          }}
          className={errors.timeline ? "border-destructive" : ""}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1-3" id="timeline-1-3" />
            <Label htmlFor="timeline-1-3" className="cursor-pointer">1-3 months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3-6" id="timeline-3-6" />
            <Label htmlFor="timeline-3-6" className="cursor-pointer">3-6 months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="6+" id="timeline-6+" />
            <Label htmlFor="timeline-6+" className="cursor-pointer">More than 6 months</Label>
          </div>
        </RadioGroup>
        {errors.timeline && (
          <p className="text-sm text-destructive mt-1">{errors.timeline}</p>
        )}
      </div>

      <div>
        <Label htmlFor="meals_per_day">How many meals do you currently eat per day?</Label>
        <Input
          id="meals_per_day"
          type="number"
          placeholder="e.g., 3"
          min="1"
          max="6"
          value={formData.meals_per_day || ""}
          onChange={(e) => updateField("meals_per_day", parseInt(e.target.value) || "")}
        />
      </div>

      <div>
        <Label>Do you track calories?</Label>
        <RadioGroup
          value={formData.track_calories || ""}
          onValueChange={(value) => updateField("track_calories", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="calories-yes" />
            <Label htmlFor="calories-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="calories-no" />
            <Label htmlFor="calories-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
    );
  };

  // PCOS / PCOD Friendly Plan
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    formData.symptoms || []
  );
  const [otherSymptom, setOtherSymptom] = useState(formData.other_symptom || "");

  const symptomOptions = ["Acne", "Bloating", "Fatigue", "Mood Swings"];

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      const updated = prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom];
      updateField("symptoms", updated);
      return updated;
    });
  };

  const renderPCOS = () => (
    <div className="space-y-6">
      <div>
        <Label>Are you currently on medication?</Label>
        <RadioGroup
          value={formData.on_medication || ""}
          onValueChange={(value) => updateField("on_medication", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="medication-yes" />
            <Label htmlFor="medication-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="medication-no" />
            <Label htmlFor="medication-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Do you have irregular cycles?</Label>
        <RadioGroup
          value={formData.irregular_cycles || ""}
          onValueChange={(value) => updateField("irregular_cycles", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="cycles-yes" />
            <Label htmlFor="cycles-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="cycles-no" />
            <Label htmlFor="cycles-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Any specific symptoms?</Label>
        <p className="text-sm text-muted-foreground mb-2">Select all that apply</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {symptomOptions.map((symptom) => (
            <Badge
              key={symptom}
              variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80 transition-colors"
              onClick={() => toggleSymptom(symptom)}
            >
              {symptom}
            </Badge>
          ))}
        </div>
        <div className="mt-4">
          <Label htmlFor="other_symptom">Other (please specify)</Label>
          <Textarea
            id="other_symptom"
            placeholder="Describe any other symptoms..."
            value={otherSymptom}
            onChange={(e) => {
              setOtherSymptom(e.target.value);
              updateField("other_symptom", e.target.value);
            }}
          />
        </div>
      </div>
    </div>
  );

  // Diabetic-Friendly Plan
  const renderDiabetic = () => (
    <div className="space-y-6">
      <div>
        <Label>Are you taking insulin, tablets, or both?</Label>
        <RadioGroup
          value={formData.medication_type || ""}
          onValueChange={(value) => updateField("medication_type", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="insulin" id="med-insulin" />
            <Label htmlFor="med-insulin" className="cursor-pointer">Insulin</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tablets" id="med-tablets" />
            <Label htmlFor="med-tablets" className="cursor-pointer">Tablets</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="med-both" />
            <Label htmlFor="med-both" className="cursor-pointer">Both</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Do you monitor blood sugar daily?</Label>
        <RadioGroup
          value={formData.monitor_sugar || ""}
          onValueChange={(value) => updateField("monitor_sugar", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="monitor-yes" />
            <Label htmlFor="monitor-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="monitor-no" />
            <Label htmlFor="monitor-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="fasting_sugar">Average fasting sugar (if known) - mg/dL</Label>
        <Input
          id="fasting_sugar"
          type="number"
          placeholder="e.g., 100"
          min="50"
          max="300"
          value={formData.fasting_sugar || ""}
          onChange={(e) => {
            const value = e.target.value ? parseFloat(e.target.value) : "";
            if (!value || (value >= 50 && value <= 300)) {
              updateField("fasting_sugar", value);
            }
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Normal range: 70-100 mg/dL (fasting)
        </p>
      </div>
    </div>
  );

  // Postpartum / Recovery Plan
  const renderPostpartum = () => {
    const maxDate = new Date().toISOString().split('T')[0];
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 2); // Allow up to 2 years ago
    
    return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="delivery_date">How long ago was your delivery or surgery?</Label>
        <Input
          id="delivery_date"
          type="date"
          max={maxDate}
          min={minDate.toISOString().split('T')[0]}
          value={formData.delivery_date || ""}
          onChange={(e) => updateField("delivery_date", e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Select the date of your delivery or surgery
        </p>
      </div>

      <div>
        <Label htmlFor="food_restrictions">Any food restrictions from your doctor?</Label>
        <Textarea
          id="food_restrictions"
          placeholder="List any food restrictions or dietary guidelines from your doctor..."
          value={formData.food_restrictions || ""}
          onChange={(e) => updateField("food_restrictions", e.target.value)}
        />
      </div>

      <div>
        <Label>Are you breastfeeding?</Label>
        <RadioGroup
          value={formData.breastfeeding || ""}
          onValueChange={(value) => updateField("breastfeeding", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="breastfeeding-yes" />
            <Label htmlFor="breastfeeding-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="breastfeeding-no" />
            <Label htmlFor="breastfeeding-no" className="cursor-pointer">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id="breastfeeding-na" />
            <Label htmlFor="breastfeeding-na" className="cursor-pointer">Not Applicable</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
    );
  };

  // Kids / Senior Citizen Plan
  const renderKidsSenior = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          placeholder="e.g., 8 or 75"
          min="1"
          max="120"
          value={formData.age || ""}
          onChange={(e) => updateField("age", parseInt(e.target.value) || "")}
        />
      </div>

      <div>
        <Label htmlFor="allergies">Any food allergies or dislikes?</Label>
        <Textarea
          id="allergies"
          placeholder="List any food allergies, intolerances, or strong dislikes..."
          value={formData.allergies || ""}
          onChange={(e) => updateField("allergies", e.target.value)}
        />
      </div>

      <div>
        <Label>Preferred portion size</Label>
        <RadioGroup
          value={formData.portion_size || ""}
          onValueChange={(value) => updateField("portion_size", value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="small" id="portion-small" />
            <Label htmlFor="portion-small" className="cursor-pointer">Small</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="medium" id="portion-medium" />
            <Label htmlFor="portion-medium" className="cursor-pointer">Medium</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="large" id="portion-large" />
            <Label htmlFor="portion-large" className="cursor-pointer">Large</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderContent = () => {
    const category = planCategory.toLowerCase();
    // Handle both "weight-loss" (hyphen) and "weight loss" (space) formats
    const normalizedCategory = category.replace(/-/g, " ").replace(/_/g, " ");
    
    if (normalizedCategory.includes("weight loss") || normalizedCategory.includes("weight gain") || 
        category.includes("weight-loss") || category.includes("weight-gain") ||
        category.includes("muscle-gain") || normalizedCategory.includes("muscle gain")) {
      return renderWeightLossGain();
    } else if (normalizedCategory.includes("pcos") || normalizedCategory.includes("pcod") || 
               category.includes("pcos") || category.includes("pcod")) {
      return renderPCOS();
    } else if (normalizedCategory.includes("diabetic") || normalizedCategory.includes("diabetes") ||
               category.includes("diabetes") || category.includes("diabetic")) {
      return renderDiabetic();
    } else if (normalizedCategory.includes("postpartum") || normalizedCategory.includes("recovery") ||
               category.includes("postpartum") || category.includes("recovery")) {
      return renderPostpartum();
    } else if (normalizedCategory.includes("kids") || normalizedCategory.includes("senior") || 
               normalizedCategory.includes("child") || category.includes("kids") || 
               category.includes("senior") || category.includes("child")) {
      return renderKidsSenior();
    } else if (category.includes("heart-health") || normalizedCategory.includes("heart health")) {
      // Heart health plan - similar to general wellness
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor="health_notes">Any specific heart health concerns?</Label>
            <Textarea
              id="health_notes"
              placeholder="Tell us about any heart-related conditions, medications, or dietary restrictions..."
              value={formData.health_notes || ""}
              onChange={(e) => updateField("health_notes", e.target.value)}
            />
          </div>
        </div>
      );
    } else if (category.includes("general-wellness") || normalizedCategory.includes("general wellness")) {
      // General wellness plan
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor="health_notes">Any health concerns or special requirements?</Label>
            <Textarea
              id="health_notes"
              placeholder="Tell us about any health conditions, allergies, or dietary preferences..."
              value={formData.health_notes || ""}
              onChange={(e) => updateField("health_notes", e.target.value)}
            />
          </div>
        </div>
      );
    } else {
      // Default generic questions
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor="health_notes">Any health concerns or special requirements?</Label>
            <Textarea
              id="health_notes"
              placeholder="Tell us about any health conditions, allergies, or dietary preferences..."
              value={formData.health_notes || ""}
              onChange={(e) => updateField("health_notes", e.target.value)}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div>
      <CardHeader>
        <CardTitle>Step 1 of 3 - Health Inputs</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Help us personalize your meal plan by answering a few questions. Fields marked with * are required.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderContent()}
      </CardContent>
    </div>
  );
}
