import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Moon,
  Save,
  RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface NotificationSettings {
  mealSkipped: { toast: boolean; sound: boolean; desktop: boolean };
  mealConsumed: { toast: boolean; sound: boolean; desktop: boolean };
  consultationScheduled: { toast: boolean; sound: boolean; desktop: boolean };
  weeklyReportReady: { toast: boolean; sound: boolean; desktop: boolean };
  quietHours: { enabled: boolean; start: string; end: string };
}

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
}

export default function NotificationSettings({ settings, onSettingsChange }: NotificationSettingsProps) {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const { toast } = useToast();

  const handleSave = () => {
    onSettingsChange(localSettings);
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated",
    });
  };

  const handleReset = () => {
    const defaultSettings: NotificationSettings = {
      mealSkipped: { toast: true, sound: false, desktop: true },
      mealConsumed: { toast: false, sound: false, desktop: false },
      consultationScheduled: { toast: true, sound: true, desktop: true },
      weeklyReportReady: { toast: true, sound: false, desktop: true },
      quietHours: { enabled: false, start: "22:00", end: "08:00" },
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
    toast({
      title: "Settings reset",
      description: "Notification settings have been reset to defaults",
    });
  };

  const updateEventSetting = (
    eventKey: keyof NotificationSettings,
    settingKey: "toast" | "sound" | "desktop",
    value: boolean
  ) => {
    if (eventKey === "quietHours") return;
    
    setLocalSettings(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] as any),
        [settingKey]: value,
      },
    }));
  };

  const updateQuietHours = (key: "enabled" | "start" | "end", value: boolean | string) => {
    setLocalSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value,
      },
    }));
  };

  const notificationEvents = [
    {
      key: "mealSkipped" as const,
      label: "Meal Skipped",
      description: "When a client skips a meal",
      icon: Bell,
    },
    {
      key: "mealConsumed" as const,
      label: "Meal Consumed",
      description: "When a client consumes a meal",
      icon: Bell,
    },
    {
      key: "consultationScheduled" as const,
      label: "Consultation Scheduled",
      description: "When a new consultation is booked",
      icon: Bell,
    },
    {
      key: "weeklyReportReady" as const,
      label: "Weekly Report Ready",
      description: "When a weekly report is generated",
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notification Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure how you receive notifications for different events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Event Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Event Notifications</CardTitle>
          <CardDescription>
            Choose how you want to be notified for each type of event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationEvents.map((event) => {
            const Icon = event.icon;
            const eventSettings = localSettings[event.key] as { toast: boolean; sound: boolean; desktop: boolean };
            
            return (
              <div key={event.key} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-semibold">{event.label}</Label>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8">
                  {/* Toast Notification */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor={`${event.key}-toast`} className="text-sm">
                        Toast Notification
                      </Label>
                    </div>
                    <Switch
                      id={`${event.key}-toast`}
                      checked={eventSettings.toast}
                      onCheckedChange={(checked) =>
                        updateEventSetting(event.key, "toast", checked)
                      }
                    />
                  </div>

                  {/* Sound Notification */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {eventSettings.sound ? (
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Label htmlFor={`${event.key}-sound`} className="text-sm">
                        Sound Alert
                      </Label>
                    </div>
                    <Switch
                      id={`${event.key}-sound`}
                      checked={eventSettings.sound}
                      onCheckedChange={(checked) =>
                        updateEventSetting(event.key, "sound", checked)
                      }
                    />
                  </div>

                  {/* Desktop Notification */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor={`${event.key}-desktop`} className="text-sm">
                        Desktop Notification
                      </Label>
                    </div>
                    <Switch
                      id={`${event.key}-desktop`}
                      checked={eventSettings.desktop}
                      onCheckedChange={(checked) =>
                        updateEventSetting(event.key, "desktop", checked)
                      }
                      disabled={typeof Notification === "undefined" || Notification.permission === "denied"}
                    />
                  </div>
                </div>

                {event.key !== notificationEvents[notificationEvents.length - 1].key && (
                  <Separator className="my-4" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="quiet-hours-enabled" className="text-base font-semibold">
                Enable Quiet Hours
              </Label>
              <p className="text-sm text-muted-foreground">
                Mute all notifications during specified hours
              </p>
            </div>
            <Switch
              id="quiet-hours-enabled"
              checked={localSettings.quietHours.enabled}
              onCheckedChange={(checked) => updateQuietHours("enabled", checked)}
            />
          </div>

          {localSettings.quietHours.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-2 gap-4 pt-4"
            >
              <div className="space-y-2">
                <Label htmlFor="quiet-hours-start">Start Time</Label>
                <Input
                  id="quiet-hours-start"
                  type="time"
                  value={localSettings.quietHours.start}
                  onChange={(e) => updateQuietHours("start", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-hours-end">End Time</Label>
                <Input
                  id="quiet-hours-end"
                  type="time"
                  value={localSettings.quietHours.end}
                  onChange={(e) => updateQuietHours("end", e.target.value)}
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Notification Permission Status */}
      {typeof Notification !== "undefined" && (
        <Card>
          <CardHeader>
            <CardTitle>Desktop Notification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Permission Status: {Notification.permission}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Notification.permission === "granted"
                    ? "You will receive desktop notifications"
                    : Notification.permission === "denied"
                    ? "Desktop notifications are blocked. Please enable them in your browser settings."
                    : "Click the button below to enable desktop notifications"}
                </p>
              </div>
              {Notification.permission !== "granted" && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                      toast({
                        title: "Notifications enabled",
                        description: "Desktop notifications are now enabled",
                      });
                    } else {
                      toast({
                        title: "Notifications blocked",
                        description: "Please enable notifications in your browser settings",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Enable Desktop Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

