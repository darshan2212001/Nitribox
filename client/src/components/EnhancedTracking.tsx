import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Download, Plus, Droplets } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NutritionData {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

interface EnhancedTrackingProps {
  nutritionData: NutritionData[];
  onDownloadReport?: () => void;
  onAddWeight?: (weight: number) => void;
}

export default function EnhancedTracking({ 
  nutritionData, 
  onDownloadReport,
  onAddWeight 
}: EnhancedTrackingProps) {
  const [activeTab, setActiveTab] = useState("daily");
  const [waterIntake, setWaterIntake] = useState(6); // glasses
  const [newWeight, setNewWeight] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddWeight = () => {
    if (newWeight && onAddWeight) {
      onAddWeight(parseFloat(newWeight));
      setNewWeight("");
      setDialogOpen(false);
    }
  };

  const addWaterGlass = () => {
    setWaterIntake(prev => Math.min(prev + 1, 12));
  };

  const waterGoal = 8; // 8 glasses daily goal

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">Track Your Progress</h2>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-2"
          onClick={onDownloadReport}
          data-testid="button-download-report"
        >
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6" data-testid="tabs-tracking-period">
          <TabsTrigger value="daily" data-testid="tab-trigger-daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly" data-testid="tab-trigger-weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-trigger-monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          {/* Calorie and Macros */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Today's Nutrition</h3>
            <div className="space-y-4">
              {nutritionData.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">
                      {item.current} / {item.target}{item.unit}
                    </span>
                  </div>
                  <Progress 
                    value={(item.current / item.target) * 100} 
                    className="h-2"
                    style={{
                      // @ts-ignore
                      '--progress-background': item.color
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Water Intake */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-foreground">Water Intake</h3>
              </div>
              <span className="text-sm text-muted-foreground">
                {waterIntake} / {waterGoal} glasses
              </span>
            </div>
            <Progress value={(waterIntake / waterGoal) * 100} className="h-2 mb-4" />
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full"
              onClick={addWaterGlass}
              data-testid="button-add-water-glass"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Glass
            </Button>
          </div>

          {/* Weight Tracking */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Weight Tracking</h3>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    data-testid="button-open-add-weight-dialog"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Weight
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Your Weight</DialogTitle>
                    <DialogDescription>
                      Track your weight progress over time
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="Enter your weight"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        data-testid="input-weight"
                      />
                    </div>
                    <Button
                      className="w-full bg-primary text-primary-foreground rounded-full"
                      onClick={handleAddWeight}
                      data-testid="button-save-weight"
                    >
                      Save Weight
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="text-center py-6">
              <p className="text-3xl font-bold text-primary mb-1">72.5 kg</p>
              <p className="text-sm text-success">↓ 2.5 kg this month</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Daily Calories</span>
                <span className="font-semibold">1,450 kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Protein</span>
                <span className="font-semibold">52g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Water Intake</span>
                <span className="font-semibold">7.5 glasses/day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Weight Change</span>
                <span className="font-semibold text-success">-0.5 kg</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Progress</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Weight Loss</span>
                <span className="font-semibold text-success">-2.5 kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Compliance Rate</span>
                <span className="font-semibold">87%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nutritionist Sessions</span>
                <span className="font-semibold">4 completed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Avg. Water Intake</span>
                <span className="font-semibold">7.2 glasses/day</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
