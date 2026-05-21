import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { GOOGLE_MAPS_CONFIG, DEFAULT_MAP_CENTER, DELIVERY_MAP_CONFIG } from '@/lib/googleMapsConfig';

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

interface OptimizedRoute {
  total_distance_km: number;
  total_duration_minutes: number;
  stops: DeliveryStop[];
  route_polyline: string;
  optimized_at: string;
  estimated_completion: string;
}

interface MultiStopRouteMapProps {
  optimizedRoute?: OptimizedRoute;
  currentLocation?: { lat: number; lng: number };
  onStopClick?: (stop: DeliveryStop) => void;
  height?: string;
  className?: string;
  kitchenLocation?: { lat: number; lng: number };
}

export function MultiStopRouteMap({
  optimizedRoute,
  currentLocation,
  onStopClick,
  height = '600px',
  className = '',
  kitchenLocation = DEFAULT_MAP_CENTER
}: MultiStopRouteMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [decodedPolyline, setDecodedPolyline] = useState<google.maps.LatLng[]>([]);

  // Initialize directions service
  useEffect(() => {
    if (map && window.google) {
      setDirectionsService(new window.google.maps.DirectionsService());
    }
  }, [map]);

  // Decode polyline if available
  useEffect(() => {
    if (optimizedRoute?.route_polyline && window.google) {
      try {
        const decoded = window.google.maps.geometry?.encoding?.decodePath(optimizedRoute.route_polyline);
        if (decoded) {
          setDecodedPolyline(decoded);
        }
      } catch (error) {
        console.error('Error decoding polyline:', error);
      }
    }
  }, [optimizedRoute?.route_polyline]);

  // Fit bounds to show all markers
  const fitMapBounds = useCallback(() => {
    if (!map || !optimizedRoute?.stops) return;

    const bounds = new google.maps.LatLngBounds();
    
    // Add kitchen location
    bounds.extend(kitchenLocation);
    
    // Add all stops
    optimizedRoute.stops.forEach(stop => {
      bounds.extend(stop.coordinates);
    });
    
    // Add current location if available
    if (currentLocation) {
      bounds.extend(currentLocation);
    }
    
    map.fitBounds(bounds);
    
    // Adjust zoom level if too zoomed out
    const listener = google.maps.event.addListener(map, 'bounds_changed', () => {
      if (map.getZoom() && map.getZoom()! > 15) {
        map.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }, [map, optimizedRoute, currentLocation, kitchenLocation]);

  useEffect(() => {
    fitMapBounds();
  }, [fitMapBounds]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const getMarkerIcon = useCallback((stop: DeliveryStop) => {
    const size = 50;
    const colorMap = {
      completed: '#10B981', // Green
      next: '#EF4444',     // Red
      upcoming: '#3B82F6'  // Blue
    };
    
    const color = colorMap[stop.status] || '#6B7280';
    const strokeColor = '#FFFFFF';
    const sequence = stop.sequence;
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="${strokeColor}" stroke-width="3"/>
          <text x="${size/2}" y="${size/2 + 8}" text-anchor="middle" fill="white" font-size="18" font-weight="bold">${sequence}</text>
          ${stop.status === 'next' ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"><animate attributeName="r" values="${size/2};${size/2 + 10};${size/2}" dur="2s" repeatCount="indefinite"/></circle>` : ''}
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2)
    };
  }, []);

  const getPolylinePath = useMemo(() => {
    if (!optimizedRoute?.stops.length) return [];
    
    const path: google.maps.LatLng[] = [kitchenLocation];
    
    // Add stops in sequence order
    optimizedRoute.stops
      .sort((a, b) => a.sequence - b.sequence)
      .forEach(stop => {
        path.push(new google.maps.LatLng(stop.coordinates.lat, stop.coordinates.lng));
      });
    
    return path;
  }, [optimizedRoute, kitchenLocation]);

  const mapOptions = useMemo(() => ({
    ...DELIVERY_MAP_CONFIG,
    center: optimizedRoute?.stops[0]?.coordinates || DEFAULT_MAP_CENTER,
    zoom: optimizedRoute?.stops.length === 1 ? DELIVERY_MAP_CONFIG.trackingZoom : DELIVERY_MAP_CONFIG.defaultZoom
  }), [optimizedRoute]);

  if (!optimizedRoute || !optimizedRoute.stops.length) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No active deliveries to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '8px' }}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Kitchen marker */}
        <Marker
          position={kitchenLocation}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#F59E0B" stroke="white" stroke-width="2"/>
                <text x="20" y="28" text-anchor="middle" fill="white" font-size="20">🍳</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }}
          title="Kitchen"
        />

        {/* Delivery stop markers */}
        {optimizedRoute.stops
          .sort((a, b) => a.sequence - b.sequence)
          .map((stop) => (
            <Marker
              key={stop.order_id}
              position={stop.coordinates}
              icon={getMarkerIcon(stop)}
              title={`Stop ${stop.sequence}: ${stop.client_name}`}
              onClick={() => {
                setSelectedMarker(stop.order_id);
                onStopClick?.(stop);
              }}
              animation={stop.status === 'next' ? google.maps.Animation.BOUNCE : undefined}
            >
              {selectedMarker === stop.order_id && (
                <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      {stop.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {stop.status === 'next' && <Navigation className="w-4 h-4 text-red-500 animate-pulse" />}
                      <h3 className="font-semibold text-sm">Stop {stop.sequence}</h3>
                    </div>
                    <p className="font-medium text-sm">{stop.client_name}</p>
                    <p className="text-xs text-gray-600 mt-1">{stop.address}</p>
                    {stop.status === 'next' && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <Clock className="w-3 h-3" />
                          <span>ETA: {stop.eta_minutes} min</span>
                        </div>
                        {stop.distance_to_next_km && (
                          <p className="text-xs text-gray-600 mt-1">
                            {stop.distance_to_next_km.toFixed(1)} km to next
                          </p>
                        )}
                      </div>
                    )}
                    {stop.status === 'upcoming' && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          ETA: {stop.eta_minutes} min
                        </p>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}

        {/* Route polyline */}
        {getPolylinePath.length > 1 && (
          <Polyline
            path={getPolylinePath}
            options={{
              strokeColor: '#10B981',
              strokeWeight: 4,
              strokeOpacity: 0.8,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: '#10B981'
                },
                offset: '50%',
                repeat: '100px'
              }]
            }}
          />
        )}

        {/* Current location marker (if available) */}
        {currentLocation && (
          <Marker
            position={currentLocation}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="15" cy="15" r="12" fill="#EF4444" stroke="white" stroke-width="3"/>
                  <circle cx="15" cy="15" r="5" fill="white"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(30, 30),
              anchor: new google.maps.Point(15, 15)
            }}
            title="Your Location"
            animation={google.maps.Animation.DROP}
          />
        )}
      </GoogleMap>

      {/* Route summary overlay */}
      {optimizedRoute && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 min-w-[250px]"
        >
          <h3 className="font-semibold text-sm mb-2">Delivery Route</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Distance:</span>
              <span className="font-medium">{optimizedRoute.total_distance_km.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Duration:</span>
              <span className="font-medium">{optimizedRoute.total_duration_minutes} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Stops:</span>
              <span className="font-medium">
                {optimizedRoute.stops.filter(s => s.status !== 'completed').length} remaining
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default MultiStopRouteMap;
