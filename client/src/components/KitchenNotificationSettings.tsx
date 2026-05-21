import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Volume2, VolumeX, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function KitchenNotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("kitchen_notification_settings");
    return saved ? JSON.parse(saved) : {
      newOrder: { toast: true, sound: true, desktop: true },
      orderReady: { toast: true, sound: false, desktop: false },
      orderUrgent: { toast: true, sound: true, desktop: true },
      quietHours: { enabled: false, start: "22:00", end: "08:00" }
    };
  });

  useEffect(() => {
    localStorage.setItem("kitchen_notification_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (category: string, key: string, value: boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const updateQuietHours = (key: string, value: string | boolean) => {
    setSettings((prev: any) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    localStorage.setItem("kitchen_notification_settings", JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold">Notification Settings</h2>
        <p className="text-muted-foreground">Configure how you receive notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Order</CardTitle>
          <CardDescription>Notifications when a new order is added to the queue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-order-toast">Toast Notification</Label>
            <Switch
              id="new-order-toast"
              checked={settings.newOrder.toast}
              onCheckedChange={(checked) => updateSetting("newOrder", "toast", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-order-sound">Sound</Label>
            <Switch
              id="new-order-sound"
              checked={settings.newOrder.sound}
              onCheckedChange={(checked) => updateSetting("newOrder", "sound", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-order-desktop">Desktop Notification</Label>
            <Switch
              id="new-order-desktop"
              checked={settings.newOrder.desktop}
              onCheckedChange={(checked) => updateSetting("newOrder", "desktop", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Ready</CardTitle>
          <CardDescription>Notifications when an order is ready for pickup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="order-ready-toast">Toast Notification</Label>
            <Switch
              id="order-ready-toast"
              checked={settings.orderReady.toast}
              onCheckedChange={(checked) => updateSetting("orderReady", "toast", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Urgent Orders</CardTitle>
          <CardDescription>Notifications for high-priority orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="order-urgent-toast">Toast Notification</Label>
            <Switch
              id="order-urgent-toast"
              checked={settings.orderUrgent.toast}
              onCheckedChange={(checked) => updateSetting("orderUrgent", "toast", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="order-urgent-sound">Sound</Label>
            <Switch
              id="order-urgent-sound"
              checked={settings.orderUrgent.sound}
              onCheckedChange={(checked) => updateSetting("orderUrgent", "sound", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Disable notifications during specific hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours-enabled">Enable Quiet Hours</Label>
            <Switch
              id="quiet-hours-enabled"
              checked={settings.quietHours.enabled}
              onCheckedChange={(checked) => updateQuietHours("enabled", checked)}
            />
          </div>
          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => updateQuietHours("start", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => updateQuietHours("end", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </motion.div>
  );
}

