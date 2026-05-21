import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Volume2, VolumeX, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function DeliveryNotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("delivery_notification_settings");
    return saved ? JSON.parse(saved) : {
      newAssignment: { toast: true, sound: true, desktop: true },
      reassignment: { toast: true, sound: true, desktop: true },
      deliveryCompleted: { toast: true, sound: false, desktop: false },
      locationUpdate: { toast: false, sound: false, desktop: false },
      quietHours: { enabled: false, start: "22:00", end: "08:00" }
    };
  });

  useEffect(() => {
    localStorage.setItem("delivery_notification_settings", JSON.stringify(settings));
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
    localStorage.setItem("delivery_notification_settings", JSON.stringify(settings));
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
          <CardTitle>New Delivery Assignment</CardTitle>
          <CardDescription>Notifications when a new delivery is assigned to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-assignment-toast">Toast Notification</Label>
            <Switch
              id="new-assignment-toast"
              checked={settings.newAssignment.toast}
              onCheckedChange={(checked) => updateSetting("newAssignment", "toast", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-assignment-sound">Sound</Label>
            <Switch
              id="new-assignment-sound"
              checked={settings.newAssignment.sound}
              onCheckedChange={(checked) => updateSetting("newAssignment", "sound", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-assignment-desktop">Desktop Notification</Label>
            <Switch
              id="new-assignment-desktop"
              checked={settings.newAssignment.desktop}
              onCheckedChange={(checked) => updateSetting("newAssignment", "desktop", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Reassignment</CardTitle>
          <CardDescription>Notifications when a delivery is reassigned</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reassignment-toast">Toast Notification</Label>
            <Switch
              id="reassignment-toast"
              checked={settings.reassignment.toast}
              onCheckedChange={(checked) => updateSetting("reassignment", "toast", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="reassignment-sound">Sound</Label>
            <Switch
              id="reassignment-sound"
              checked={settings.reassignment.sound}
              onCheckedChange={(checked) => updateSetting("reassignment", "sound", checked)}
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

