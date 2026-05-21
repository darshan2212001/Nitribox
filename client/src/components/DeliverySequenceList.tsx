import { motion } from 'framer-motion';
import { CheckCircle2, Clock, MapPin, Phone, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface DeliveryStop {
  sequence: number;
  order_id: string;
  client_name: string;
  client_phone?: string;
  address: string;
  coordinates: { lat: number; lng: number };
  eta_minutes: number;
  distance_from_start_km: number;
  distance_to_next_km?: number;
  status: 'next' | 'upcoming' | 'completed';
  priority: string;
}

interface DeliverySequenceListProps {
  stops: DeliveryStop[];
  onStopClick?: (stop: DeliveryStop) => void;
  onCompleteStop?: (orderId: string) => void;
  className?: string;
}

export function DeliverySequenceList({
  stops,
  onStopClick,
  onCompleteStop,
  className = ''
}: DeliverySequenceListProps) {
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

  const getStatusIcon = (status: DeliveryStop['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'next':
        return <Navigation className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'upcoming':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DeliveryStop['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'next':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Next</Badge>;
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (sortedStops.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No active deliveries</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Delivery Sequence</h3>
        <Badge variant="outline">
          {sortedStops.filter(s => s.status !== 'completed').length} remaining
        </Badge>
      </div>

      {sortedStops.map((stop, index) => (
        <motion.div
          key={stop.order_id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              stop.status === 'next'
                ? 'border-2 border-red-500 bg-red-50/50'
                : stop.status === 'completed'
                ? 'opacity-60 border-green-200'
                : 'border-gray-200'
            }`}
            onClick={() => onStopClick?.(stop)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Sequence number and status icon */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      stop.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : stop.status === 'next'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {stop.sequence}
                  </div>
                </div>

                {/* Stop details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm truncate">
                        {stop.client_name}
                      </h4>
                      {getStatusBadge(stop.status)}
                    </div>
                    <div className="flex-shrink-0">{getStatusIcon(stop.status)}</div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{stop.address}</span>
                    </div>

                    {stop.client_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{stop.client_phone}</span>
                      </div>
                    )}

                    {stop.status !== 'completed' && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span className="font-medium">ETA: {formatTime(stop.eta_minutes)}</span>
                        </div>
                        {stop.distance_to_next_km && stop.status === 'next' && (
                          <span className="text-gray-500">
                            {stop.distance_to_next_km.toFixed(1)} km to next
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {stop.priority === 'urgent' && (
                    <Badge variant="destructive" className="mt-2 text-xs">
                      Urgent
                    </Badge>
                  )}

                  {/* Complete button for next stop */}
                  {stop.status === 'next' && onCompleteStop && (
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteStop(stop.order_id);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark as Delivered
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Route summary */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3">Route Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Stops:</span>
              <span className="font-medium">{sortedStops.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium text-green-600">
                {sortedStops.filter(s => s.status === 'completed').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className="font-medium text-blue-600">
                {sortedStops.filter(s => s.status !== 'completed').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeliverySequenceList;
