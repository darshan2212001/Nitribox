import { useState } from 'react';
import { Edit, Save, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  Activity,
  Scale
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ClientProgress {
  client_id: string;
  client_name: string;
  subscription_id: string;
  week_number: number;
  total_meals_delivered: number;
  meals_consumed: number;
  meals_skipped: number;
  total_calories: number;
  avg_calories_per_day: number;
  weight_change?: number;
  current_weight?: number;
  target_weight?: number;
  completion_rate: number;
  last_consultation?: string;
  next_consultation?: string;
  nutritionist_notes?: string;
  goals_achieved?: string[];
  concerns?: string[];
}

interface ClientProgressDashboardProps {
  clients: ClientProgress[];
  onViewClientDetails: (clientId: string) => void;
  onScheduleConsultation: (clientId: string) => void;
  onUpdateNotes: (clientId: string, notes: string) => void;
}

export default function ClientProgressDashboard({ 
  clients, 
  onViewClientDetails,
  onScheduleConsultation,
  onUpdateNotes
}: ClientProgressDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const getPriorityLevel = (client: ClientProgress) => {
    if (client.completion_rate < 70) return 'high';
    if (client.meals_skipped > 5) return 'medium';
    if (client.completion_rate >= 90) return 'low';
    return 'medium';
  };

  const highPriorityClients = clients.filter(c => getPriorityLevel(c) === 'high');
  const mediumPriorityClients = clients.filter(c => getPriorityLevel(c) === 'medium');
  const lowPriorityClients = clients.filter(c => getPriorityLevel(c) === 'low');

  const totalClients = clients.length;
  const avgCompletionRate = clients.reduce((sum, c) => sum + c.completion_rate, 0) / totalClients;
  const totalMealsDelivered = clients.reduce((sum, c) => sum + c.total_meals_delivered, 0);
  const totalMealsConsumed = clients.reduce((sum, c) => sum + c.meals_consumed, 0);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{Math.round(avgCompletionRate)}%</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meals Delivered</p>
                <p className="text-2xl font-bold">{totalMealsDelivered}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Meals Consumed</p>
                <p className="text-2xl font-bold">{totalMealsConsumed}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority-based Client Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="high-priority">High Priority ({highPriorityClients.length})</TabsTrigger>
          <TabsTrigger value="medium-priority">Medium Priority ({mediumPriorityClients.length})</TabsTrigger>
          <TabsTrigger value="low-priority">Low Priority ({lowPriorityClients.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="high-priority" className="space-y-4">
          {highPriorityClients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-600 mb-2">No High Priority Clients</h3>
                <p className="text-muted-foreground">All clients are performing well!</p>
              </CardContent>
            </Card>
          ) : (
            highPriorityClients.map((client) => (
              <ClientProgressCard
                key={client.client_id}
                client={client}
                onViewDetails={() => onViewClientDetails(client.client_id)}
                onScheduleConsultation={() => onScheduleConsultation(client.client_id)}
                priority="high"
                onUpdateNotes={onUpdateNotes}
                editingNotesFor={editingNotesFor}
                setEditingNotesFor={setEditingNotesFor}
                notesText={notesText}
                setNotesText={setNotesText}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="medium-priority" className="space-y-4">
          {mediumPriorityClients.map((client) => (
            <ClientProgressCard
              key={client.client_id}
              client={client}
              onViewDetails={() => onViewClientDetails(client.client_id)}
              onScheduleConsultation={() => onScheduleConsultation(client.client_id)}
              priority="medium"
              onUpdateNotes={onUpdateNotes}
              editingNotesFor={editingNotesFor}
              setEditingNotesFor={setEditingNotesFor}
              notesText={notesText}
              setNotesText={setNotesText}
            />
          ))}
        </TabsContent>

        <TabsContent value="low-priority" className="space-y-4">
          {lowPriorityClients.map((client) => (
            <ClientProgressCard
              key={client.client_id}
              client={client}
              onViewDetails={() => onViewClientDetails(client.client_id)}
              onScheduleConsultation={() => onScheduleConsultation(client.client_id)}
              priority="low"
              onUpdateNotes={onUpdateNotes}
              editingNotesFor={editingNotesFor}
              setEditingNotesFor={setEditingNotesFor}
              notesText={notesText}
              setNotesText={setNotesText}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ClientProgressCardProps {
  client: ClientProgress;
  onViewDetails: () => void;
  onScheduleConsultation: () => void;
  priority: 'high' | 'medium' | 'low';
  onUpdateNotes?: (clientId: string, notes: string) => void;
  editingNotesFor?: string | null;
  setEditingNotesFor?: (clientId: string | null) => void;
  notesText?: string;
  setNotesText?: (text: string) => void;
}

function ClientProgressCard({ 
  client, 
  onViewDetails, 
  onScheduleConsultation, 
  priority,
  onUpdateNotes,
  editingNotesFor,
  setEditingNotesFor,
  notesText,
  setNotesText
}: ClientProgressCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWeightChangeIcon = (change?: number) => {
    if (!change) return <Scale className="w-4 h-4 text-gray-500" />;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Scale className="w-4 h-4 text-gray-500" />;
  };

  const getWeightChangeColor = (change?: number) => {
    if (!change) return 'text-gray-500';
    if (change > 0) return 'text-red-500';
    if (change < 0) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6 hover-elevate"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground">{client.client_name}</h3>
            <Badge className={getPriorityColor(priority)}>
              {priority.toUpperCase()} PRIORITY
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Week {client.week_number} • Subscription #{client.subscription_id.slice(-6)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
          <Button variant="outline" size="sm" onClick={onScheduleConsultation}>
            <Calendar className="w-4 h-4 mr-1" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Completion Rate */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Completion Rate</span>
            <span className="text-sm font-bold text-blue-600">{client.completion_rate}%</span>
          </div>
          <Progress value={client.completion_rate} className="h-2" />
        </div>

        {/* Weight Progress */}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Weight Change</span>
            <div className={`flex items-center gap-1 text-sm font-bold ${getWeightChangeColor(client.weight_change)}`}>
              {getWeightChangeIcon(client.weight_change)}
              {client.weight_change ? `${client.weight_change > 0 ? '+' : ''}${client.weight_change} kg` : 'No data'}
            </div>
          </div>
          <div className="text-xs text-green-700">
            Current: {client.current_weight || 'N/A'} kg • Target: {client.target_weight || 'N/A'} kg
          </div>
        </div>

        {/* Meal Stats */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-800">Meal Stats</span>
            <span className="text-sm font-bold text-orange-600">{client.meals_consumed}/{client.total_meals_delivered}</span>
          </div>
          <div className="text-xs text-orange-700">
            Skipped: {client.meals_skipped} • Avg: {client.avg_calories_per_day} cal/day
          </div>
        </div>
      </div>

      {/* Next Consultation */}
      {client.next_consultation && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-800">
            Next consultation: {new Date(client.next_consultation).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </span>
        </div>
      )}

      {/* Goals Achieved */}
      {client.goals_achieved && client.goals_achieved.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-green-800 mb-2">Goals Achieved This Week:</p>
          <div className="flex flex-wrap gap-1">
            {client.goals_achieved.map((goal, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                {goal}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Concerns */}
      {client.concerns && client.concerns.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-red-800 mb-2">Concerns:</p>
          <div className="flex flex-wrap gap-1">
            {client.concerns.map((concern, index) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {concern}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Nutritionist Notes */}
      {onUpdateNotes && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Nutritionist Notes</p>
            {editingNotesFor === client.client_id ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onUpdateNotes && setEditingNotesFor && setNotesText) {
                      onUpdateNotes(client.client_id, notesText || '');
                      setEditingNotesFor(null);
                      setNotesText('');
                    }
                  }}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (setEditingNotesFor && setNotesText) {
                      setEditingNotesFor(null);
                      setNotesText('');
                    }
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (setEditingNotesFor && setNotesText) {
                    setEditingNotesFor(client.client_id);
                    setNotesText(client.nutritionist_notes || '');
                  }
                }}
              >
                <Edit className="w-3 h-3 mr-1" />
                {client.nutritionist_notes ? 'Edit' : 'Add'} Notes
              </Button>
            )}
          </div>
          {editingNotesFor === client.client_id ? (
            <Textarea
              value={notesText || ''}
              onChange={(e) => setNotesText?.(e.target.value)}
              placeholder="Add notes about this client's progress..."
              className="min-h-[80px]"
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {client.nutritionist_notes || 'No notes added yet. Click "Add Notes" to add notes.'}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

