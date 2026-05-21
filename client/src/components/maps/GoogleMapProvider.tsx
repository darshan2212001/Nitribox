import React from 'react';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMapsConfig';

interface GoogleMapProviderProps {
  children: React.ReactNode;
}

// Google Maps script loading options
const mapOptions = {
  googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
  libraries: [...GOOGLE_MAPS_CONFIG.libraries] as any[], // Create mutable copy for LoadScript
  region: GOOGLE_MAPS_CONFIG.region,
  language: GOOGLE_MAPS_CONFIG.language,
  mapId: GOOGLE_MAPS_CONFIG.mapId
};

export function GoogleMapProvider({ children }: GoogleMapProviderProps) {
  return (
    <LoadScript {...mapOptions}>
      {children}
    </LoadScript>
  );
}

// Hook to check if Google Maps is loaded
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
    }
  }, []);

  return { isLoaded };
}

// Default map container styles
export const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
  overflow: 'hidden'
};

// Default map options
export const defaultMapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: false,
  gestureHandling: 'greedy' as const,
  styles: [] // Can be customized with MAP_STYLES from config
};

export default GoogleMapProvider;
