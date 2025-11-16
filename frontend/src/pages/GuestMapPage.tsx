import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPinIcon } from '../components/icons/MapPinIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import { WalkIcon } from '../components/icons/WalkIcon';
import InteractiveMapView from '../components/InteractiveMapView';
import CampusMapSVG from '../components/CampusMapSVG';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { BuildingIcon } from '../components/icons/BuildingIcon';
import { NavigationIcon } from '../components/icons/NavigationIcon';
import { Building, CampusEntrance } from '../types';
import ViewTimetableModal from '../components/ViewTimetableModal';
import GoogleMapsDirections from '../components/GoogleMapsDirections';

const API_BASE = "http://localhost:3000";

interface GuestMapPageProps {
  onBackToLogin: () => void;
  onSearch: (from: string, to: string) => void;
  buildings: Building[];
  // îl lăsăm opțional ca să nu se supere TS dacă mai e folosit pe undeva
  customMapSvgs?: {
    ground: string | null;
    first: string | null;
    second: string | null;
  };
}

interface RouteLeg {
  title: string;
  time: number;
  distance: string;
  instructions: string[];
  icon: React.ReactNode;
}

interface FloorFromDB {
  id: number;
  floor_number: number;
  name: string;
  svg: string | null;
}

type LocationPoint = {
    type: 'campus';
    building: Building;
} | {
    type: 'external';
    name: string;
    coords: { lat: number; lng: number };
};

const GuestMapPage: React.FC<GuestMapPageProps> = ({
  onBackToLogin,
  onSearch,
  buildings,
}) => {

  const [fromPoint, setFromPoint] = useState<LocationPoint | null>(null);
    const [toPoint, setToPoint] = useState<LocationPoint | null>(null);
    const [routeDetails, setRouteDetails] = useState<{ leg: RouteLeg, totalTime: number, totalDistance: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [is3DView, setIs3DView] = useState(false);

    // --- NEW: etaje din DB ---
    const [floors, setFloors] = useState<FloorFromDB[]>([]);
    const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);
    const [currentFloorSvg, setCurrentFloorSvg] = useState<string | null>(null);

    const [selectedBuildingForTimetable, setSelectedBuildingForTimetable] = useState<Building | null>(null);
    const [activeSelection, setActiveSelection] = useState<'from' | 'to' | null>(null);
    const [selectingExternal, setSelectingExternal] = useState<'from' | 'to' | null>(null);
    const [showLocationMenu, setShowLocationMenu] = useState<'from' | 'to' | null>(null);
    const [showExternalRoute, setShowExternalRoute] = useState(false);
    const [selectedEntrance, setSelectedEntrance] = useState<CampusEntrance | null>(null);
    const mapContainerRef = useRef<HTMLElement>(null);

      // ======================
  // FLOORS din database
  // ======================
  useEffect(() => {
    const loadFloors = async () => {
  try {
    console.log("Fetching floors from:", `${API_BASE}/floors`);
    const resp = await fetch(`${API_BASE}/floors`);
    console.log("Response status /floors:", resp.status);

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Failed to load floors", text);
      return;
    }

    const data: FloorFromDB[] = await resp.json();
    console.log("Floors from DB:", data);
    setFloors(data);

    if (data.length > 0) {
      setSelectedFloorNumber(data[0].floor_number);
      setCurrentFloorSvg(data[0].svg);
    }
  } catch (err) {
    console.error("Error loading floors:", err);
  }
};


    loadFloors();
  }, []);

  useEffect(() => {
    if (selectedFloorNumber == null) return;
    const floor = floors.find((f) => f.floor_number === selectedFloorNumber);
    if (floor) {
      setCurrentFloorSvg(floor.svg);
    }
  }, [selectedFloorNumber, floors]);


    const handleBuildingClick = useCallback((buildingName: string) => {
        const building = buildings.find(b => b.name.toLowerCase() === buildingName.toLowerCase().trim());
        if (!building) return;

        if (activeSelection) {
            const locationPoint: LocationPoint = { type: 'campus', building };
            if (activeSelection === 'from') {
                setFromPoint(locationPoint);
            } else if (activeSelection === 'to') {
                setToPoint(locationPoint);
            }
            setActiveSelection(null);
            setShowLocationMenu(null);
        } else {
            setSelectedBuildingForTimetable(building);
        }
    }, [activeSelection, buildings]);

    const handleExternalLocationSelected = (location: { lat: number; lng: number }, name: string, forPoint: 'from' | 'to') => {
        const locationPoint: LocationPoint = {
            type: 'external',
            name: name,
            coords: location
        };
        if (forPoint === 'from') {
            setFromPoint(locationPoint);
        }
        setSelectingExternal(null);
    };

    useEffect(() => {
        const mapElement = mapContainerRef.current;
        if (!mapElement) return;

        const clickListener = (event: MouseEvent) => {
            const target = event.target as SVGTextElement;
            if (target.tagName.toLowerCase() === 'text' && target.textContent) {
                 if (target.onclick || (target.parentElement && target.parentElement.onclick)) return;
                handleBuildingClick(target.textContent);
            }
        };
        mapElement.addEventListener('click', clickListener);
        return () => {
            mapElement.removeEventListener('click', clickListener);
        };
    }, [handleBuildingClick]);

    const handleFindRoute = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromPoint || !toPoint) return;
        
        const fromName = fromPoint.type === 'campus' ? fromPoint.building.name : fromPoint.name;
        const toName = toPoint.building.name;
        
        onSearch(fromName, toName);
        
        // If starting from external location, show Google Maps with route to entrance
        if (fromPoint.type === 'external') {
            setShowExternalRoute(true);
            setRouteDetails(null);
            return;
        }
        
        // If both are campus locations, show 2D map route (user's algorithm)
        setShowExternalRoute(false);
        setIsLoading(true);
        setRouteDetails(null);
        
        setTimeout(() => {
            const routeTime = Math.floor(Math.random() * 8) + 3;
            const routeDistance = (routeTime * 0.08).toFixed(2);

            const leg: RouteLeg = {
                title: `From ${fromName} to ${toName}`,
                time: routeTime,
                distance: `${routeDistance} km`,
                instructions: [
                    `Start at ${fromName}.`,
                    "Follow the main path towards the central quad.",
                    `Turn left at the fountain.`,
                    `Enter ${toName} through the main entrance.`
                ],
                icon: <WalkIcon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
            };

            setRouteDetails({ leg, totalTime: leg.time, totalDistance: parseFloat(leg.distance) });
            setIsLoading(false);
        }, 1500);
    };
    
    const renderMapContent = () => {
        // avem SVG în DB pentru etajul selectat
        if (currentFloorSvg) {
            return <g dangerouslySetInnerHTML={{ __html: currentFloorSvg }} />;
        }

        // fallback: dacă nu e nimic în DB, poți să afișezi harta statică sau un mesaj
        if (floors.length === 0) {
            // încă nu avem nimic în DB → poți folosi CampusMapSVG ca înainte
            return <CampusMapSVG onBuildingClick={handleBuildingClick} />;
        }

        return (
            <g>
                <rect x="0" y="0" width="800" height="600" fill="white" />
                <text
                    x="400"
                    y="300"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    fontSize="20"
                    fill="black"
                >
                    No SVG saved for this floor yet.
                </text>
            </g>
        );
    };


    const resetRoute = () => {
        setFromPoint(null);
        setToPoint(null);
        setRouteDetails(null);
        setActiveSelection(null);
        setSelectingExternal(null);
        setShowLocationMenu(null);
        setShowExternalRoute(false);
    }

  return (
    <div className="flex flex-col h-screen font-sans bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 dark:from-slate-950 dark:via-purple-950/30 dark:to-slate-900">
      {/* Enhanced Header */}
      <header className="bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-indigo-500/10 z-20 border-b-2 border-violet-200/80 dark:border-slate-700/50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-md opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-xl">
                  <MapPinIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                MapItUP
              </h1>
            </div>
            <div className="flex items-center space-x-4">
                <button 
                  onClick={onBackToLogin}
                  className="flex items-center text-sm font-semibold rounded-xl px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    <span>Back</span>
                </button>
                <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Sidebar */}
          <aside className="w-96 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-6 overflow-y-auto z-10 flex flex-col border-r-2 border-violet-200/80 dark:border-slate-700/50 shadow-2xl shadow-indigo-500/10 dark:shadow-none">
            {!routeDetails && !isLoading && (
            <div className="animate-fadeIn space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                    Plan Your Route
                  </h2>
                  <p className="text-sm font-semibold text-indigo-700 dark:text-slate-400">Select your starting point and destination on the map</p>
                </div>
                
                <form onSubmit={handleFindRoute} className="space-y-5">
                    {/* FROM SECTION */}
                    <div className="space-y-2">
                        <label className="block text-sm font-extrabold text-indigo-800 dark:text-slate-300">
                          From Location
                        </label>
                        {!fromPoint ? (
                          <div className="relative">
                            <button 
                              type="button" 
                              onClick={() => setShowLocationMenu(showLocationMenu === 'from' ? null : 'from')} 
                              className="group p-4 w-full border-2 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-300 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md"
                            >
                              <MapPinIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-violet-500"/>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-violet-600">
                                Choose Location
                              </span>
                            </button>
                            {showLocationMenu === 'from' && (
                              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-violet-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSelection('from');
                                    setShowLocationMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-all flex items-center space-x-3 border-b border-slate-200 dark:border-slate-700"
                                >
                                  <BuildingIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                  <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Campus Building</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Click on campus map</div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectingExternal('from');
                                    setShowLocationMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-all flex items-center space-x-3"
                                >
                                  <NavigationIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                  <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">External Location</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Select from map</div>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex-shrink-0">
                                      {fromPoint.type === 'campus' ? <BuildingIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/> : <NavigationIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>}
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{fromPoint.type === 'campus' ? fromPoint.building.name : fromPoint.name}</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setFromPoint(null)} 
                                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all flex-shrink-0"
                                >
                                  Change
                                </button>
                            </div>
                        )}
                        {activeSelection === 'from' && (
                          <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl animate-fadeIn">
                            <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                              👆 Click a building on the campus map to select your starting point
                            </p>
                          </div>
                        )}
                    </div>

                    {/* TO SECTION */}
                    <div className="space-y-2">
                         <label className="block text-sm font-extrabold text-indigo-800 dark:text-slate-300">
                           To Destination
                         </label>
                        {!toPoint ? (
                          <div className="relative">
                            <button 
                              type="button" 
                              onClick={() => setShowLocationMenu(showLocationMenu === 'to' ? null : 'to')} 
                              className="group p-4 w-full border-2 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-300 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md"
                            >
                              <MapPinIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-violet-500"/>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-violet-600">
                                Choose Location
                              </span>
                            </button>
                            {showLocationMenu === 'to' && (
                              <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-violet-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSelection('to');
                                    setShowLocationMenu(null);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-slate-700 transition-all flex items-center space-x-3"
                                >
                                  <BuildingIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                  <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Campus Building</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Click on campus map to select destination</div>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                            <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-2 border-rose-300 dark:border-rose-700 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex-shrink-0">
                                      <BuildingIcon className="w-5 h-5 text-rose-600 dark:text-rose-400"/>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{toPoint.building.name}</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setToPoint(null)} 
                                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-all flex-shrink-0"
                                >
                                  Change
                                </button>
                            </div>
                        )}
                        {activeSelection === 'to' && (
                          <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl animate-fadeIn">
                            <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                              👆 Click a building on the campus map to select your destination
                            </p>
                          </div>
                        )}
                    </div>

                    <button
                      type="submit"
                      disabled={!fromPoint || !toPoint}
                      className="group relative w-full overflow-hidden py-4 px-6 border-none rounded-2xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 focus:outline-none focus:ring-4 focus:ring-violet-500/50 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/40 active:scale-[0.98] disabled:transform-none disabled:shadow-none"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        Find Route
                        <SearchIcon className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform"/>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                </form>
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex justify-center items-center space-x-2">
                  <div className="w-4 h-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full animate-bounce shadow-lg" style={{animationDelay: '0s'}}></div>
                  <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-4 h-4 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full animate-bounce shadow-lg" style={{animationDelay: '0.2s'}}></div>
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Finding best route...</p>
              </div>
            </div>
          )}
            
          {routeDetails && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
                  Your Route
                </h2>
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 p-4 rounded-2xl border-2 border-violet-200 dark:border-violet-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <ClockIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-sm text-indigo-700 dark:text-slate-400 font-bold mb-1">Total Time</p>
                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{routeDetails.totalTime}<span className="text-sm font-medium ml-1">min</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 p-4 rounded-2xl border-2 border-pink-200 dark:border-pink-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <WalkIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <p className="text-sm text-indigo-700 dark:text-slate-400 font-bold mb-1">Distance</p>
                    <p className="text-2xl font-black text-pink-600 dark:text-pink-400">{routeDetails.totalDistance.toFixed(1)}<span className="text-sm font-medium ml-1">km</span></p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <RouteLegDisplay leg={routeDetails.leg} />
              </div>
              
              <button 
                onClick={resetRoute} 
                className="w-full py-3 px-4 text-center font-extrabold text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/20 hover:bg-violet-200 dark:hover:bg-violet-900/30 rounded-xl border-2 border-violet-300 dark:border-violet-800 transition-all duration-200 hover:shadow-lg shadow-violet-200/50 dark:shadow-none"
              >
                Plan a New Route
              </button>
            </div>
          )}
        </aside>

        {/* Map Area */}
        <main ref={mapContainerRef} className="flex-1 bg-slate-200 dark:bg-black relative overflow-hidden">
          {/* Enhanced floating controls */}
            <div className="absolute top-6 right-6 z-20 flex items-center space-x-3">
            {!is3DView && floors.length > 0 && (
              <div className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl shadow-indigo-500/20 dark:shadow-violet-500/10 border-2 border-violet-200/80 dark:border-slate-700/50 flex items-center space-x-2 animate-fadeIn">
                {floors.map((floor) => (
                  <button
                    key={floor.floor_number}
                    onClick={() => setSelectedFloorNumber(floor.floor_number)}
                    className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 min-w-[3rem] ${
                      selectedFloorNumber === floor.floor_number
                        ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50 scale-110'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:scale-105'
                    }`}
                    title={floor.name || `Floor ${floor.floor_number}`}
                  >
                    {floor.floor_number}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl shadow-indigo-500/20 dark:shadow-violet-500/10 border-2 border-violet-200/80 dark:border-slate-700/50 flex items-center space-x-2">
              <button 
                onClick={() => setIs3DView(false)} 
                className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                  !is3DView 
                    ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                2D
              </button>
              <button 
                onClick={() => setIs3DView(true)} 
                className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                  is3DView 
                    ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                3D
              </button>
            </div>
          </div>
          
          {is3DView ? (
            <div className="w-full h-full flex items-center justify-center animate-fadeIn bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-black">
              <div className="text-center p-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-full blur-3xl"></div>
                  <BuildingIcon className="relative w-20 h-20 text-slate-400 dark:text-slate-600 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-slate-600 dark:text-slate-400 mb-2">3D View Coming Soon</h3>
                <p className="text-slate-500 dark:text-slate-500">Enhanced 3D campus visualization will be available here</p>
              </div>
            </div>
          ) : showExternalRoute && fromPoint && fromPoint.type === 'external' ? (
            <div className="w-full h-full overflow-hidden animate-fadeIn relative">
              <GoogleMapsDirections 
                startLocation={fromPoint.coords}
                destinationName={toPoint?.building.name || 'Campus'}
                onEntranceSelected={setSelectedEntrance}
              />
              <button
                onClick={() => {
                  setShowExternalRoute(false);
                  setIsLoading(true);
                  setTimeout(() => {
                    const routeTime = Math.floor(Math.random() * 8) + 3;
                    const routeDistance = (routeTime * 0.08).toFixed(2);
                    const entranceName = selectedEntrance?.name || "Main Entrance";
                    const destinationName = toPoint?.building.name || 'Campus';

                    const leg: RouteLeg = {
                      title: `From ${entranceName} to ${destinationName}`,
                      time: routeTime,
                      distance: `${routeDistance} km`,
                      instructions: [
                        `Start at campus ${entranceName}.`,
                        "Follow the main path towards the central quad.",
                        `Turn left at the fountain.`,
                        `Enter ${destinationName} through the main entrance.`
                      ],
                      icon: <WalkIcon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                    };

                    setRouteDetails({ leg, totalTime: leg.time, totalDistance: parseFloat(leg.distance) });
                    setIsLoading(false);
                  }, 1000);
                }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 animate-fadeIn"
              >
                <span className="text-lg">✓</span>
                <span>I've Arrived at {selectedEntrance?.name || 'Entrance'}</span>
              </button>
            </div>
          ) : (
            <InteractiveMapView width="100%" height="100%">
              {renderMapContent()}
            </InteractiveMapView>
          )}

          {selectedBuildingForTimetable && (
            <ViewTimetableModal 
                building={selectedBuildingForTimetable}
                onClose={() => setSelectedBuildingForTimetable(null)}
            />
          )} 
          
          {selectingExternal === 'from' && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden border-2 border-violet-200 dark:border-slate-700">
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b-2 border-violet-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 dark:text-white bg-clip-text text-transparent">
                      Select Starting Location
                    </h3>
                    <button
                      onClick={() => setSelectingExternal(null)}
                      className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 px-4 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <GoogleMapsDirections 
                      selectionMode="from"
                      onLocationSelected={handleExternalLocationSelected}
                      onCancel={() => setSelectingExternal(null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const RouteLegDisplay: React.FC<{ leg: RouteLeg }> = ({ leg }) => (
    <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 dark:from-slate-800/50 dark:to-slate-900/50 p-5 rounded-2xl border-2 border-indigo-200 dark:border-slate-700 shadow-lg shadow-indigo-200/50 dark:shadow-none">
        <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-violet-100 dark:bg-slate-800 rounded-xl shadow-sm">
                {leg.icon}
            </div>
            <div className="flex-1">
                <h3 className="font-extrabold text-indigo-900 dark:text-slate-100 mb-2">{leg.title}</h3>
                <div className="flex items-center space-x-4 text-xs font-semibold text-indigo-700 dark:text-slate-400">
                    <div className="flex items-center space-x-1">
                        <ClockIcon className="w-3.5 h-3.5"/>
                        <span className="font-semibold">{leg.time} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <WalkIcon className="w-3.5 h-3.5"/>
                        <span className="font-semibold">{leg.distance}</span>
                    </div>
                </div>
            </div>
        </div>        
        
        <div className="space-y-3 pl-1">
            {leg.instructions.map((step, index) => (
                <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
                        {index + 1}
                    </div>
                    <p className="text-sm font-medium text-indigo-800 dark:text-slate-300 pt-0.5">{step}</p>
                </div>
            ))}
        </div>
    </div>
);

export default GuestMapPage;