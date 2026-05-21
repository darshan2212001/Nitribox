import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deliveryWS } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Users, 
  ShoppingCart, 
  Calendar, 
  Package, 
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Square
} from 'lucide-react';

interface RealtimeEvent {
  type: string;
  data?: any;
  timestamp: string;
  id: string;
}

interface ConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected?: string;
  lastDisconnected?: string;
}

export default function RealtimeTestDashboard() {
  const [activeTab, setActiveTab] = useState<"events" | "stats">("events");
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0
  });
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [testResults, setTestResults] = useState<any>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const { toast } = useToast();

  // Monitor WebSocket connection status
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(prev => ({
        ...prev,
        connected: deliveryWS['ws']?.readyState === WebSocket.OPEN
      }));
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start monitoring all events
  const startMonitoring = () => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    const eventTypes = [
      'meal_plan_created', 'meal_plan_updated', 'meal_plan_deleted',
      'nutritionist_created', 'nutritionist_updated',
      'order_created', 'order_updated', 'order_deleted',
      'client_created', 'client_updated',
      'session_created', 'session_updated',
      'progress_log_created',
      'kitchen_queue_updated',
      'location_update',
      'consultation_booked'
    ];

    const unsubscribers = eventTypes.map(eventType => {
      return deliveryWS.on(eventType, (event: any) => {
        const newEvent: RealtimeEvent = {
          type: eventType,
          data: event.data || event,
          timestamp: new Date().toISOString(),
          id: `${eventType}-${Date.now()}-${Math.random()}`
        };

        setEvents(prev => [newEvent, ...prev.slice(0, 99)]); // Keep last 100 events
        setEventCounts(prev => ({
          ...prev,
          [eventType]: (prev[eventType] || 0) + 1
        }));

        toast({
          title: `Real-time Event: ${eventType}`,
          description: `Received ${eventType} event`,
        });
      });
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  };

  // Stop monitoring
  const stopMonitoring = () => {
    setIsMonitoring(false);
    setEvents([]);
    setEventCounts({});
  };

  // Comprehensive test suite
  const runComprehensiveTests = async () => {
    setIsRunningTests(true);
    setTestResults({});
    
    const tests = [
      { name: 'WebSocket Connection', fn: testWebSocketConnection },
      { name: 'API Endpoints', fn: testAPIEndpoints },
      { name: 'Real-time Events', fn: testRealTimeEvents },
      { name: 'Data Consistency', fn: testDataConsistency },
      { name: 'Error Handling', fn: testErrorHandling },
      { name: 'Cross-Portal Sync', fn: testCrossPortalSync }
    ];
    
    const results: any = {};
    
    for (const test of tests) {
      try {
        toast({
          title: `Running ${test.name}`,
          description: `Testing ${test.name.toLowerCase()}...`,
        });
        
        const result = await test.fn();
        results[test.name] = { status: 'PASS', result };
        
        toast({
          title: `${test.name} Passed`,
          description: `${test.name} test completed successfully`,
        });
      } catch (error) {
        results[test.name] = { status: 'FAIL', error: error.message };
        
        toast({
          title: `${test.name} Failed`,
          description: `${test.name} test failed: ${error.message}`,
          variant: 'destructive'
        });
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setTestResults(results);
    setIsRunningTests(false);
    
    const passed = Object.values(results).filter((r: any) => r.status === 'PASS').length;
    const total = Object.keys(results).length;
    
    toast({
      title: 'Test Suite Complete',
      description: `${passed}/${total} tests passed`,
    });
  };

  const testWebSocketConnection = async () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        ws.close();
        resolve('WebSocket connection successful');
      };
      
      ws.onerror = (error) => {
        reject(new Error('WebSocket connection failed'));
      };
      
      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    });
  };

  const testAPIEndpoints = async () => {
    const endpoints = [
      'http://localhost:8000/api/nutritionists',
      'http://localhost:8000/api/meal-plans',
      'http://localhost:8000/api/orders'
    ];
    
    const results = [];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        results.push(`${endpoint}: ${response.status}`);
      } catch (error) {
        results.push(`${endpoint}: Error - ${error.message}`);
      }
    }
    
    return results.join(', ');
  };

  const testRealTimeEvents = async () => {
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      let eventCount = 0;
      
      ws.onmessage = () => {
        eventCount++;
        if (eventCount >= 3) {
          ws.close();
          resolve(`Received ${eventCount} real-time events`);
        }
      };
      
      // Send test events
      ws.onopen = () => {
        for (let i = 0; i < 3; i++) {
          ws.send(JSON.stringify({
            type: 'test_event',
            data: { message: `Test event ${i + 1}` }
          }));
        }
      };
      
      setTimeout(() => {
        ws.close();
        resolve(`Received ${eventCount} real-time events`);
      }, 3000);
    });
  };

  const testDataConsistency = async () => {
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(fetch('http://localhost:8000/api/nutritionists'));
    }
    
    const responses = await Promise.all(requests);
    const dataSets = await Promise.all(responses.map(r => r.json()));
    
    const firstData = JSON.stringify(dataSets[0]);
    const allSame = dataSets.every(data => JSON.stringify(data) === firstData);
    
    return allSame ? 'Data consistent across requests' : 'Data inconsistency detected';
  };

  const testErrorHandling = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/invalid-endpoint');
      return `Error handling working: ${response.status}`;
    } catch (error) {
      return `Error handling working: ${error.message}`;
    }
  };

  const testCrossPortalSync = async () => {
    return new Promise((resolve) => {
      const clients = [];
      let receivedCount = 0;
      
      // Create multiple clients
      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket('ws://localhost:8000/ws');
        clients.push(ws);
        
        ws.onmessage = () => {
          receivedCount++;
          if (receivedCount >= 2) {
            clients.forEach(c => c.close());
            resolve('Cross-portal sync working');
          }
        };
      }
      
      // Send test event
      setTimeout(() => {
        if (clients[0]) {
          clients[0].send(JSON.stringify({
            type: 'cross_portal_test',
            data: { message: 'Test cross-portal sync' }
          }));
        }
      }, 1000);
      
      setTimeout(() => {
        clients.forEach(c => c.close());
        resolve('Cross-portal sync tested');
      }, 3000);
    });
  };

  const testOrderCreation = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'test-client',
          meal_plan_id: 'test-meal-plan',
          quantity: 1,
          total_amount: 800,
          status: 'pending'
        })
      });

      if (response.ok) {
        toast({
          title: 'Test Order Created',
          description: 'Check if real-time event was received',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to create test order',
        variant: 'destructive'
      });
    }
  };

  const testMealPlanCreation = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Meal Plan',
          description: 'A test meal plan for real-time testing',
          price: 1200,
          duration_days: 7,
          category: 'test',
          image_url: 'https://example.com/test-image.jpg'
        })
      });

      if (response.ok) {
        toast({
          title: 'Test Meal Plan Created',
          description: 'Check if real-time event was received',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to create test meal plan',
        variant: 'destructive'
      });
    }
  };

  const testConsultationBooking = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nutritionist_id: 'test-nutritionist',
          client_id: 'test-client',
          date: new Date().toISOString().split('T')[0],
          time_slot: '10:00',
          notes: 'Test consultation booking'
        })
      });

      if (response.ok) {
        toast({
          title: 'Test Consultation Booked',
          description: 'Check if real-time event was received',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to book test consultation',
        variant: 'destructive'
      });
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'meal_plan_created':
      case 'meal_plan_updated':
      case 'meal_plan_deleted':
        return <Package className="w-4 h-4" />;
      case 'order_created':
      case 'order_updated':
      case 'order_deleted':
        return <ShoppingCart className="w-4 h-4" />;
      case 'nutritionist_created':
      case 'nutritionist_updated':
        return <Users className="w-4 h-4" />;
      case 'session_created':
      case 'session_updated':
        return <Calendar className="w-4 h-4" />;
      case 'progress_log_created':
        return <Activity className="w-4 h-4" />;
      case 'kitchen_queue_updated':
        return <Package className="w-4 h-4" />;
      case 'location_update':
        return <Truck className="w-4 h-4" />;
      case 'consultation_booked':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes('created')) return 'bg-green-100 text-green-800';
    if (eventType.includes('updated')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('deleted')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Real-time Test Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor WebSocket connections and real-time events across all portals
        </p>
      </motion.div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus.connected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            WebSocket Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${connectionStatus.connected ? 'text-green-500' : 'text-red-500'}`}>
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {connectionStatus.reconnectAttempts}
              </div>
              <div className="text-sm text-muted-foreground">Reconnect Attempts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {events.length}
              </div>
              <div className="text-sm text-muted-foreground">Events Received</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Start monitoring and trigger test events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              variant={isMonitoring ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isMonitoring ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Monitoring
                </>
              )}
            </Button>
            
            <Button
              onClick={runComprehensiveTests}
              disabled={isRunningTests}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run All Tests
                </>
              )}
            </Button>
            
            <Button
              onClick={testMealPlanCreation}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Test Meal Plan
            </Button>
            
            <Button
              onClick={testOrderCreation}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Test Order
            </Button>
            
            <Button
              onClick={testConsultationBooking}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Test Consultation
            </Button>
          </div>

          {/* Event Counts */}
          {Object.keys(eventCounts).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Event Counts:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(eventCounts).map(([eventType, count]) => (
                  <Badge key={eventType} variant="secondary" className="flex items-center gap-1">
                    {getEventIcon(eventType)}
                    {eventType}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Log */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Events Log</CardTitle>
          <CardDescription>
            Live feed of all WebSocket events (last 100 events)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="events" className="mt-4">
              <div className="h-96 w-full overflow-y-auto">
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2" />
                      No events received yet. Start monitoring to see real-time events.
                    </div>
                  ) : (
                    events.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-shrink-0">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getEventColor(event.type)}>
                              {event.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {event.data && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {JSON.stringify(event.data, null, 2).slice(0, 100)}...
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="mt-4">
              <div className="space-y-4">
                {/* Event Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(eventCounts).map(([eventType, count]) => (
                    <Card key={eventType}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getEventIcon(eventType)}
                          <span className="font-semibold">{eventType}</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">{count}</div>
                        <div className="text-xs text-muted-foreground">events received</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Test Results */}
                {Object.keys(testResults).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Test Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(testResults).map(([testName, result]: [string, any]) => (
                        <Card key={testName}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {result.status === 'PASS' ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-semibold">{testName}</span>
                            </div>
                            <div className={`text-sm ${result.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                              {result.status}
                            </div>
                            {result.result && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {result.result}
                              </div>
                            )}
                            {result.error && (
                              <div className="text-xs text-red-600 mt-1">
                                {result.error}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
