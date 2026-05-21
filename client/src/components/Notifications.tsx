import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, X, Trash2, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  user_id: string;
  notification_type: "push" | "email" | "sms" | "in_app";
  title: string;
  message: string;
  data?: string;
  channel?: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  delivery_provider?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

interface NotificationsProps {
  userId?: string;
  className?: string;
}

export default function Notifications({ userId, className }: NotificationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("unread");
  const targetUserId = userId || user?.id;

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: [`/api/notifications`, targetUserId],
    queryFn: async () => {
      const url = targetUserId 
        ? `/api/notifications?user_id=${targetUserId}`
        : "/api/notifications";
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    enabled: !!targetUserId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}`, { status: "read" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications`, targetUserId] });
      toast({ title: "Notification marked as read" });
    },
  });

  // Note: DELETE endpoint doesn't exist in backend, so we'll just mark as read instead
  const hideNotification = (notificationId: string) => {
    // Just mark as read - we can't delete it
    markAsReadMutation.mutate(notificationId);
  };

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => n.status !== "read");
      await Promise.all(
        unreadNotifications.map(n => 
          apiRequest("PATCH", `/api/notifications/${n.id}`, { status: "read" })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications`, targetUserId] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const unreadNotifications = notifications.filter(n => n.status !== "read");
  const readNotifications = notifications.filter(n => n.status === "read");
  const unreadCount = unreadNotifications.length;

  const filteredNotifications = 
    activeTab === "unread" ? unreadNotifications :
    activeTab === "read" ? readNotifications :
    notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "email":
        return Mail;
      case "sms":
        return MessageSquare;
      case "push":
      case "in_app":
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "normal":
        return "bg-blue-500";
      case "low":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h2 className="text-xl font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[600px]">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {activeTab === "unread" 
                    ? "No unread notifications"
                    : activeTab === "read"
                    ? "No read notifications"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.notification_type);
                  const isUnread = notification.status !== "read";
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className={cn(
                        "transition-all",
                        isUnread && "border-primary shadow-sm"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isUnread ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Icon className={cn(
                                "w-5 h-5",
                                isUnread ? "text-primary" : "text-muted-foreground"
                              )} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className={cn(
                                      "font-semibold text-sm",
                                      isUnread && "font-bold"
                                    )}>
                                      {notification.title}
                                    </h3>
                                    {notification.priority === "urgent" && (
                                      <Badge className={getPriorityColor(notification.priority)}>
                                        Urgent
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {notification.message}
                                  </p>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {isUnread && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => markAsReadMutation.mutate(notification.id)}
                                      disabled={markAsReadMutation.isPending}
                                      title="Mark as read"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    onClick={() => hideNotification(notification.id)}
                                    title="Mark as read"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{notification.notification_type}</span>
                                  {notification.channel && (
                                    <>
                                      <span>•</span>
                                      <span>{notification.channel}</span>
                                    </>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(notification.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

