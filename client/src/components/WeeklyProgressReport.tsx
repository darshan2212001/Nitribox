import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  CheckCircle, 
  XCircle, 
  Download,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { pageTransitionVariants, viewportConfig } from '@/lib/animations';

interface WeeklyProgressReportProps {
  clientId: string;
  weekNumber: number;
  onReportGenerated?: (report: any) => void;
}

interface WeeklyReport {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalMeals: number;
  consumedMeals: number;
  skippedMeals: number;
  totalCalories: number;
  targetCalories: number;
  weightChange: number;
  completionRate: number;
  nutritionistNotes: string;
  recommendations: string[];
  generatedAt: string;
}

export function WeeklyProgressReport({
  clientId,
  weekNumber,
  onReportGenerated
}: WeeklyProgressReportProps) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Subscribe to real-time report updates
  useRealtime({
    events: ['weekly.report_ready', 'meal.consumed', 'meal.skipped'],
    onEvent: (event) => {
      if (event.data.client_id === clientId) {
        if (event.type === 'weekly.report_ready') {
          setReport(event.data.report);
          setLoading(false);
          onReportGenerated?.(event.data.report);
          
          toast({
            title: "📊 Weekly Report Ready",
            description: "Your weekly progress report has been generated",
          });
        } else {
          // Update report stats in real-time
          setReport(prev => {
            if (!prev) return prev;
            
            if (event.type === 'meal.consumed') {
              return {
                ...prev,
                consumedMeals: prev.consumedMeals + 1,
                totalCalories: prev.totalCalories + (event.data.calories || 0)
              };
            } else if (event.type === 'meal.skipped') {
              return {
                ...prev,
                skippedMeals: prev.skippedMeals + 1
              };
            }
            
            return prev;
          });
        }
      }
    },
    showToast: false // We handle toasts manually
  });

  // Generate sample report data
  useEffect(() => {
    const generateReport = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sampleReport: WeeklyReport = {
        id: `report-${weekNumber}`,
        weekNumber,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        totalMeals: 21, // 3 meals × 7 days
        consumedMeals: 18,
        skippedMeals: 3,
        totalCalories: 12600,
        targetCalories: 14700, // 2100 calories per day
        weightChange: -1.2,
        completionRate: 85.7,
        nutritionistNotes: "Great progress this week! You've maintained good consistency with your meal plan. The slight weight loss is healthy and sustainable. Keep up the excellent work!",
        recommendations: [
          "Continue with current meal plan",
          "Increase water intake",
          "Add 10 minutes of daily walking",
          "Consider adding a protein snack in the afternoon"
        ],
        generatedAt: new Date().toISOString()
      };
      
      setReport(sampleReport);
      setLoading(false);
    };

    generateReport();
  }, [weekNumber]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "📊 Report Generated",
      description: "Your weekly progress report is ready",
    });
    
    setGenerating(false);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    
    // Create a simple text report for download
    const reportText = `
ZyaeL NutriBox - Weekly Progress Report
Week ${report.weekNumber} (${report.startDate} to ${report.endDate})

MEAL STATISTICS:
- Total Meals: ${report.totalMeals}
- Consumed: ${report.consumedMeals}
- Skipped: ${report.skippedMeals}
- Completion Rate: ${report.completionRate}%

CALORIE TRACKING:
- Total Calories: ${report.totalCalories}
- Target Calories: ${report.targetCalories}
- Calorie Deficit: ${report.targetCalories - report.totalCalories}

WEIGHT PROGRESS:
- Weight Change: ${report.weightChange > 0 ? '+' : ''}${report.weightChange} kg

NUTRITIONIST NOTES:
${report.nutritionistNotes}

RECOMMENDATIONS:
${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

Generated on: ${new Date(report.generatedAt).toLocaleString()}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-week-${report.weekNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-2/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border">
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Report Available</h3>
          <p className="text-muted-foreground mb-4">
            Generate your weekly progress report to track your nutrition journey
          </p>
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-br from-card via-card to-card/50 border-card-border hover-elevate transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Weekly Progress Report
          </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Week {report.weekNumber}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadReport}
                className="flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Week Info */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">Week {report.weekNumber}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
            </p>
            </div>

          {/* Meal Statistics */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Meal Statistics
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">Consumed</span>
            </div>
                <p className="text-lg font-bold text-emerald-800">{report.consumedMeals}</p>
                <p className="text-xs text-emerald-700">meals</p>
            </div>
              
              <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Skipped</span>
            </div>
                <p className="text-lg font-bold text-destructive">{report.skippedMeals}</p>
                <p className="text-xs text-destructive">meals</p>
          </div>

              <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Total</span>
              </div>
                <p className="text-lg font-bold text-primary">{report.totalMeals}</p>
                <p className="text-xs text-primary">meals</p>
            </div>

              <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-medium text-accent-foreground">Rate</span>
              </div>
                <p className="text-lg font-bold text-accent-foreground">{report.completionRate}%</p>
                <p className="text-xs text-accent-foreground">completion</p>
            </div>
          </div>

            {/* Completion Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">Completion Rate</span>
                <span className="font-medium text-foreground">{report.completionRate}%</span>
              </div>
              <Progress value={report.completionRate} className="h-2" />
              </div>
            </div>

          {/* Calorie Tracking */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Calorie Tracking</h4>
            <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-secondary-foreground">Total Calories</span>
                <span className="font-bold text-secondary-foreground">{report.totalCalories.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-secondary-foreground">Target Calories</span>
                <span className="font-bold text-secondary-foreground">{report.targetCalories.toLocaleString()}</span>
              </div>
              <Progress 
                value={(report.totalCalories / report.targetCalories) * 100} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground mt-2">
                {report.totalCalories < report.targetCalories 
                  ? `${report.targetCalories - report.totalCalories} calories under target`
                  : `${report.totalCalories - report.targetCalories} calories over target`
                }
              </p>
                </div>
              </div>

          {/* Weight Progress */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Weight Progress</h4>
            <div className={`p-4 rounded-lg border ${
              report.weightChange < 0 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${
                  report.weightChange < 0 ? 'text-emerald-600' : 'text-orange-600'
                }`} />
                <span className={`font-bold ${
                  report.weightChange < 0 ? 'text-emerald-800' : 'text-orange-800'
                }`}>
                  {report.weightChange > 0 ? '+' : ''}{report.weightChange} kg
                </span>
              </div>
              <p className={`text-sm ${
                report.weightChange < 0 ? 'text-emerald-700' : 'text-orange-700'
              }`}>
                {report.weightChange < 0 ? 'Weight loss achieved' : 'Weight gain recorded'}
              </p>
              </div>
      </div>

          {/* Nutritionist Notes */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Nutritionist Notes
            </h4>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <p className="text-sm text-foreground">{report.nutritionistNotes}</p>
                </div>
            </div>

      {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Recommendations</h4>
            <div className="space-y-2">
              {report.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20"
                >
                  <div className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                </div>
                  <p className="text-sm text-accent-foreground">{recommendation}</p>
                </motion.div>
              ))}
            </div>
            </div>
          </CardContent>
        </Card>
    </motion.div>
  );
}