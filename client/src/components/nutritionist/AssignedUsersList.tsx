import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQueryFn } from "@/lib/queryClient";
import { Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/EmptyState";

interface AssignedUsersListProps {
  onUserSelect: (userId: string) => void;
}

export default function AssignedUsersList({ onUserSelect }: AssignedUsersListProps) {
  const { data: assignedUsers, isLoading } = useQuery({
    queryKey: ["/api/nutritionist/assigned-users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const newAssignments = assignedUsers?.filter((user: any) => user.is_new_assignment) || [];
  const activeUsers = assignedUsers?.filter((user: any) => !user.is_new_assignment) || [];

  return (
    <div className="space-y-6">
      {/* New Assignments */}
      {newAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              New Assignments ({newAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {newAssignments.map((user: any) => (
                <Card
                  key={user.user_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-primary"
                  onClick={() => onUserSelect(user.user_id)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{user.user_name}</h3>
                          <Badge variant="default" className="text-xs">New</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {user.meal_plan_title}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {user.health_flags?.slice(0, 3).map((flag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users ({activeUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No active users"
              description="Users assigned to you will appear here"
            />
          ) : (
            <div className="space-y-3">
              {activeUsers.map((user: any) => (
                <Card
                  key={user.user_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onUserSelect(user.user_id)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{user.user_name}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3" />
                            <span>
                              Adherence: {user.adherence_percentage !== null ? `${user.adherence_percentage}%` : "N/A"}
                            </span>
                          </div>
                          {user.last_activity && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>
                                Last activity: {format(new Date(user.last_activity), "MMM d, yyyy")}
                              </span>
                            </div>
                          )}
                          {user.next_consultation && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Next consultation: {format(new Date(user.next_consultation), "MMM d, yyyy")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

