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

type Floor = 'ground' | 'first' | 'second';

interface GuestMapPageProps {
  onBackToLogin: () => void;
  onSearch: (from: string, to: string) => void;
  customMapSvgs: {
    ground: string | null;
    first: string | null;
    second: string | null;
  };
  buildings: Building[];
}

interface RouteLeg {
  title: string;
  time: number;
  distance: string;
  instructions: string[];
  icon: React.ReactNode;
}

type LocationPoint = {
    type: 'campus';
    building: Building;
} | {
    type: 'external';
    name: string;
    coords: { lat: number; lng: number };
};

const GuestMapPage: React.FC<GuestMapPageProps> = ({ onBackToLogin, onSearch, customMapSvgs, buildings }) => {
    const [fromPoint, setFromPoint] = useState<LocationPoint | null>(null);
    const [toPoint, setToPoint] = useState<LocationPoint | null>(null);
    const [routeDetails, setRouteDetails] = useState<{ leg: RouteLeg, totalTime: number, totalDistance: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [is3DView, setIs3DView] = useState(false);
    const [selectedFloor, setSelectedFloor] = useState<Floor>('ground');
    const [selectedBuildingForTimetable, setSelectedBuildingForTimetable] = useState<Building | null>(null);
    const [activeSelection, setActiveSelection] = useState<'from' | 'to' | null>(null);
    const [selectingExternal, setSelectingExternal] = useState<'from' | 'to' | null>(null);
    const [showLocationMenu, setShowLocationMenu] = useState<'from' | 'to' | null>(null);
    const [showExternalRoute, setShowExternalRoute] = useState(false);
    const [selectedEntrance, setSelectedEntrance] = useState<CampusEntrance | null>(null);
    const mapContainerRef = useRef<HTMLElement>(null);

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
    }, [customMapSvgs, selectedFloor, handleBuildingClick]);

    const handleFindRoute = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromPoint || !toPoint) return;
        
        const fromName = fromPoint.type === 'campus' ? fromPoint.building.name : fromPoint.name;
        const toName = toPoint.building.name;
        
        onSearch(fromName, toName);
        
        if (fromPoint.type === 'external') {
            setShowExternalRoute(true);
            setRouteDetails(null);
            return;
        }
        
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
        const svgContent = customMapSvgs[selectedFloor];
        if (svgContent) return <g dangerouslySetInnerHTML={{ __html: svgContent }} />;
        if (selectedFloor === 'ground') return <CampusMapSVG onBuildingClick={handleBuildingClick} />;
        return (
            <g>
                <rect x="0" y="0" width="800" height="600" fill="var(--map-bg)" />
                <text x="400" y="300" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="var(--map-text)">
                    Map for {selectedFloor} floor is not available.
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
          <aside className="w-96 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-6 overflow-y-auto z-10 flex flex-col border-r-2 border-violet-200/80 dark:border-slate-700/50 shadow-2xl shadow-indigo-500/10">
            {/* Sidebar content (unchanged) */}
            {/* ... aici rămâne tot codul existent pentru formulare, routeDetails, etc ... */}
          </aside>

        <main ref={mapContainerRef} className="flex-1 bg-slate-200 dark:bg-black relative overflow-hidden">
          {/* Floating controls */}
          <div className="absolute top-6 right-6 z-20 flex items-center space-x-3">
            {/* Floor buttons – afișate și în 2D și 3D */}
            <div className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl shadow-indigo-500/20 dark:shadow-violet-500/10 border-2 border-violet-200/80 dark:border-slate-700/50 flex items-center space-x-2 animate-fadeIn">
              {(['ground', 'first', 'second'] as const).map((floor) => {
                  const floorLabel = floor === 'ground' ? 'G' : floor === 'first' ? '1' : '2';
                  return (
                      <button
                          key={floor}
                          onClick={() => setSelectedFloor(floor)}
                          className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 min-w-[3rem] ${
                              selectedFloor === floor 
                                ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/50 scale-110' 
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:scale-105'
                          }`}
                          title={`${floor.charAt(0).toUpperCase() + floor.slice(1)} Floor`}
                      >
                          {floorLabel}
                      </button>
                  )
              })}
            </div>

            {/* 2D / 3D toggle */}
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
    <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 dark:from-slate-800/50 dark:to-slate-900/50 p-5 rounded-2xl border-2 border-indigo-200 dark
