import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { log } from '../lib/logger';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface LocationError {
  code: string;
  message: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.LocationPermissionResponse | null>(null);

  // Request location permissions
  const requestPermissions = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus({ status } as Location.LocationPermissionResponse);

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to use this feature. Please enable it in your device settings.'
        );
        return false;
      }

      return true;
    } catch (err) {
      const error = err as LocationError;
      setError(error);
      log.error('Error requesting location permissions', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current location
  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
      };

      setLocation(locationData);
      return locationData;
    } catch (err) {
      const error = err as LocationError;
      setError(error);
      log.error('Error getting current location', error);
      Alert.alert('Error', 'Failed to get current location');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Start watching location
  const startWatchingLocation = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const hasPermission = await requestPermissions();
      if (!hasPermission) return false;

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
            timestamp: location.timestamp,
          };
          setLocation(locationData);
        }
      );

      // Store subscription for cleanup
      (window as any).locationSubscription = subscription;
      return true;
    } catch (err) {
      const error = err as LocationError;
      setError(error);
      log.error('Error watching location', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Stop watching location
  const stopWatchingLocation = () => {
    if ((window as any).locationSubscription) {
      (window as any).locationSubscription.remove();
      (window as any).locationSubscription = null;
    }
  };

  // Get location with timeout
  const getLocationWithTimeout = async (timeout: number = 10000): Promise<LocationData | null> => {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(null);
      }, timeout);

      try {
        const location = await getCurrentLocation();
        clearTimeout(timeoutId);
        resolve(location);
      } catch (error) {
        clearTimeout(timeoutId);
        resolve(null);
      }
    });
  };

  // Calculate distance between two points
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Get address from coordinates
  const getAddressFromCoordinates = async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        return `${addr.street || ''} ${addr.city || ''} ${addr.region || ''} ${addr.country || ''}`.trim();
      }
      
      return null;
    } catch (error) {
      log.error('Error getting address', error);
      return null;
    }
  };

  // Get coordinates from address
  const getCoordinatesFromAddress = async (address: string): Promise<LocationData | null> => {
    try {
      const coordinates = await Location.geocodeAsync(address);
      
      if (coordinates.length > 0) {
        const coord = coordinates[0];
        return {
          latitude: coord.latitude,
          longitude: coord.longitude,
          timestamp: Date.now(),
        };
      }
      
      return null;
    } catch (error) {
      log.error('Error getting coordinates', error);
      return null;
    }
  };

  // Check if location services are enabled
  const isLocationEnabled = async (): Promise<boolean> => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      log.error('Error checking location services', error);
      return false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, []);

  return {
    location,
    error,
    isLoading,
    permissionStatus,
    getCurrentLocation,
    startWatchingLocation,
    stopWatchingLocation,
    getLocationWithTimeout,
    calculateDistance,
    getAddressFromCoordinates,
    getCoordinatesFromAddress,
    isLocationEnabled,
    requestPermissions,
  };
}