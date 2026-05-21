// Google Maps configuration for mobile app
import { GOOGLE_MAPS_API_KEY } from './config';

export const GOOGLE_MAPS_CONFIG = {
  apiKey: GOOGLE_MAPS_API_KEY,
  region: 'IN', // India
  language: 'en'
};

// Default map center (Mumbai, India)
export const DEFAULT_MAP_CENTER = {
  latitude: 19.0760,
  longitude: 72.8777
};

// Map configuration
export const MAP_CONFIG = {
  defaultZoom: 12,
  trackingZoom: 15,
  maxZoom: 18,
  minZoom: 8,
  showsUserLocation: true,
  showsMyLocationButton: true,
  showsCompass: true,
  showsScale: true,
  showsBuildings: true,
  showsTraffic: true,
  showsIndoors: true
};

// Marker configurations
export const MARKER_CONFIG = {
  delivery: {
    color: '#10B981', // Green
    size: 40
  },
  kitchen: {
    color: '#F59E0B', // Amber
    size: 35
  },
  client: {
    color: '#3B82F6', // Blue
    size: 30
  },
  current: {
    color: '#EF4444', // Red
    size: 25
  }
};
