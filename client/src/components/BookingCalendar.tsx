import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, CheckCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface AvailableSlot {
  date: string;
  time_slot: string;
  available: boolean;
}

interface BookingCalendarProps {
  nutritionistId: string;
  nutritionistName: string;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (bookingDetails: any) => void;
}

export default function BookingCalendar({
  nutritionistId,
  nutritionistName,
  isOpen,
  onClose,
  onBookingSuccess,
}: BookingCalendarProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  // Generate next 30 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Time slots (9 AM to 9 PM, 30-minute intervals)
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
    "21:00"
  ];

  // Fetch available slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, nutritionistId]);

  const fetchAvailableSlots = async (date: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/nutritionists/${nutritionistId}/available-slots?date=${date}`);
      const slots = await res.json();
      setAvailableSlots(slots || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch available slots",
        variant: "destructive",
      });
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a date and time slot",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book a consultation",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    try {
      const res = await apiRequest("POST", "/api/consultations", {
        nutritionist_id: nutritionistId,
        client_id: user.id,
        date: selectedDate,
        time_slot: selectedTimeSlot,
        notes: `Consultation with ${nutritionistName}`,
      });
      const booking = await res.json();

      setBookingDetails({
        nutritionistName,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        bookingId: booking.id,
      });
      setShowSuccess(true);
      onBookingSuccess(booking);
      
      toast({
        title: "Success!",
        description: "Your consultation has been booked successfully",
      });
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book consultation",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleClose = () => {
    setSelectedDate("");
    setSelectedTimeSlot("");
    setAvailableSlots([]);
    setShowSuccess(false);
    setBookingDetails(null);
    onClose();
  };

  const addToCalendar = () => {
    if (!bookingDetails) return;
    
    const startDate = new Date(`${bookingDetails.date}T${bookingDetails.timeSlot}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Consultation with ${bookingDetails.nutritionistName}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=Nutrition consultation session`;
    
    window.open(calendarUrl, '_blank');
  };

  if (showSuccess && bookingDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Booking Confirmed!</DialogTitle>
          </DialogHeader>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="text-center space-y-4"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Consultation Booked Successfully
              </h3>
              <p className="text-muted-foreground">
                Your consultation with {bookingDetails.nutritionistName} has been confirmed.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nutritionist:</span>
                <span className="font-medium">{bookingDetails.nutritionistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{bookingDetails.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{bookingDetails.timeSlot}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={addToCalendar}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
              <Button
                className="flex-1"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Book Consultation with {nutritionistName}
          </DialogTitle>
          <DialogDescription>
            Select a date and time for your consultation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Select Date</h3>
            <div className="grid grid-cols-5 gap-2">
              {generateDates().map((date) => {
                const dateObj = new Date(date);
                const isSelected = selectedDate === date;
                const isToday = date === new Date().toISOString().split('T')[0];
                
                return (
                  <Button
                    key={date}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`h-12 flex flex-col ${
                      isSelected ? "bg-primary text-primary-foreground" : ""
                    }`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="text-xs">
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-medium">
                      {dateObj.getDate()}
                    </span>
                    {isToday && (
                      <span className="text-xs text-primary">Today</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Time Slot Selection */}
          {selectedDate && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Select Time</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading available slots...</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => {
                    const slotData = availableSlots.find(s => s.time_slot === slot);
                    const isAvailable = slotData?.available ?? true;
                    const isSelected = selectedTimeSlot === slot;
                    
                    return (
                      <Button
                        key={slot}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`h-10 ${
                          !isAvailable ? "opacity-50 cursor-not-allowed" : ""
                        } ${
                          isSelected ? "bg-primary text-primary-foreground" : ""
                        }`}
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setSelectedTimeSlot(slot)}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        {slot}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Booking Button */}
          {selectedDate && selectedTimeSlot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4 border-t border-border"
            >
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
                onClick={handleBooking}
                disabled={isBooking}
              >
                {isBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
