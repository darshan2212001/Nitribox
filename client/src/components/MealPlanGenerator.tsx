import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Utensils, 
  Target, 
  Clock,
  CheckCircle,
  Plus,
  Save,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface MealPlanTemplate {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks?: string[];
  };
}

interface Client {
  id: string;
  name: string;
  email: string;
  subscription_id?: string;
  current_plan?: string;
  goals: string[];
  dietary_restrictions: string[];
  target_calories: number;
  target_weight?: number;
  current_weight?: number;
}

interface MealPlanGeneratorProps {
  clients: Client[];
  onGeneratePlan: (clientId: string, plan: any) => void;
  onUpdatePlan: (clientId: string, plan: any) => void;
  preSelectedClientId?: string;
  editMode?: boolean;
}

export default function MealPlanGenerator({ 
  clients, 
  onGeneratePlan, 
  onUpdatePlan,
  preSelectedClientId,
  editMode = false
}: MealPlanGeneratorProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customPlan, setCustomPlan] = useState({
    calories: 1500,
    protein: 60,
    carbs: 200,
    fats: 50,
    meals: {
      breakfast: '',
      lunch: '',
      dinner: '',
      snacks: [] as string[]
    },
    notes: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingSchedule, setExistingSchedule] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'create' | 'calendar' | 'edit'>('create');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // Set pre-selected client on mount
  useEffect(() => {
    if (preSelectedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === preSelectedClientId || c.user_id === preSelectedClientId);
      if (client) {
        setSelectedClient(client);
        if (editMode) {
          setViewMode('calendar');
        }
      }
    }
  }, [preSelectedClientId, clients, editMode]);

  // Fetch existing schedule for selected client
  const { data: subscriptionsData } = useQuery({
    queryKey: [`/api/subscriptions/client/${selectedClient?.id || selectedClient?.user_id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!selectedClient && editMode,
  });

  // Fetch daily schedule when subscription is found
  useEffect(() => {
    if (subscriptionsData && Array.isArray(subscriptionsData) && subscriptionsData.length > 0) {
      const activeSubscription = subscriptionsData.find((sub: any) => sub.status === "active");
      if (activeSubscription) {
        // Fetch daily schedule
        fetch(`http://localhost:8000/api/subscriptions/${activeSubscription.id}/daily-schedule`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })
          .then(res => res.json())
          .then(data => {
            if (data.schedules) {
              setExistingSchedule(data.schedules);
            }
          })
          .catch(err => console.error('Failed to fetch schedule:', err));
      }
    }
  }, [subscriptionsData]);

  const mealPlanTemplates: MealPlanTemplate[] = [
    {
      id: 'weight-loss',
      name: 'Weight Loss Plan',
      description: 'Low calorie, high protein plan for sustainable weight loss',
      calories: 1200,
      protein: 80,
      carbs: 120,
      fats: 40,
      meals: {
        breakfast: 'Oats with berries and Greek yogurt',
        lunch: 'Grilled chicken salad with quinoa',
        dinner: 'Baked fish with steamed vegetables',
        snacks: ['Apple with almond butter', 'Green tea']
      }
    },
    {
      id: 'muscle-gain',
      name: 'Muscle Gain Plan',
      description: 'High protein, calorie-dense plan for muscle building',
      calories: 2200,
      protein: 120,
      carbs: 250,
      fats: 80,
      meals: {
        breakfast: 'Protein pancakes with banana',
        lunch: 'Chicken rice bowl with vegetables',
        dinner: 'Salmon with sweet potato and broccoli',
        snacks: ['Protein shake', 'Mixed nuts', 'Greek yogurt']
      }
    },
    {
      id: 'maintenance',
      name: 'Maintenance Plan',
      description: 'Balanced nutrition plan for weight maintenance',
      calories: 1800,
      protein: 90,
      carbs: 200,
      fats: 60,
      meals: {
        breakfast: 'Whole grain toast with avocado',
        lunch: 'Turkey wrap with vegetables',
        dinner: 'Lean beef with brown rice and salad',
        snacks: ['Fruit', 'Trail mix']
      }
    },
    {
      id: 'diabetic-friendly',
      name: 'Diabetic Friendly Plan',
      description: 'Low glycemic index plan for blood sugar control',
      calories: 1600,
      protein: 70,
      carbs: 150,
      fats: 55,
      meals: {
        breakfast: 'Steel-cut oats with nuts',
        lunch: 'Grilled fish with quinoa and vegetables',
        dinner: 'Chicken with roasted vegetables',
        snacks: ['Berries', 'Cheese cubes']
      }
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    const template = mealPlanTemplates.find(t => t.id === templateId);
    if (template) {
      setCustomPlan({
        calories: template.calories,
        protein: template.protein,
        carbs: template.carbs,
        fats: template.fats,
        meals: { ...template.meals },
        notes: template.description
      });
      setSelectedTemplate(templateId);
    }
  };

  const handleGeneratePlan = async () => {
    if (!selectedClient) {
      toast({
        title: "No client selected",
        description: "Please select a client to generate a meal plan for.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const plan = {
        ...customPlan,
        client_id: selectedClient.id,
        template_id: selectedTemplate,
        generated_at: new Date().toISOString(),
        nutritionist_notes: customPlan.notes
      };

      await onGeneratePlan(selectedClient.id, plan);
      
      toast({
        title: "Meal plan generated successfully!",
        description: `Custom meal plan created for ${selectedClient.name}.`,
      });
    } catch (error) {
      toast({
        title: "Error generating meal plan",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedClient) return;

    setIsGenerating(true);
    try {
      const updatedPlan = {
        ...customPlan,
        client_id: selectedClient.id,
        updated_at: new Date().toISOString(),
        nutritionist_notes: customPlan.notes
      };

      await onUpdatePlan(selectedClient.id, updatedPlan);
      
      toast({
        title: "Meal plan updated successfully!",
        description: `Meal plan updated for ${selectedClient.name}.`,
      });
    } catch (error) {
      toast({
        title: "Error updating meal plan",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addSnack = () => {
    setCustomPlan(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        snacks: [...prev.meals.snacks, '']
      }
    }));
  };

  const updateSnack = (index: number, value: string) => {
    setCustomPlan(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        snacks: prev.meals.snacks.map((snack, i) => i === index ? value : snack)
      }
    }));
  };

  const removeSnack = (index: number) => {
    setCustomPlan(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        snacks: prev.meals.snacks.filter((_, i) => i !== index)
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(clientId) => {
            const client = clients.find(c => c.id === clientId);
            setSelectedClient(client || null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a client to create meal plan for" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{client.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {client.current_plan || 'No Plan'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClient && (
        <>
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-blue-500" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">{selectedClient.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Calories</p>
                  <p className="font-semibold">{selectedClient.target_calories} cal/day</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Goals</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClient.goals.map((goal, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dietary Restrictions</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClient.dietary_restrictions.map((restriction, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {restriction}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                Meal Plan Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mealPlanTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      {selectedTemplate === template.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-blue-600 font-medium">{template.calories} cal</span>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="text-green-600 font-medium">{template.protein}g protein</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Plan Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Customize Meal Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Macronutrients */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Calories</label>
                    <Input
                      type="number"
                      value={customPlan.calories}
                      onChange={(e) => setCustomPlan(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Protein (g)</label>
                    <Input
                      type="number"
                      value={customPlan.protein}
                      onChange={(e) => setCustomPlan(prev => ({ ...prev, protein: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                    <Input
                      type="number"
                      value={customPlan.carbs}
                      onChange={(e) => setCustomPlan(prev => ({ ...prev, carbs: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fats (g)</label>
                    <Input
                      type="number"
                      value={customPlan.fats}
                      onChange={(e) => setCustomPlan(prev => ({ ...prev, fats: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                {/* Meals */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Breakfast</label>
                    <Input
                      value={customPlan.meals.breakfast}
                      onChange={(e) => setCustomPlan(prev => ({ 
                        ...prev, 
                        meals: { ...prev.meals, breakfast: e.target.value }
                      }))}
                      placeholder="Enter breakfast details"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Lunch</label>
                    <Input
                      value={customPlan.meals.lunch}
                      onChange={(e) => setCustomPlan(prev => ({ 
                        ...prev, 
                        meals: { ...prev.meals, lunch: e.target.value }
                      }))}
                      placeholder="Enter lunch details"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dinner</label>
                    <Input
                      value={customPlan.meals.dinner}
                      onChange={(e) => setCustomPlan(prev => ({ 
                        ...prev, 
                        meals: { ...prev.meals, dinner: e.target.value }
                      }))}
                      placeholder="Enter dinner details"
                    />
                  </div>

                  {/* Snacks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Snacks</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSnack}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Snack
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {customPlan.meals.snacks.map((snack, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={snack}
                            onChange={(e) => updateSnack(index, e.target.value)}
                            placeholder={`Snack ${index + 1}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSnack(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1">Nutritionist Notes</label>
                  <Textarea
                    value={customPlan.notes}
                    onChange={(e) => setCustomPlan(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any specific instructions or notes for the client..."
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Plan'}
                  </Button>
                  <Button
                    onClick={handleUpdatePlan}
                    variant="outline"
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Update Plan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

