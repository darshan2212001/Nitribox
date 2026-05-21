import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  X,
  User,
  Calendar,
  Utensils,
  FileText,
  MessageSquare,
  TrendingUp,
  Scale,
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName?: string;
  onScheduleConsultation?: (clientId: string) => void;
  onUpdateMealPlan?: (clientId: string) => void;
  onContactClient?: (clientId: string) => void;
}

export default function ClientDetailsModal({
  isOpen,
  onClose,
  clientId,
  clientName: initialClientName,
  onScheduleConsultation,
  onUpdateMealPlan,
  onContactClient,
}: ClientDetailsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Fetch client details
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!clientId,
  });

  // Fetch weekly reports
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: [`/api/reports/weekly/client/${clientId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!clientId,
  });

  // Fetch subscriptions
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery({
    queryKey: [`/api/subscriptions/client/${clientId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!clientId,
  });

  // Fetch consultations
  const { data: consultationsData, isLoading: consultationsLoading } = useQuery({
    queryKey: [`/api/consultations/client/${clientId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!clientId,
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ reportId, notes }: { reportId: string; notes: string }) => {
      return apiRequest("PATCH", `/api/reports/weekly/${reportId}`, {
        nutritionist_notes: notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notes updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/reports/weekly/client/${clientId}`] });
      setEditingNotes(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notes",
        variant: "destructive",
      });
    },
  });

  const clientName = clientData?.name || initialClientName || "Client";
  const latestReport = Array.isArray(reportsData) && reportsData.length > 0 ? reportsData[0] : null;
  const activeSubscription = Array.isArray(subscriptionsData)
    ? subscriptionsData.find((sub: any) => sub.status === "active")
    : null;
  const upcomingConsultations = Array.isArray(consultationsData)
    ? consultationsData
        .filter((c: any) => {
          // Support both camelCase (API format) and snake_case (legacy)
          const dateValue = c.scheduledDate || c.date || c.sessionDate;
          if (!dateValue) return false;
          const date = new Date(dateValue);
          return date >= new Date() && (c.status === "scheduled" || c.status === "confirmed");
        })
        .sort((a: any, b: any) => {
          // Support both camelCase (API format) and snake_case (legacy)
          const dateAValue = a.scheduledDate || a.date || a.sessionDate;
          const dateBValue = b.scheduledDate || b.date || b.sessionDate;
          if (!dateAValue || !dateBValue) return 0;
          const dateA = new Date(dateAValue).getTime();
          const dateB = new Date(dateBValue).getTime();
          return dateA - dateB;
        })
    : [];

  const handleEditNotes = (reportId: string, currentNotes: string) => {
    setEditingNotes(reportId);
    setNotesText(currentNotes || "");
  };

  const handleSaveNotes = (reportId: string) => {
    updateNotesMutation.mutate({ reportId, notes: notesText });
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback>{clientName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <span>{clientName}</span>
          </DialogTitle>
        </DialogHeader>

        {clientLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="meal-plans">Meal Plans</TabsTrigger>
              <TabsTrigger value="consultations">Consultations</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{clientData?.email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{clientData?.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={activeSubscription ? "default" : "secondary"}>
                        {activeSubscription ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestReport ? (
                      <>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Meal Completion</span>
                            <span className="font-semibold">{latestReport.completion_rate || 0}%</span>
                          </div>
                          <Progress value={latestReport.completion_rate || 0} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Meals Consumed:</span>
                            <p className="font-semibold">{latestReport.meals_consumed || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Meals Skipped:</span>
                            <p className="font-semibold text-red-600">{latestReport.meals_skipped || 0}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">No data available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                {onScheduleConsultation && (
                  <Button onClick={() => onScheduleConsultation(clientId)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Consultation
                  </Button>
                )}
                {onUpdateMealPlan && (
                  <Button variant="outline" onClick={() => onUpdateMealPlan(clientId)}>
                    <Utensils className="w-4 h-4 mr-2" />
                    Update Meal Plan
                  </Button>
                )}
                {onContactClient && (
                  <Button variant="outline" onClick={() => onContactClient(clientId)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Client
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-4 mt-4">
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !Array.isArray(reportsData) || reportsData.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No progress reports available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reportsData.map((report: any, index: number) => (
                    <Card key={report.id || index}>
                      <CardHeader>
                        <CardTitle className="text-lg">Week {report.week_number}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <span className="text-sm text-muted-foreground">Meals Delivered</span>
                            <p className="text-lg font-semibold">{report.total_meals_delivered || 0}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Meals Consumed</span>
                            <p className="text-lg font-semibold text-green-600">{report.meals_consumed || 0}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Meals Skipped</span>
                            <p className="text-lg font-semibold text-red-600">{report.meals_skipped || 0}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Avg Calories/Day</span>
                            <p className="text-lg font-semibold">{report.avg_calories_per_day || 0}</p>
                          </div>
                        </div>
                        {report.weight_change !== null && report.weight_change !== undefined && (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <Scale className="w-5 h-5 text-primary" />
                            <div>
                              <span className="text-sm text-muted-foreground">Weight Change:</span>
                              <p className={`font-semibold ${report.weight_change > 0 ? "text-red-600" : "text-green-600"}`}>
                                {report.weight_change > 0 ? "+" : ""}{report.weight_change} kg
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="meal-plans" className="space-y-4 mt-4">
              {subscriptionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !Array.isArray(subscriptionsData) || subscriptionsData.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No meal plans found</p>
                    {onUpdateMealPlan && (
                      <Button onClick={() => onUpdateMealPlan(clientId)}>
                        Create Meal Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {subscriptionsData.map((subscription: any, index: number) => (
                    <Card key={subscription.id || index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            Subscription #{subscription.id?.slice(-6) || "N/A"}
                          </CardTitle>
                          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                            {subscription.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <p className="font-semibold">{subscription.duration_days} days</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Meals per Day:</span>
                            <p className="font-semibold">{subscription.meals_per_day}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Start Date:</span>
                            <p className="font-semibold">
                              {subscription.start_date
                                ? new Date(subscription.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">End Date:</span>
                            <p className="font-semibold">
                              {subscription.end_date
                                ? new Date(subscription.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="consultations" className="space-y-4 mt-4">
              {consultationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !Array.isArray(consultationsData) || consultationsData.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No consultations found</p>
                    {onScheduleConsultation && (
                      <Button onClick={() => onScheduleConsultation(clientId)}>
                        Schedule Consultation
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {consultationsData.map((consultation: any, index: number) => {
                    // Support both camelCase (API format) and snake_case (legacy)
                    const consultationDateValue = consultation.scheduledDate || consultation.date || consultation.sessionDate;
                    const consultationDate = consultationDateValue ? new Date(consultationDateValue) : null;
                    const isUpcoming = consultationDate ? consultationDate >= new Date() : false;
                    return (
                      <Card key={consultation.id || index}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold">
                                  {consultationDate 
                                    ? `${consultationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${consultationDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                                    : 'Date TBD'}
                                </span>
                                <Badge
                                  variant={
                                    consultation.status === "completed"
                                      ? "default"
                                      : consultation.status === "scheduled"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {consultation.status}
                                </Badge>
                              </div>
                              {consultation.notes && (
                                <p className="text-sm text-muted-foreground mt-2">{consultation.notes}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !Array.isArray(reportsData) || reportsData.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No reports available to add notes</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reportsData.map((report: any, index: number) => (
                    <Card key={report.id || index}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Week {report.week_number} Notes</CardTitle>
                          {editingNotes === report.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveNotes(report.id)}
                                disabled={updateNotesMutation.isPending}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditNotes(report.id, report.nutritionist_notes || "")}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {editingNotes === report.id ? (
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Add notes about this week's progress..."
                            className="min-h-[100px]"
                          />
                        ) : (
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {report.nutritionist_notes || "No notes added yet. Click Edit to add notes."}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

