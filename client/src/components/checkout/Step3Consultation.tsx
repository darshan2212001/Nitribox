import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Step3ConsultationProps {
  initialData?: {
    preference?: boolean;
    date?: Date | null;
    time_slot?: string | null;
    mode?: string | null;
  };
  onChange: (data: any) => void;
}

export default function Step3Consultation({
  initialData,
  onChange,
}: Step3ConsultationProps) {
  const [wantsConsultation, setWantsConsultation] = useState<boolean>(
    initialData?.preference ?? false
  );
  const [date, setDate] = useState<Date | undefined>(
    initialData?.date ? new Date(initialData.date) : undefined
  );
  const [timeSlot, setTimeSlot] = useState<string>(initialData?.time_slot || "");
  const [mode, setMode] = useState<string>(initialData?.mode || "");
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (wantsConsultation) {
      onChange({
        consultation_preference: true,
        consultation_date: date,
        consultation_time_slot: timeSlot,
        consultation_mode: mode,
      });
    } else {
      onChange({
        consultation_preference: false,
        consultation_date: null,
        consultation_time_slot: null,
        consultation_mode: null,
      });
    }
  }, [wantsConsultation, date, timeSlot, mode, onChange]);

  const handleConfirm = () => {
    if (wantsConsultation && date && timeSlot && mode) {
      setIsConfirmed(true);
    }
  };

  const isFormValid = wantsConsultation ? date && timeSlot && mode : true;

  return (
    <div>
      <CardHeader>
        <CardTitle>Step 3 of 3 - Consultation & Confirmation</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Would you like to schedule a consultation with your nutritionist before starting?
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Consultation Preference */}
        <div>
          <Label className="text-base mb-4 block">
            Would you like to talk to your nutritionist before starting?
          </Label>
          <RadioGroup
            value={wantsConsultation ? "yes" : "no"}
            onValueChange={(value) => {
              setWantsConsultation(value === "yes");
              setIsConfirmed(false);
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="consultation-yes" />
              <Label htmlFor="consultation-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="consultation-no" />
              <Label htmlFor="consultation-no" className="cursor-pointer">No, skip for now</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Consultation Details (if Yes) */}
        {wantsConsultation && (
          <div className="space-y-6 p-4 border rounded-lg bg-muted/50">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Slot */}
            <div className="space-y-2">
              <Label htmlFor="time_slot">Time Slot</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger id="time_slot">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                  <SelectItem value="evening">Evening (5 PM - 8 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode */}
            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Select consultation mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Confirm Button */}
            {!isConfirmed && isFormValid && (
              <Button onClick={handleConfirm} className="w-full">
                Confirm Consultation
              </Button>
            )}

            {/* Confirmation Message */}
            {isConfirmed && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-900">
                      You're all set for a consultation with your nutritionist! 🎉
                    </p>
                    <p className="text-sm text-emerald-700 mt-1">
                      Scheduled for {date && format(date, "PPP")} at {timeSlot} via {mode === "call" ? "Phone Call" : mode === "chat" ? "Chat" : "Video Call"}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!wantsConsultation && (
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            You can schedule a consultation later from your dashboard.
          </div>
        )}
      </CardContent>
    </div>
  );
}

