// Google Maps configuration for web client
export const GOOGLE_MAPS_CONFIG = {
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDbE_tFwdDaYPVTw1b_PemueJ3FB1TIuOY',
  libraries: ['places', 'geometry'] as const,
  region: 'IN', // India
  language: 'en',
  mapId: 'nutribox-delivery-map'
};

// Default map center (Mumbai, India)
export const DEFAULT_MAP_CENTER = {
  lat: 19.0760,
  lng: 72.8777
};

// Map styles for different themes
export const MAP_STYLES = {
  light: [
    {
      featureType: 'all',
      elementType: 'geometry.fill',
      stylers: [{ weight: '2.00' }]
    },
    {
      featureType: 'all',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#9c9c9c' }]
    },
    {
      featureType: 'all',
      elementType: 'labels.text',
      stylers: [{ visibility: 'on' }]
    }
  ],
  dark: [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
  ]
};

// Delivery map configuration
export const DELIVERY_MAP_CONFIG = {
  defaultZoom: 12,
  trackingZoom: 15,
  maxZoom: 18,
  minZoom: 8,
  gestureHandling: 'greedy' as const,
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: false
};
