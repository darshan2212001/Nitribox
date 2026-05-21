import React, { useState, useRef, useEffect } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Search, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationAutocompleteProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  value?: string;
  onClear?: () => void;
}

export function LocationAutocomplete({
  onPlaceSelected,
  placeholder = 'Search for an address...',
  className = '',
  disabled = false,
  value = '',
  onClear
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry) {
        onPlaceSelected(place);
        setInputValue(place.formatted_address || '');
        setIsOpen(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      onClear?.();
    }
  };

  const handleInputFocus = () => {
    if (inputValue.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleSuggestionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setInputValue(prediction.description);
    setIsOpen(false);
    
    // Create a mock place result
    const mockPlace: google.maps.places.PlaceResult = {
      place_id: prediction.place_id,
      formatted_address: prediction.description,
      geometry: {
        location: new google.maps.LatLng(0, 0) // Will be updated by geocoding
      },
      name: prediction.structured_formatting?.main_text || prediction.description
    };
    
    onPlaceSelected(mockPlace);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Google Places Autocomplete (hidden) */}
      <Autocomplete
        onLoad={(autocomplete) => {
          autocompleteRef.current = autocomplete;
        }}
        onPlaceChanged={handlePlaceChanged}
        options={{
          types: ['address'],
          componentRestrictions: { country: 'in' }, // Restrict to India
          fields: ['place_id', 'formatted_address', 'geometry', 'name']
        }}
      >
        <div style={{ display: 'none' }} />
      </Autocomplete>

      {/* Custom suggestions dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.place_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.structured_formatting?.main_text}
                  </p>
                  {suggestion.structured_formatting?.secondary_text && (
                    <p className="text-xs text-gray-500 truncate">
                      {suggestion.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook for geocoding addresses to coordinates
export function useGeocoding() {
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setGeocoder(new google.maps.Geocoder());
    }
  }, []);

  const geocodeAddress = async (address: string): Promise<google.maps.GeocoderResult[] | null> => {
    if (!geocoder) return null;

    setIsLoading(true);
    try {
      const results = await geocoder.geocode({ address });
      return results.results;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<google.maps.GeocoderResult[] | null> => {
    if (!geocoder) return null;

    setIsLoading(true);
    try {
      const results = await geocoder.geocode({ 
        location: { lat, lng } 
      });
      return results.results;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    geocodeAddress,
    reverseGeocode,
    isLoading
  };
}

export default LocationAutocomplete;
