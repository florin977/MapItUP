



import React, { useState, useRef, useEffect } from 'react';
import { LogoutIcon } from '../components/icons/LogoutIcon';
import { MapIcon } from '../components/icons/MapIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { PlusIcon } from '../components/icons/PlusIcon';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { DashboardIcon } from '../components/icons/DashboardIcon';
import { DatabaseIcon } from '../components/icons/DatabaseIcon';
import { BuildingIcon } from '../components/icons/BuildingIcon';
import { ChartBarIcon } from '../components/icons/ChartBarIcon';
import { UserGroupIcon } from '../components/icons/UserGroupIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { ClockIcon } from '../components/icons/ClockIcon';
import { UploadActivity, Building, Timetable, Day } from '../types';
import InteractiveMapView from '../components/InteractiveMapView';
import CampusMapSVG from '../components/CampusMapSVG';

type Floor = 'ground' | 'first' | 'second';

interface AdminDashboardPageProps {
  onLogout: () => void;
  guestSearchCount: number;
  onMapUpload: (svgContent: string, floor: Floor) => void;
  uploadActivities: UploadActivity[];
  customMapSvgs: {
    ground: string | null;
    first: string | null;
    second: string | null;
  };
  buildings: Building[];
  onAddBuilding: (building: { name: string }) => void;
  onUpdateBuilding: (building: Building) => void;
  onDeleteBuilding: (id: number) => void;
  routeSearches: Record<string, number>;
}

type AdminSection = 'dashboard' | 'campus' | 'buildings' | 'data' | 'analytics';

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ 
  onLogout, 
  guestSearchCount, 
  onMapUpload, 
  uploadActivities, 
  customMapSvgs,
  buildings,
  onAddBuilding,
  onUpdateBuilding,
  onDeleteBuilding,
  routeSearches
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFloor, setUploadingFloor] = useState<Floor | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isUploadPopoverOpen, setUploadPopoverOpen] = useState(false);
  const uploadCardRef = useRef<HTMLDivElement>(null);
  const [previewFloor, setPreviewFloor] = useState<Floor>('ground');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (uploadCardRef.current && !uploadCardRef.current.contains(event.target as Node)) {
            setUploadPopoverOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEditClick = (building: Building) => {
    setSelectedBuilding(building);
    setIsTimetableModalOpen(true);
  };
  
  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setIsTimetableModalOpen(false);
    setSelectedBuilding(null);
  };

  const handleSaveTimetable = (updatedBuilding: Building) => {
    onUpdateBuilding(updatedBuilding);
    handleCloseModals();
  };

  const handleFileUploadClick = (floor: Floor) => {
    setUploadingFloor(floor);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadingFloor) return;
    const file = event.target.files?.[0];
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgContent = e.target?.result as string;
        onMapUpload(svgContent, uploadingFloor);
        setUploadFeedback({ message: `SVG for ${uploadingFloor.charAt(0).toUpperCase() + uploadingFloor.slice(1)} Floor uploaded successfully!`, type: 'success' });
        setTimeout(() => setUploadFeedback(null), 5000);
      };
      reader.onerror = () => {
        setUploadFeedback({ message: 'Error reading the SVG file.', type: 'error' });
        setTimeout(() => setUploadFeedback(null), 5000);
      };
      reader.readAsText(file);
    } else {
        setUploadFeedback({ message: 'Please select a valid SVG file.', type: 'error' });
        setTimeout(() => setUploadFeedback(null), 5000);
    }
    event.target.value = '';
    setUploadingFloor(null);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection guestSearchCount={guestSearchCount} uploadActivities={uploadActivities} routeSearches={routeSearches} />;
      case 'buildings':
        return <BuildingsSection />;
      case 'data':
        return <DataManagementSection 
                  buildings={buildings} 
                  onAddBuildingClick={() => setIsAddModalOpen(true)}
                  onEditBuildingClick={handleEditClick}
                  onDeleteBuilding={onDeleteBuilding}
               />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'campus':
        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary tracking-tight">Manage Campus Map (2D)</h2>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/svg+xml" className="hidden" />
            
            {uploadFeedback && (
              <div className={`p-4 mb-2 text-sm rounded-lg transition-opacity duration-300 ${uploadFeedback.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-600/50' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-600/50'}`} role="alert">
                <span className="font-medium">{uploadFeedback.type === 'success' ? 'Success!' : 'Error:'}</span> {uploadFeedback.message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="relative" ref={uploadCardRef}>
                    <AdminActionCard
                        icon={<UploadIcon className="w-8 h-8 text-violet-500 dark:text-brand-primary" />}
                        title="Upload 2D Layout"
                        description="Upload a custom 2D SVG layout for a specific floor."
                        actionText="Choose Floor..."
                        onActionClick={() => setUploadPopoverOpen(prev => !prev)}
                    />
                    {isUploadPopoverOpen && (
                        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 z-10 p-2 space-y-1 animate-fadeIn">
                            {(['ground', 'first', 'second'] as const).map(floor => (
                                <button
                                    key={floor}
                                    onClick={() => {
                                        handleFileUploadClick(floor);
                                        setUploadPopoverOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-brand-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                >
                                    {floor.charAt(0).toUpperCase() + floor.slice(1)} Floor
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="p-6 bg-white dark:bg-brand-surface rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-brand-text-primary">Current Map Preview:</h3>
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg flex items-center space-x-1">
                        {(['ground', 'first', 'second'] as const).map((floor) => {
                            const floorLabel = floor === 'ground' ? 'G' : floor === 'first' ? '1' : '2';
                            return (
                            <button
                                key={floor}
                                onClick={() => setPreviewFloor(floor)}
                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all duration-200 w-9 ${
                                previewFloor === floor ? 'bg-violet-600 dark:bg-brand-primary text-white shadow' : 'text-slate-600 dark:text-brand-text-secondary hover:bg-black/5 dark:hover:bg-slate-700/50'
                                }`}
                                title={`${floor.charAt(0).toUpperCase() + floor.slice(1)} Floor`}
                            >
                                {floorLabel}
                            </button>
                            )
                        })}
                    </div>
                </div>
                <div className="w-full h-80 bg-slate-200 dark:bg-black rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <InteractiveMapView width="100%" height="100%">
                    {(() => {
                        const svgContent = customMapSvgs[previewFloor];
                        if (svgContent) {
                        return <g dangerouslySetInnerHTML={{ __html: svgContent }} />;
                        }
                        if (previewFloor === 'ground') {
                        return <CampusMapSVG />;
                        }
                        return (
                        <g>
                            <rect x="0" y="0" width="800" height="600" fill="var(--map-bg)" />
                            <text x="400" y="300" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fill="var(--map-text)">
                            No map uploaded for {previewFloor} floor.
                            </text>
                        </g>
                        );
                    })()}
                    </InteractiveMapView>
                </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 dark:bg-brand-background">
      <aside className="w-64 bg-white/95 dark:bg-brand-surface border-r-2 border-violet-200 dark:border-slate-800 flex flex-col shadow-2xl shadow-indigo-500/10 dark:shadow-none">
        <div className="p-6 border-b-2 border-violet-200 dark:border-slate-800">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:text-brand-primary bg-clip-text text-transparent tracking-tight">Admin Panel</h1>
          <p className="text-sm font-bold text-indigo-700 dark:text-brand-text-secondary">MapItUP</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<DashboardIcon className="w-5 h-5 mr-3" />} 
            label="Dashboard" 
            isActive={activeSection === 'dashboard'} 
            onClick={() => setActiveSection('dashboard')} 
          />
          <NavItem 
            icon={<MapIcon className="w-5 h-5 mr-3" />} 
            label="Campus Map" 
            isActive={activeSection === 'campus'} 
            onClick={() => setActiveSection('campus')} 
          />
           <NavItem 
            icon={<BuildingIcon className="w-5 h-5 mr-3" />} 
            label="Buildings" 
            isActive={activeSection === 'buildings'} 
            onClick={() => setActiveSection('buildings')} 
          />
          <NavItem 
            icon={<DatabaseIcon className="w-5 h-5 mr-3" />} 
            label="Data Management" 
            isActive={activeSection === 'data'} 
            onClick={() => setActiveSection('data')} 
          />
          <NavItem 
            icon={<ChartBarIcon className="w-5 h-5 mr-3" />} 
            label="Analytics" 
            isActive={activeSection === 'analytics'} 
            onClick={() => setActiveSection('analytics')} 
          />
        </nav>
        <div className="p-4 border-t-2 border-violet-200 dark:border-slate-800 flex items-center justify-between">
          <button 
            onClick={onLogout}
            className="flex items-center justify-center py-2 px-3 rounded-xl text-sm font-bold text-red-700 dark:text-brand-text-secondary bg-red-100 dark:bg-slate-800 hover:bg-red-200 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all shadow-sm hover:shadow-md"
          >
            <LogoutIcon className="w-5 h-5 mr-2" />
            Logout
          </button>
          <ThemeSwitcher />
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-gradient-to-br dark:from-slate-900 dark:to-black">
        {renderSection()}
      </main>

      {isAddModalOpen && <AddBuildingModal onClose={handleCloseModals} onAdd={onAddBuilding} />}
      {isTimetableModalOpen && selectedBuilding && (
        <TimetableModal 
          building={selectedBuilding}
          onClose={handleCloseModals}
          onSave={handleSaveTimetable}
        />
      )}
    </div>
  );
};

const DashboardSection = ({ guestSearchCount, uploadActivities, routeSearches }: { guestSearchCount: number, uploadActivities: UploadActivity[], routeSearches: Record<string, number> }) => {
    const formatTimeAgo = (timestamp: number) => {
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);

        if (seconds < 5) return "just now";
        if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const popularRoutes = Object.entries(routeSearches)
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const maxSearches = popularRoutes.length > 0 ? Math.max(...popularRoutes.map(r => r.count)) : 1;

    return (
        <div className="animate-fadeIn space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:bg-none dark:text-white tracking-tight mb-2">
                        Dashboard Overview
                    </h2>
                    <p className="text-indigo-700 dark:text-slate-400 font-semibold">Welcome back! Here's what's happening today.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    icon={<UserGroupIcon className="w-10 h-10 text-white" />}
                    iconBg="bg-gradient-to-br from-blue-500 to-cyan-600"
                    title="Guest Searches"
                    value={guestSearchCount.toString()}
                    change="Total routes calculated"
                    changeType="neutral"
                />
                <StatCard 
                    icon={<MapIcon className="w-10 h-10 text-white" />}
                    iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
                    title="Map Version"
                    value="v1.0"
                    change="Multi-floor support"
                    changeType="increase"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/95 dark:bg-brand-surface p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 dark:shadow-none border-2 border-violet-200 dark:border-slate-800 hover:shadow-3xl hover:shadow-indigo-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent dark:bg-none dark:text-white">
                            Popular Routes
                        </h3>
                        <div className="px-4 py-2 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl border border-violet-300 dark:border-violet-800">
                            <p className="text-sm font-bold text-violet-700 dark:text-violet-300">Top 5</p>
                        </div>
                    </div>
                    <div className="space-y-5">
                        {popularRoutes.length > 0 ? (
                            popularRoutes.map((routeData, index) => (
                                <div key={routeData.route} className="group animate-fadeInUp hover:bg-indigo-50/50 dark:hover:bg-slate-800/30 p-4 rounded-2xl transition-all duration-300" style={{ animationDelay: `${index * 100}ms`}}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-sm shadow-lg">
                                                {index + 1}
                                            </div>
                                            <span className="font-bold text-indigo-900 dark:text-brand-text-secondary truncate pr-4" title={routeData.route}>
                                                {routeData.route}
                                            </span>
                                        </div>
                                        <div className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                            <span className="font-extrabold text-violet-700 dark:text-brand-text-primary text-sm">
                                                {routeData.count} <span className="text-xs font-semibold text-violet-600 dark:text-slate-500">searches</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gradient-to-r from-violet-100 to-purple-100 dark:bg-slate-800 rounded-full h-3 shadow-inner overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-brand-primary dark:to-brand-accent h-3 rounded-full transition-all duration-700 ease-out shadow-lg"
                                            style={{ width: `${(routeData.count / maxSearches) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-64 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center">
                                        <ChartBarIcon className="w-10 h-10 text-violet-500 dark:text-violet-400" />
                                    </div>
                                    <p className="text-indigo-700 dark:text-brand-text-secondary font-semibold">No route data yet.</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Perform searches in guest view to see popular routes!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-white/95 dark:bg-brand-surface p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 dark:shadow-none border-2 border-violet-200 dark:border-slate-800 hover:shadow-3xl hover:shadow-indigo-500/30 transition-all duration-300">
                    <h3 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent dark:bg-none dark:text-white mb-6">
                        Recent Activity
                    </h3>
                    <ul className="space-y-4">
                        {uploadActivities.length > 0 ? (
                            uploadActivities.map((activity, index) => (
                                <li key={index} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-slate-800/30 transition-all duration-200">
                                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 dark:bg-blue-500/20 rounded-xl shadow-lg flex-shrink-0">
                                        <UploadIcon className="w-5 h-5 text-white dark:text-blue-400"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-indigo-900 dark:text-brand-text-secondary">
                                            Uploaded 2D map
                                        </p>
                                        <p className="text-sm text-indigo-700 dark:text-slate-400 mt-1">
                                            <span className="font-semibold text-violet-600 dark:text-brand-text-primary">{activity.floor.charAt(0).toUpperCase() + activity.floor.slice(1)} floor</span>
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">{formatTimeAgo(activity.timestamp)}</p>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center">
                                    <ClockIcon className="w-8 h-8 text-violet-500 dark:text-violet-400" />
                                </div>
                                <p className="text-sm font-semibold text-indigo-700 dark:text-brand-text-secondary">No recent activity</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Activity will appear here</p>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const BuildingsSection = () => (
    <div className="space-y-6 animate-fadeIn">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:bg-none dark:text-white tracking-tight">Manage Campus Buildings (3D)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminActionCard
                icon={<UploadIcon className="w-8 h-8 text-violet-500 dark:text-brand-primary" />}
                title="Upload 3D Model"
                description="Upload a GLB/GLTF file for a building to enable 3D view."
                actionText="Upload Model"
                onActionClick={() => alert('Feature to be implemented!')}
            />
        </div>
    </div>
);

const DataManagementSection: React.FC<{
  buildings: Building[];
  onAddBuildingClick: () => void;
  onEditBuildingClick: (building: Building) => void;
  onDeleteBuilding: (id: number) => void;
}> = ({ buildings, onAddBuildingClick, onEditBuildingClick, onDeleteBuilding }) => (
    <div className="animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
             <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:bg-none dark:text-white tracking-tight">Data Management</h2>
             <button onClick={onAddBuildingClick} className="flex items-center text-sm font-extrabold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-brand-primary dark:to-brand-secondary hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 dark:hover:from-brand-secondary dark:hover:to-brand-primary px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-600/40 dark:hover:shadow-brand-primary/40">
                <PlusIcon className="w-5 h-5 mr-2" /> Add New Building
            </button>
        </div>
        <div className="bg-white/95 dark:bg-brand-surface rounded-2xl shadow-xl shadow-indigo-500/10 dark:shadow-none border-2 border-violet-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">Building Name</th>
                        <th scope="col" className="px-6 py-3">Last Updated</th>
                        <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    {buildings.map(building => (
                        <tr key={building.id} className="bg-white dark:bg-brand-surface border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{building.name}</th>
                            <td className="px-6 py-4">{building.lastUpdated}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => onEditBuildingClick(building)} className="font-medium text-teal-600 dark:text-brand-accent hover:underline p-1" aria-label={`Edit timetable for ${building.name}`}><EditIcon className="w-5 h-5" /></button>
                                <button onClick={() => onDeleteBuilding(building.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline p-1" aria-label={`Delete ${building.name}`}><TrashIcon className="w-5 h-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


const AnalyticsSection = () => (
    <div className="animate-fadeIn space-y-8">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:bg-none dark:text-white tracking-tight">Usage Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/95 dark:bg-brand-surface p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 dark:shadow-none border-2 border-violet-200 dark:border-slate-800 hover:shadow-3xl hover:shadow-indigo-500/30 transition-all duration-300">
                <h3 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent dark:bg-none dark:text-white mb-6">Peak Usage Hours</h3>
                {/* Mock Chart */}
                <div className="h-64 flex items-end justify-around p-4 space-x-3">
                    <div className="group flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-violet-500 to-purple-600 dark:bg-brand-accent/50 rounded-t-2xl hover:from-violet-400 hover:to-purple-500 transition-all duration-300 shadow-lg" style={{ height: '30%' }}></div>
                        <span className="text-xs font-bold text-indigo-700 dark:text-slate-400 mt-2">9am</span>
                    </div>
                    <div className="group flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-violet-500 to-purple-600 dark:bg-brand-accent/50 rounded-t-2xl hover:from-violet-400 hover:to-purple-500 transition-all duration-300 shadow-lg" style={{ height: '60%' }}></div>
                        <span className="text-xs font-bold text-indigo-700 dark:text-slate-400 mt-2">11am</span>
                    </div>
                    <div className="group flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-fuchsia-500 to-pink-600 dark:bg-brand-accent/50 rounded-t-2xl hover:from-fuchsia-400 hover:to-pink-500 transition-all duration-300 shadow-lg" style={{ height: '95%' }}></div>
                        <span className="text-xs font-bold text-indigo-700 dark:text-slate-400 mt-2">1pm</span>
                    </div>
                    <div className="group flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-violet-500 to-purple-600 dark:bg-brand-accent/50 rounded-t-2xl hover:from-violet-400 hover:to-purple-500 transition-all duration-300 shadow-lg" style={{ height: '80%' }}></div>
                        <span className="text-xs font-bold text-indigo-700 dark:text-slate-400 mt-2">3pm</span>
                    </div>
                    <div className="group flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-violet-500 to-purple-600 dark:bg-brand-accent/50 rounded-t-2xl hover:from-violet-400 hover:to-purple-500 transition-all duration-300 shadow-lg" style={{ height: '50%' }}></div>
                        <span className="text-xs font-bold text-indigo-700 dark:text-slate-400 mt-2">5pm</span>
                    </div>
                    <div className="group flex flex-col items-center flex-1">
                        <div className="w-full bg-gradient-to-t from-violet-500 to-purple-600 dark:bg-brand-accent/50 rounded-t-2xl hover:from-violet-400 hover:to-purple-500 transition-all duration-300 shadow-lg" style={{ height: '20%' }}></div>
                        <span className="text-xs font-bold text-indigo-700 dark:text-slate-400 mt-2">7pm</span>
                    </div>
                </div>
            </div>
             <div className="bg-white/95 dark:bg-brand-surface p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 dark:shadow-none border-2 border-violet-200 dark:border-slate-800 hover:shadow-3xl hover:shadow-indigo-500/30 transition-all duration-300">
                <h3 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent dark:bg-none dark:text-white mb-6">Device Usage</h3>
                {/* Mock Chart */}
                <div className="h-64 flex items-center justify-center">
                    <div className="relative">
                        <div className="w-52 h-52 rounded-full shadow-2xl" style={{ background: `conic-gradient(#8b5cf6 0% 65%, #2dd4bf 65% 90%, #c4b5fd 90% 100%)`}}>
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="w-28 h-28 bg-white dark:bg-brand-surface rounded-full shadow-inner flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-3xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">100%</p>
                                        <p className="text-xs font-bold text-indigo-700 dark:text-slate-400">Active</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col space-y-3 mt-6">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                        <span className="flex items-center font-bold text-indigo-900 dark:text-slate-300">
                            <div className="w-4 h-4 rounded-full bg-violet-600 mr-3 shadow-md"></div>
                            Mobile
                        </span>
                        <span className="font-extrabold text-violet-700 dark:text-violet-400">65%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
                        <span className="flex items-center font-bold text-indigo-900 dark:text-slate-300">
                            <div className="w-4 h-4 rounded-full bg-teal-500 mr-3 shadow-md"></div>
                            Desktop
                        </span>
                        <span className="font-extrabold text-teal-700 dark:text-teal-400">25%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                        <span className="flex items-center font-bold text-indigo-900 dark:text-slate-300">
                            <div className="w-4 h-4 rounded-full bg-purple-400 mr-3 shadow-md"></div>
                            Tablet
                        </span>
                        <span className="font-extrabold text-purple-700 dark:text-purple-400">10%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);


interface StatCardProps {
    icon: React.ReactNode;
    iconBg?: string;
    title: string;
    value: string;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, change, changeType, iconBg }) => {
    const changeColor = {
        increase: 'text-emerald-600 dark:text-green-400',
        decrease: 'text-red-600 dark:text-red-400',
        neutral: 'text-indigo-700 dark:text-brand-text-secondary',
    };
    return (
         <div className="group bg-white/95 dark:bg-brand-surface p-6 rounded-3xl shadow-lg shadow-indigo-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-400/50 dark:hover:shadow-[0_0_20px_rgba(167,139,250,0.2)] transition-all duration-300 border-2 border-violet-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-700 transform hover:-translate-y-2">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-4 ${iconBg} rounded-2xl shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    {icon}
                </div>
            </div>
            <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-700 dark:text-brand-text-secondary uppercase tracking-wide">{title}</p>
                <p className="text-4xl font-black bg-gradient-to-r from-violet-600 to-purple-600 dark:text-brand-text-primary bg-clip-text text-transparent">{value}</p>
                <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${changeType === 'increase' ? 'bg-emerald-500' : changeType === 'decrease' ? 'bg-red-500' : 'bg-indigo-500'} animate-pulse`}></div>
                    <p className={`text-xs font-bold ${changeColor[changeType]}`}>
                        {change}
                    </p>
                </div>
            </div>
        </div>
    );
};


interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => (
  <a
    href="#"
    onClick={(e) => { e.preventDefault(); onClick(); }}
    className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-violet-100 to-purple-100 dark:bg-brand-primary/20 text-violet-700 dark:text-brand-primary shadow-md border-2 border-violet-300 dark:border-transparent'
        : 'text-indigo-700 dark:text-brand-text-secondary hover:bg-violet-50 dark:hover:bg-slate-800 border-2 border-transparent'
    }`}
  >
    {icon}
    {label}
  </a>
);

interface AdminActionCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionText: string;
    onActionClick?: () => void;
}

const AdminActionCard: React.FC<AdminActionCardProps> = ({ icon, title, description, actionText, onActionClick }) => (
    <div className="bg-white/95 dark:bg-brand-surface p-6 rounded-2xl shadow-lg shadow-indigo-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-300/50 dark:hover:shadow-[0_0_15px_rgba(167,139,250,0.2)] transition-all duration-300 flex flex-col border-2 border-violet-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-brand-primary/50 transform hover:-translate-y-1">
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="ml-4 text-lg font-extrabold text-indigo-900 dark:text-brand-text-primary">{title}</h3>
        </div>
        <p className="text-indigo-700 dark:text-brand-text-secondary text-sm font-medium flex-grow">{description}</p>
        <button 
            onClick={onActionClick}
            className="mt-6 self-start text-sm font-extrabold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-brand-primary dark:to-brand-secondary hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 dark:hover:from-brand-secondary dark:hover:to-brand-primary px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-xl shadow-violet-500/30 hover:shadow-2xl hover:shadow-violet-600/40 dark:hover:shadow-brand-primary/40"
        >
            {actionText}
        </button>
    </div>
);

const AddBuildingModal: React.FC<{
  onClose: () => void;
  onAdd: (building: { name: string }) => void;
}> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd({ name: name.trim() });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-2xl w-full max-w-md p-8 m-4 animate-fadeInUp" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary mb-6">Add New Building</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="building-name" className="block text-sm font-medium text-slate-700 dark:text-brand-text-secondary">Building Name</label>
            <input type="text" id="building-name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full pl-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-brand-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-brand-text-secondary bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary rounded-md transition-colors">Add Building</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TimetableModal: React.FC<{
  building: Building;
  onClose: () => void;
  onSave: (building: Building) => void;
}> = ({ building, onClose, onSave }) => {
  const [timetable, setTimetable] = useState<Timetable>(building.timetable);

  const handleTimetableChange = (day: Day, hourIndex: number, value: string) => {
    const newTimetable = { ...timetable };
    // Ensure that if the input is cleared, it's stored as "Available"
    newTimetable[day][hourIndex] = value.trim() === '' ? 'Available' : value;
    setTimetable(newTimetable);
  };

  const handleSave = () => {
    onSave({ ...building, timetable });
  };

  const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const hours = Array.from({ length: 14 }, (_, i) => `${8 + i}:00`);

  return (
     <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center animate-fadeIn p-4" onClick={onClose}>
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-2xl w-full max-w-5xl animate-fadeInUp flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary">Edit Timetable: {building.name}</h2>
          <p className="text-sm text-slate-500 dark:text-brand-text-secondary">Schedule from 8:00 AM to 10:00 PM</p>
        </div>
        <div className="overflow-auto px-6 pb-6">
            <table className="w-full text-sm text-left border-separate border-spacing-x-1 border-spacing-y-1">
                <thead className="sticky top-0 z-10">
                    <tr>
                        <th className="p-2 font-semibold text-slate-600 dark:text-brand-text-secondary w-24 bg-white dark:bg-brand-surface">Time</th>
                        {days.map(day => <th key={day} className="p-2 font-semibold text-slate-600 dark:text-brand-text-secondary capitalize bg-white dark:bg-brand-surface text-center">{day}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {hours.map((hour, hourIndex) => (
                        <tr key={hour}>
                            <td className="py-2 px-3 font-mono text-slate-500 dark:text-brand-text-secondary whitespace-nowrap">{hour}</td>
                            {days.map(day => {
                                const currentValue = timetable[day][hourIndex];
                                const isAvailable = !currentValue || currentValue.toLowerCase() === 'available';
                                return (
                                <td key={day} className="align-middle">
                                    <input 
                                      type="text"
                                      value={isAvailable ? '' : currentValue}
                                      onChange={e => handleTimetableChange(day, hourIndex, e.target.value)}
                                      placeholder="-"
                                      className={`w-full text-sm text-center p-2.5 border-none rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary
                                        ${isAvailable 
                                            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-brand-text-primary placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800' 
                                            : 'bg-violet-100 dark:bg-brand-primary/20 text-violet-800 dark:text-brand-light font-semibold'
                                        }`}
                                    />
                                </td>
                            )})}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="flex justify-end p-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-brand-text-secondary bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors mr-3">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary rounded-md transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;