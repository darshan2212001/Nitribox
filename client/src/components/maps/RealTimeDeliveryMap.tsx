import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Clock, Truck } from 'lucide-react';
import { GOOGLE_MAPS_CONFIG, DEFAULT_MAP_CENTER, DELIVERY_MAP_CONFIG } from '@/lib/googleMapsConfig';
import { useRealtime } from '@/hooks/use-realtime';

interface DeliveryLocation {
  lat: number;
  lng: number;
  timestamp: string;
  status: 'en_route' | 'nearby' | 'delivered';
}

interface DeliveryOrder {
  id: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  destination: {
    lat: number;
    lng: number;
  };
  status: 'assigned' | 'in_transit' | 'delivered';
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
}

interface RealTimeDeliveryMapProps {
  selectedOrder?: DeliveryOrder;
  deliveryAgentLocation?: DeliveryLocation;
  onLocationUpdate?: (location: DeliveryLocation) => void;
  height?: string;
  className?: string;
  showRoute?: boolean;
  showETA?: boolean;
}

export function RealTimeDeliveryMap({
  selectedOrder,
  deliveryAgentLocation,
  onLocationUpdate,
  height = '400px',
  className = '',
  showRoute = true,
  showETA = true
}: RealTimeDeliveryMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  // Real-time location updates
  useRealtime({
    events: ['delivery.location_update', 'delivery.route_updated', 'delivery.eta_changed'],
    onEvent: (event) => {
      if (event.data.order_id === selectedOrder?.id) {
        if (event.type === 'delivery.location_update') {
          const newLocation: DeliveryLocation = {
            lat: event.data.latitude,
            lng: event.data.longitude,
            timestamp: event.timestamp || new Date().toISOString(),
            status: event.data.status || 'en_route'
          };
          onLocationUpdate?.(newLocation);
        } else if (event.type === 'delivery.route_updated') {
          calculateRoute();
        } else if (event.type === 'delivery.eta_changed') {
          setEta(event.data.eta_minutes);
        }
      }
    },
    showToast: false
  });

  // Initialize directions service
  useEffect(() => {
    if (map && window.google) {
      setDirectionsService(new window.google.maps.DirectionsService());
      setDirectionsRenderer(new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#10B981',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      }));
    }
  }, [map]);

  // Calculate route between kitchen and destination
  const calculateRoute = useCallback(async () => {
    if (!directionsService || !directionsRenderer || !selectedOrder) return;

    try {
      const kitchenLocation = DEFAULT_MAP_CENTER; // Kitchen location
      const destination = selectedOrder.destination;

      const result = await directionsService.route({
        origin: kitchenLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
        avoidHighways: false,
        avoidTolls: false
      });

      setRoute(result);
      directionsRenderer.setDirections(result);

      // Calculate ETA and distance
      if (result.routes[0]?.legs[0]) {
        const leg = result.routes[0].legs[0];
        setEta(Math.round(leg.duration?.value || 0 / 60)); // Convert to minutes
        setDistance(Math.round((leg.distance?.value || 0) / 1000)); // Convert to km
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [directionsService, directionsRenderer, selectedOrder]);

  // Calculate route when order changes
  useEffect(() => {
    if (selectedOrder && showRoute) {
      calculateRoute();
    }
  }, [selectedOrder, showRoute, calculateRoute]);

  // Center map on delivery agent location
  useEffect(() => {
    if (map && deliveryAgentLocation) {
      map.panTo({
        lat: deliveryAgentLocation.lat,
        lng: deliveryAgentLocation.lng
      });
    }
  }, [map, deliveryAgentLocation]);

  // Map options
  const mapOptions = useMemo(() => ({
    ...DELIVERY_MAP_CONFIG,
    center: deliveryAgentLocation || selectedOrder?.destination || DEFAULT_MAP_CENTER,
    zoom: deliveryAgentLocation ? DELIVERY_MAP_CONFIG.trackingZoom : DELIVERY_MAP_CONFIG.defaultZoom
  }), [deliveryAgentLocation, selectedOrder]);

  // Markers data
  const markers = useMemo(() => {
    const markersData = [];

    // Kitchen marker
    markersData.push({
      id: 'kitchen',
      position: DEFAULT_MAP_CENTER,
      type: 'kitchen',
      label: 'Kitchen',
      icon: '🍳'
    });

    // Delivery agent marker
    if (deliveryAgentLocation) {
      markersData.push({
        id: 'delivery-agent',
        position: { lat: deliveryAgentLocation.lat, lng: deliveryAgentLocation.lng },
        type: 'delivery-agent',
        label: 'Delivery Agent',
        icon: '🚚',
        status: deliveryAgentLocation.status
      });
    }

    // Destination marker
    if (selectedOrder) {
      markersData.push({
        id: 'destination',
        position: selectedOrder.destination,
        type: 'destination',
        label: selectedOrder.clientName,
        icon: '🏠'
      });
    }

    return markersData;
  }, [deliveryAgentLocation, selectedOrder]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMarkerClick = useCallback((markerId: string) => {
    setSelectedMarker(selectedMarker === markerId ? null : markerId);
  }, [selectedMarker]);

  const getMarkerIcon = (type: string, status?: string) => {
    const baseSize = 40;
    const colors = {
      kitchen: '#F59E0B',
      'delivery-agent': status === 'delivered' ? '#10B981' : '#EF4444',
      destination: '#3B82F6'
    };

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${colors[type as keyof typeof colors] || '#6B7280'}" stroke="white" stroke-width="2"/>
          <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${type === 'kitchen' ? '🍳' : type === 'delivery-agent' ? '🚚' : '🏠'}</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(baseSize, baseSize),
      anchor: new google.maps.Point(baseSize / 2, baseSize / 2)
    };
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '8px' }}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Render route */}
        {showRoute && route && directionsRenderer && (
          <div ref={(ref) => {
            if (ref && directionsRenderer) {
              directionsRenderer.setMap(map);
            }
          }} />
        )}

        {/* Render markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={getMarkerIcon(marker.type, marker.status)}
            onClick={() => onMarkerClick(marker.id)}
            animation={marker.type === 'delivery-agent' ? google.maps.Animation.BOUNCE : undefined}
          >
            {selectedMarker === marker.id && (
              <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                <div className="p-2">
                  <h3 className="font-semibold text-sm">{marker.label}</h3>
                  {marker.type === 'delivery-agent' && deliveryAgentLocation && (
                    <div className="text-xs text-gray-600 mt-1">
                      <p>Status: {deliveryAgentLocation.status}</p>
                      <p>Last Update: {new Date(deliveryAgentLocation.timestamp).toLocaleTimeString()}</p>
                    </div>
                  )}
                  {marker.type === 'destination' && selectedOrder && (
                    <div className="text-xs text-gray-600 mt-1">
                      <p>{selectedOrder.clientAddress}</p>
                      <p>Phone: {selectedOrder.clientPhone}</p>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>

      {/* ETA and Distance Info */}
      {showETA && (eta || distance) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="absolute top-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 min-w-[220px] z-20"
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">Delivery Info</span>
          </div>
          <div className="space-y-2.5">
            {eta && (
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <Truck className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Time</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eta} minutes</p>
                </div>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{distance} km</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Loading overlay */}
      {!map && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg flex items-center justify-center backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-10 w-10 border-2 border-primary/30"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading map...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preparing live tracking</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default RealTimeDeliveryMap;
