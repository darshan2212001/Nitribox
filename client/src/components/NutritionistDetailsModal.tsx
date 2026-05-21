import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  User,
  Mail,
  Phone,
  Star,
  Calendar,
  Users,
  Award,
  Edit,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getQueryFn } from "@/lib/queryClient";

interface NutritionistDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nutritionistId: string;
  nutritionistName?: string;
  onEdit?: (nutritionistId: string) => void;
}

export default function NutritionistDetailsModal({
  isOpen,
  onClose,
  nutritionistId,
  nutritionistName: initialNutritionistName,
  onEdit,
}: NutritionistDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch nutritionist details
  const { data: nutritionistData, isLoading: nutritionistLoading } = useQuery({
    queryKey: [`/api/nutritionists/${nutritionistId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!nutritionistId,
  });

  // Fetch assigned clients
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: [`/api/clients`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen && !!nutritionistId,
  });

  const nutritionistName = nutritionistData?.name || initialNutritionistName || "Nutritionist";
  const assignedClients = Array.isArray(clientsData)
    ? clientsData.filter((client: any) => client.nutritionistId === nutritionistId || client.nutritionist_id === nutritionistId)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={nutritionistData?.imageUrl || nutritionistData?.image_url} />
              <AvatarFallback>{nutritionistName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <span>{nutritionistName}</span>
          </DialogTitle>
        </DialogHeader>

        {nutritionistLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="clients">Assigned Clients ({assignedClients.length})</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Email:</span>
                        <p className="font-medium">{nutritionistData?.email || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Phone:</span>
                        <p className="font-medium">{nutritionistData?.phone || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Specialization:</span>
                        <p className="font-medium">{nutritionistData?.specialization || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Experience:</span>
                        <p className="font-medium">{nutritionistData?.experienceYears || nutritionistData?.experience_years || 0} years</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">Rating:</span>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{nutritionistData?.rating?.toFixed(1) || "0.0"}</p>
                          <span className="text-xs text-muted-foreground">
                            ({nutritionistData?.reviewCount || nutritionistData?.review_count || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={nutritionistData?.isAvailable !== false ? "default" : "secondary"}>
                        {nutritionistData?.isAvailable !== false ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {nutritionistData?.bio && (
                      <div>
                        <span className="text-sm text-muted-foreground">Bio:</span>
                        <p className="text-sm mt-1">{nutritionistData.bio}</p>
                      </div>
                    )}
                    {nutritionistData?.tagline && (
                      <div>
                        <span className="text-sm text-muted-foreground">Tagline:</span>
                        <p className="text-sm mt-1 font-medium">{nutritionistData.tagline}</p>
                      </div>
                    )}
                    {nutritionistData?.qualifications && (
                      <div>
                        <span className="text-sm text-muted-foreground">Qualifications:</span>
                        <p className="text-sm mt-1">{nutritionistData.qualifications}</p>
                      </div>
                    )}
                    {nutritionistData?.city && (
                      <div>
                        <span className="text-sm text-muted-foreground">City:</span>
                        <p className="text-sm mt-1">{nutritionistData.city}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {onEdit && (
                <div className="flex justify-end">
                  <Button onClick={() => onEdit(nutritionistId)} className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Nutritionist
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="clients" className="space-y-4 mt-4">
              {clientsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : assignedClients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No clients assigned yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {assignedClients.map((client: any) => (
                    <Card key={client.id || client.user_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>
                                {(client.name || `Client ${client.id}`).split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{client.name || `Client ${client.id}`}</p>
                              <p className="text-sm text-muted-foreground">
                                {client.weightStart && client.weightGoal && `${client.weightStart}kg → ${client.weightGoal}kg`}
                              </p>
                            </div>
                          </div>
                          <Badge variant={client.status === "active" ? "default" : "secondary"}>
                            {client.status || "Active"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Total Clients
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{assignedClients.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Currently assigned</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Average Rating
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      {nutritionistData?.rating?.toFixed(1) || "0.0"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {nutritionistData?.reviewCount || nutritionistData?.review_count || 0} reviews
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      {nutritionistData?.experienceYears || nutritionistData?.experience_years || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Years of experience</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

