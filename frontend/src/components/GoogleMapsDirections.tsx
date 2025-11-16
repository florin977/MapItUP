import React, { useEffect, useRef, useState } from 'react';
import { MapPinIcon } from './icons/MapPinIcon';
import { NavigationIcon } from './icons/NavigationIcon';
import { CampusEntrance } from '../types';

interface DirectionsResult {
  duration: string;
  distance: string;
  steps: Array<{
    instruction: string;
    duration: string;
    distance: string;
  }>;
}

const CAMPUS_ENTRANCES: CampusEntrance[] = [
  {
    id: 'd1',
    name: 'Entrance D1',
    lat: 45.7470450,
    lng: 21.2274420
  },
  {
    id: 'main',
    name: 'Main Entrance',
    lat: 45.7474029,
    lng: 21.2268513
  },
  {
    id: 'backB',
    name: 'Back Entrance B',
    lat: 45.7471776,
    lng: 21.2264027
  }
];

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const findClosestEntrance = (fromLat: number, fromLng: number): CampusEntrance => {
  let closestEntrance = CAMPUS_ENTRANCES[0];
  let minDistance = calculateDistance(fromLat, fromLng, closestEntrance.lat, closestEntrance.lng);
  
  for (let i = 1; i < CAMPUS_ENTRANCES.length; i++) {
    const distance = calculateDistance(fromLat, fromLng, CAMPUS_ENTRANCES[i].lat, CAMPUS_ENTRANCES[i].lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestEntrance = CAMPUS_ENTRANCES[i];
    }
  }
  
  return closestEntrance;
};

interface GoogleMapsDirectionsProps {
  selectionMode?: 'from' | 'to' | null;
  onLocationSelected?: (location: { lat: number; lng: number }, name: string, forPoint: 'from' | 'to') => void;
  onCancel?: () => void;
  startLocation?: { lat: number; lng: number };
  destinationName?: string;
  onEntranceSelected?: (entrance: CampusEntrance) => void;
}

const GoogleMapsDirections: React.FC<GoogleMapsDirectionsProps> = ({ 
  selectionMode, 
  onLocationSelected, 
  onCancel,
  startLocation,
  destinationName,
  onEntranceSelected
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [selectedStart, setSelectedStart] = useState<google.maps.LatLng | null>(null);
  const [directionsResult, setDirectionsResult] = useState<DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [error, setError] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedEntrance, setSelectedEntrance] = useState<CampusEntrance | null>(null);

  useEffect(() => {
    if (typeof google !== 'undefined') {
      setMapsReady(true);
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapsReady(true);
      initMap();
    };
    script.onerror = () => {
      setError('Failed to load Google Maps. Please refresh the page.');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 45.7537, lng: 21.2257 },
      zoom: 13,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    CAMPUS_ENTRANCES.forEach(entrance => {
      const marker = new google.maps.Marker({
        position: { lat: entrance.lat, lng: entrance.lng },
        map: mapInstance,
        title: entrance.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#8b5cf6"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(30, 30)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px; font-family: Arial, sans-serif;">
          <strong style="color: #8b5cf6;">${entrance.name}</strong><br/>
          <span style="color: #64748b; font-size: 12px;">UPT Campus Entrance</span>
        </div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance, marker);
      });
    });

    const directionsServiceInstance = new google.maps.DirectionsService();
    const directionsRendererInstance = new google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#8b5cf6',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    });

    setMap(mapInstance);
    setDirectionsService(directionsServiceInstance);
    setDirectionsRenderer(directionsRendererInstance);

    if (searchInputRef.current) {
      const autocompleteInstance = new google.maps.places.Autocomplete(searchInputRef.current, {
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(45.7000, 21.1500),
          new google.maps.LatLng(45.8000, 21.3000)
        ),
        strictBounds: true,
        componentRestrictions: { country: 'ro' }
      });

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (place.geometry && place.geometry.location) {
          const location = place.geometry.location;
          
          if (selectionMode && onLocationSelected) {
            const locationName = place.formatted_address || place.name || 'Selected Location';
            onLocationSelected(
              { lat: location.lat(), lng: location.lng() },
              locationName,
              selectionMode
            );
          } else {
            setSelectedStart(location);
            calculateRouteWithServices(location, directionsServiceInstance, directionsRendererInstance);
          }
        }
      });

      setAutocomplete(autocompleteInstance);
    }

    mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng && !selectionMode) {
        setSelectedStart(e.latLng);
        calculateRouteWithServices(e.latLng, directionsServiceInstance, directionsRendererInstance);
      }
    });
  };

  useEffect(() => {
    if (selectionMode && map) {
      const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && onLocationSelected && selectionMode) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: e.latLng }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const locationName = results[0].formatted_address || 'Selected Location';
              onLocationSelected(
                { lat: e.latLng!.lat(), lng: e.latLng!.lng() },
                locationName,
                selectionMode
              );
            } else {
              onLocationSelected(
                { lat: e.latLng!.lat(), lng: e.latLng!.lng() },
                'Selected Location',
                selectionMode
              );
            }
          });
        }
      });
      return () => {
        clickListener.remove();
      };
    }
  }, [selectionMode, map, onLocationSelected]);

  const calculateRouteWithServices = (
    start: google.maps.LatLng,
    directionsServiceInstance: google.maps.DirectionsService,
    directionsRendererInstance: google.maps.DirectionsRenderer
  ) => {
    setLoading(true);
    setError('');

    const closestEntrance = findClosestEntrance(start.lat(), start.lng());
    setSelectedEntrance(closestEntrance);
    
    if (onEntranceSelected) {
      onEntranceSelected(closestEntrance);
    }

    try {
      const request: google.maps.DirectionsRequest = {
        origin: start,
        destination: { lat: closestEntrance.lat, lng: closestEntrance.lng },
        travelMode: google.maps.TravelMode.WALKING
      };

      directionsServiceInstance.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRendererInstance.setDirections(result);

          const route = result.routes[0];
          const leg = route.legs[0];

          const steps = leg.steps.map(step => ({
            instruction: step.instructions.replace(/<[^>]*>/g, ''),
            duration: step.duration?.text || '',
            distance: step.distance?.text || ''
          }));

          setDirectionsResult({
            duration: leg.duration?.text || '',
            distance: leg.distance?.text || '',
            steps
          });

          setLoading(false);
        } else {
          setError('Could not calculate route. Please try a different location.');
          setLoading(false);
        }
      });
    } catch (err) {
      setError('An error occurred while calculating the route.');
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: google.maps.LatLng) => {
    if (!mapsReady || !directionsService || !directionsRenderer) {
      setError('Map services are still loading. Please wait a moment.');
      return;
    }
    setSelectedStart(location);
    calculateRouteWithServices(location, directionsService, directionsRenderer);
  };

  // Automatically calculate route when startLocation prop is provided
  useEffect(() => {
    if (startLocation && directionsService && directionsRenderer && map) {
      const location = new google.maps.LatLng(startLocation.lat, startLocation.lng);
      map.setCenter(location);
      map.setZoom(14);
      calculateRouteWithServices(location, directionsService, directionsRenderer);
    }
  }, [startLocation, directionsService, directionsRenderer, map]);

  const calculateRoute = async (start: google.maps.LatLng) => {
    if (!directionsService || !directionsRenderer) {
      setError('Map services are not ready. Please try again in a moment.');
      return;
    }

    calculateRouteWithServices(start, directionsService, directionsRenderer);
  };

  const handleUseMyLocation = () => {
    if (!mapsReady || typeof google === 'undefined') {
      setError('Map is still loading. Please wait a moment and try again.');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = new google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude
        );
        if (map) {
          map.setCenter(location);
          map.setZoom(15);
        }
        handleLocationSelect(location);
      },
      () => {
        setError('Could not get your current location.');
        setLoading(false);
      }
    );
  };

  // If startLocation is provided, show full-screen map with route only (no sidebar)
  if (startLocation && !selectionMode) {
    return (
      <div className="w-full h-full">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      <div className="lg:w-2/3 h-full">
        <div className="bg-white dark:bg-brand-surface rounded-2xl shadow-xl border-2 border-violet-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="p-6 border-b-2 border-violet-200 dark:border-slate-800">
            {selectionMode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 dark:text-white bg-clip-text text-transparent">
                    Select {selectionMode === 'from' ? 'Starting' : 'Destination'} Location
                  </h3>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 px-4 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for a location in Timișoara..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 font-medium"
                  />
                  <MapPinIcon className="absolute right-3 top-3.5 w-5 h-5 text-violet-500" />
                </div>
                <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border-2 border-violet-200 dark:border-violet-800">
                  <p className="text-sm font-bold text-violet-900 dark:text-violet-300 mb-1">
                    👆 Or click anywhere on the map
                  </p>
                  <p className="text-xs text-violet-700 dark:text-violet-400">
                    Select your {selectionMode === 'from' ? 'starting point' : 'destination'} for route planning
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 dark:text-white bg-clip-text text-transparent mb-4">
                  Select Your Starting Location
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search for a location in Timișoara..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 font-medium"
                    />
                    <MapPinIcon className="absolute right-3 top-3.5 w-5 h-5 text-violet-500" />
                  </div>
                  <button
                    onClick={handleUseMyLocation}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <NavigationIcon className="w-5 h-5" />
                    <span>{loading ? 'Getting location...' : 'Use My Current Location'}</span>
                  </button>
                  <p className="text-sm text-indigo-700 dark:text-slate-400 font-medium">
                    Or click anywhere on the map to set your starting point
                  </p>
                </div>
              </>
            )}
          </div>
          <div ref={mapRef} className="flex-1 min-h-[400px]" />
        </div>
      </div>

      <div className="lg:w-1/3 h-full overflow-y-auto">
        <div className="bg-white dark:bg-brand-surface rounded-2xl shadow-xl border-2 border-violet-200 dark:border-slate-800 p-6">
          <h3 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 dark:text-white bg-clip-text text-transparent mb-4">
            Route Details
          </h3>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!directionsResult && !loading && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center">
                <MapPinIcon className="w-10 h-10 text-violet-500 dark:text-violet-400" />
              </div>
              <p className="text-indigo-700 dark:text-slate-400 font-semibold">No route selected</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Select a starting location to see directions
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
              <p className="text-indigo-700 dark:text-slate-400 font-semibold">Calculating route...</p>
            </div>
          )}

          {directionsResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl border-2 border-violet-200 dark:border-violet-800">
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase mb-1">Distance</p>
                  <p className="text-2xl font-black text-violet-900 dark:text-white">{directionsResult.distance}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1">Duration</p>
                  <p className="text-2xl font-black text-blue-900 dark:text-white">{directionsResult.duration}</p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-indigo-900 dark:text-white mb-3">Step-by-Step Directions</h4>
                <div className="space-y-3">
                  {directionsResult.steps.map((step, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-indigo-900 dark:text-slate-200 mb-1">
                            {step.instruction}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {step.distance} • {step.duration}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl border-2 border-violet-300 dark:border-violet-800">
                <p className="text-sm font-bold text-violet-900 dark:text-violet-300 mb-2">
                  📍 Destination: UPT - Politehnica University
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-400">
                  Once you arrive, use the campus map to navigate to your specific room!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsDirections;
