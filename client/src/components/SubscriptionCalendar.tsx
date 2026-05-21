import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MealSchedule {
  id: string;
  date: string;
  breakfast_item: string;
  breakfast_calories: number;
  breakfast_status: string;
  lunch_item: string;
  lunch_calories: number;
  lunch_status: string;
  dinner_item: string;
  dinner_calories: number;
  dinner_status: string;
  notes?: string;
}

interface SubscriptionCalendarProps {
  subscription: any;
  mealSchedules: MealSchedule[];
  onMealClick?: (meal: any) => void;
}

export default function SubscriptionCalendar({ 
  subscription, 
  mealSchedules, 
  onMealClick 
}: SubscriptionCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'skipped':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'consumed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'skipped':
        return 'bg-red-100 text-red-800';
      case 'consumed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedDayMeals = mealSchedules.find(schedule => 
    schedule.date === selectedDate
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const currentDate = new Date();
  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            My Subscription Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {subscription?.duration_days || 30}
              </div>
              <div className="text-sm text-muted-foreground">Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {subscription?.meals_per_day || 3}
              </div>
              <div className="text-sm text-muted-foreground">Meals/Day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {subscription?.status || 'Active'}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Meal Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-2"></div>;
              }
              
              const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayMeals = mealSchedules.find(schedule => schedule.date === dateString);
              const isSelected = dateString === selectedDate;
              const isToday = dateString === new Date().toISOString().split('T')[0];
              
              return (
                <motion.button
                  key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`}
                  onClick={() => setSelectedDate(dateString)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : isToday 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-gray-100'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {day}
                  {dayMeals && (
                    <div className="flex justify-center gap-1 mt-1">
                      <div className={`w-1 h-1 rounded-full ${
                        dayMeals.breakfast_status === 'consumed' ? 'bg-green-500' : 
                        dayMeals.breakfast_status === 'skipped' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                      <div className={`w-1 h-1 rounded-full ${
                        dayMeals.lunch_status === 'consumed' ? 'bg-green-500' : 
                        dayMeals.lunch_status === 'skipped' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                      <div className={`w-1 h-1 rounded-full ${
                        dayMeals.dinner_status === 'consumed' ? 'bg-green-500' : 
                        dayMeals.dinner_status === 'skipped' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      {selectedDayMeals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {formatDate(selectedDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Breakfast */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    B
                  </div>
                  <div>
                    <div className="font-medium">{selectedDayMeals.breakfast_item}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDayMeals.breakfast_calories} calories
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedDayMeals.breakfast_status)}>
                    {selectedDayMeals.breakfast_status}
                  </Badge>
                  {getStatusIcon(selectedDayMeals.breakfast_status)}
                </div>
              </div>

              {/* Lunch */}
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    L
                  </div>
                  <div>
                    <div className="font-medium">{selectedDayMeals.lunch_item}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDayMeals.lunch_calories} calories
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedDayMeals.lunch_status)}>
                    {selectedDayMeals.lunch_status}
                  </Badge>
                  {getStatusIcon(selectedDayMeals.lunch_status)}
                </div>
              </div>

              {/* Dinner */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    D
                  </div>
                  <div>
                    <div className="font-medium">{selectedDayMeals.dinner_item}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDayMeals.dinner_calories} calories
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedDayMeals.dinner_status)}>
                    {selectedDayMeals.dinner_status}
                  </Badge>
                  {getStatusIcon(selectedDayMeals.dinner_status)}
                </div>
              </div>

              {selectedDayMeals.notes && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Notes:</strong> {selectedDayMeals.notes}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No meals for selected date */}
      {!selectedDayMeals && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No meals scheduled for {formatDate(selectedDate)}
            </h3>
            <p className="text-sm text-muted-foreground">
              Your nutritionist hasn't planned meals for this day yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

