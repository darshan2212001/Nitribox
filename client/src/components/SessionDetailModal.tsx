import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  FileText,
  X,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  clientName?: string;
  onUpdate?: () => void;
}

export default function SessionDetailModal({
  isOpen,
  onClose,
  sessionId,
  clientName,
  onUpdate,
}: SessionDetailModalProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState("");
  const [editedTime, setEditedTime] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Fetch session details
  const { data: sessionData, isLoading } = useQuery({
    queryKey: [`/api/consultations/${sessionId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!sessionId,
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { date?: string; time_slot?: string; notes?: string }) => {
      if (!sessionId) throw new Error("Session ID is required");
      return apiRequest("PUT", `/api/consultations/${sessionId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/consultations/${sessionId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update session",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!sessionId) throw new Error("Session ID is required");
      // The endpoint expects status as a query parameter or in the body
      return apiRequest("PUT", `/api/consultations/${sessionId}/status?status=${status}`, {});
    },
    onSuccess: (_, status) => {
      toast({
        title: "Success",
        description: `Session ${status === "cancelled" ? "cancelled" : "completed"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/consultations/${sessionId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/consultations"] });
      if (onUpdate) onUpdate();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update session status",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (sessionData) {
      // Support both camelCase (API format) and snake_case (legacy)
      const sessionDateValue = sessionData.scheduledDate || sessionData.date || sessionData.sessionDate;
      const sessionDate = sessionDateValue ? new Date(sessionDateValue) : new Date();
      setEditedDate(sessionDate.toISOString().split("T")[0]);
      setEditedTime(sessionData.timeSlot || sessionData.time_slot || "");
      setEditedNotes(sessionData.notes || "");
    }
  }, [sessionData]);

  const handleSave = () => {
    updateSessionMutation.mutate({
      date: editedDate,
      time_slot: editedTime,
      notes: editedNotes,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (sessionData) {
      // Support both camelCase (API format) and snake_case (legacy)
      const sessionDateValue = sessionData.scheduledDate || sessionData.date || sessionData.sessionDate;
      const sessionDate = sessionDateValue ? new Date(sessionDateValue) : new Date();
      setEditedDate(sessionDate.toISOString().split("T")[0]);
      setEditedTime(sessionData.timeSlot || sessionData.time_slot || "");
      setEditedNotes(sessionData.notes || "");
    }
  };

  const handleCancelSession = () => {
    setShowCancelDialog(true);
  };

  const handleCompleteSession = () => {
    setShowCompleteDialog(true);
  };

  const confirmCancel = () => {
    updateStatusMutation.mutate("cancelled");
    setShowCancelDialog(false);
  };

  const confirmComplete = () => {
    updateStatusMutation.mutate("completed");
    setShowCompleteDialog(false);
  };

  if (!sessionId) return null;

  const sessionDate = sessionData
    ? new Date(sessionData.date || sessionData.sessionDate)
    : null;
  const isUpcoming = sessionDate ? sessionDate >= new Date() : false;
  const canEdit = isUpcoming && (sessionData?.status === "scheduled" || sessionData?.status === "confirmed");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Session Details
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !sessionData ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Session not found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm text-muted-foreground">Client</Label>
                      <p className="font-semibold">{clientName || "Client"}</p>
                    </div>
                    <Badge
                      variant={
                        sessionData.status === "completed"
                          ? "default"
                          : sessionData.status === "scheduled" || sessionData.status === "confirmed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {sessionData.status}
                    </Badge>
                  </div>

                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={editedDate}
                          onChange={(e) => setEditedDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={editedTime}
                          onChange={(e) => setEditedTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          placeholder="Add notes about this session..."
                          className="min-h-[100px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          disabled={updateSessionMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Date & Time</Label>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">
                            {sessionDate
                              ? sessionDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </p>
                          <Clock className="w-4 h-4 text-muted-foreground ml-4" />
                          <p className="font-medium">{sessionData.timeSlot || sessionData.time_slot || "N/A"}</p>
                        </div>
                      </div>
                      {sessionData.notes && (
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Notes</Label>
                          <p className="text-sm whitespace-pre-wrap">{sessionData.notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        {canEdit && (
                          <Button variant="outline" onClick={() => setIsEditing(true)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="outline"
                            onClick={handleCancelSession}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel Session
                          </Button>
                        )}
                        {isUpcoming && sessionData.status !== "completed" && (
                          <Button
                            onClick={handleCompleteSession}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Session as Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the session as completed. You can still view it in the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete}>
              Mark Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

