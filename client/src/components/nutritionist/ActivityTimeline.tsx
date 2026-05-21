import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  CheckCircle2,
  Scale,
  Heart,
  Calendar,
  Utensils,
  MessageSquare,
  Clock,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface ActivityTimelineProps {
  activities: any[];
}

const activityIcons: Record<string, any> = {
  meal_checkin: Utensils,
  weight_log: Scale,
  symptom_log: Heart,
  consultation: Calendar,
  plan_update: CheckCircle2,
  nutritionist_note: MessageSquare,
};

const activityLabels: Record<string, string> = {
  meal_checkin: "Meal Check-in",
  weight_log: "Weight Logged",
  symptom_log: "Symptom Logged",
  consultation: "Consultation",
  plan_update: "Plan Updated",
  nutritionist_note: "Note Added",
};

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activities yet"
        description="User activities will appear here"
      />
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((acc: any, activity: any) => {
    const date = format(new Date(activity.created_at), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedActivities).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dateActivities = groupedActivities[date];
            return (
              <div key={date} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {format(new Date(date), "MMMM d, yyyy")}
                  </span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  {dateActivities.map((activity: any) => {
                    const Icon = activityIcons[activity.activity_type] || Clock;
                    const label = activityLabels[activity.activity_type] || activity.activity_type;
                    return (
                      <div key={activity.id} className="flex gap-3 pb-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), "h:mm a")}
                            </span>
                          </div>
                          {activity.activity_data && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {typeof activity.activity_data === "string" ? (
                                <p>{activity.activity_data}</p>
                              ) : (
                                <div className="space-y-1">
                                  {Object.entries(activity.activity_data).map(
                                    ([key, value]: [string, any]) => (
                                      <div key={key} className="flex gap-2">
                                        <span className="font-medium capitalize">
                                          {key.replace(/_/g, " ")}:
                                        </span>
                                        <span>{String(value)}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

