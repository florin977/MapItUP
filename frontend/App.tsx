

import React, { useState, useCallback } from 'react';
import { Page, UploadActivity, Building, Timetable, Day, Room } from './types';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import GuestMapPage from './pages/GuestMapPage';
import { ThemeProvider } from './contexts/ThemeContext';

type Floor = 'ground' | 'first' | 'second';

interface AdminAccount {
  email: string;
  password: string;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Login);
  const [guestSearchCount, setGuestSearchCount] = useState(0);
  const [uploadActivities, setUploadActivities] = useState<UploadActivity[]>([]);
  const [customMapSvgs, setCustomMapSvgs] = useState<{ [key in Floor]: string | null }>({
    ground: null,
    first: null,
    second: null,
  });
  const [routeSearches, setRouteSearches] = useState<Record<string, number>>({});
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([
    { email: 'admin@campus.edu', password: 'admin' }
  ]);

  const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const initialTimetable: Timetable = days.reduce((acc, day) => {
    acc[day] = Array(14).fill('Available');
    return acc;
  }, {} as Timetable);

  const [buildings, setBuildings] = useState<Building[]>([
    { 
      id: 1, 
      name: 'Library', 
      lastUpdated: '2024-07-28', 
      timetable: initialTimetable, 
    },
    { 
      id: 2, 
      name: 'Eng. Building', 
      lastUpdated: '2024-07-28', 
      timetable: {
        ...initialTimetable,
        monday: ['CS101', 'CS101', 'Available', 'MA202', 'MA202', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available'],
        wednesday: ['CS101', 'CS101', 'Available', 'MA202', 'MA202', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available', 'Available'],
      },
    },
    { 
      id: 3, 
      name: 'Student Center', 
      lastUpdated: '2024-07-28', 
      timetable: initialTimetable,
    },
    { id: 4, name: 'Admin Office', lastUpdated: '2024-07-28', timetable: initialTimetable },
  ]);

  const handleAdminLogin = (email: string, password: string): boolean => {
    const isValid = adminAccounts.some(
      account => account.email === email && account.password === password
    );
    if (isValid) {
      setCurrentPage(Page.Admin);
    }
    return isValid;
  };

  const handleAdminSignup = (email: string, password: string): { success: boolean; message?: string } => {
    const exists = adminAccounts.some(account => account.email === email);
    if (exists) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    setAdminAccounts(prev => [...prev, { email, password }]);
    return { success: true };
  };

  const handleGuestContinue = () => setCurrentPage(Page.Guest);
  const handleLogout = () => setCurrentPage(Page.Login);
  
  const handleGuestSearch = useCallback((from: string, to: string) => {
    if (!from || !to || from === to) return;

    setGuestSearchCount(prev => prev + 1);
    
    // Normalize route name to count A->B and B->A as the same route
    const routeName = [from, to].sort().join(' -> ');

    setRouteSearches(prev => ({
        ...prev,
        [routeName]: (prev[routeName] || 0) + 1
    }));
  }, []);

  const handleMapUpload = useCallback((svgContent: string, floor: Floor) => {
    setCustomMapSvgs(prev => ({ ...prev, [floor]: svgContent }));
    setUploadActivities(prev => [
      { floor, timestamp: Date.now() },
      ...prev,
    ].slice(0, 5)); // Keep last 5 activities
  }, []);

  const handleAddBuilding = (building: { name: string }) => {
    const newBuilding: Building = {
      id: Date.now(),
      name: building.name,
      lastUpdated: new Date().toISOString().split('T')[0],
      timetable: initialTimetable,
      rooms: [],
    };
    setBuildings(prev => [...prev, newBuilding]);
  };
  
  const handleUpdateBuilding = (updatedBuilding: Building) => {
    setBuildings(prev => prev.map(b => b.id === updatedBuilding.id ? { ...updatedBuilding, lastUpdated: new Date().toISOString().split('T')[0] } : b));
  };

  const handleDeleteBuilding = (id: number) => {
    setBuildings(prev => prev.filter(b => b.id !== id));
  };


  const renderCurrentPage = () => {
    switch (currentPage) {
      case Page.Login:
        return <LoginPage onAdminLogin={handleAdminLogin} onAdminSignup={handleAdminSignup} onGuestContinue={handleGuestContinue} />;
      case Page.Admin:
        return <AdminDashboardPage 
          onLogout={handleLogout} 
          guestSearchCount={guestSearchCount}
          onMapUpload={handleMapUpload}
          uploadActivities={uploadActivities}
          customMapSvgs={customMapSvgs}
          buildings={buildings}
          onAddBuilding={handleAddBuilding}
          onUpdateBuilding={handleUpdateBuilding}
          onDeleteBuilding={handleDeleteBuilding}
          routeSearches={routeSearches}
        />;
      case Page.Guest:
        return <GuestMapPage 
          onBackToLogin={handleLogout} 
          onSearch={handleGuestSearch} 
          customMapSvgs={customMapSvgs}
          buildings={buildings}
        />;
      default:
        return <LoginPage onAdminLogin={handleAdminLogin} onGuestContinue={handleGuestContinue} />;
    }
  };

  return (
    <ThemeProvider>
      {renderCurrentPage()}
    </ThemeProvider>
  );
};

export default App;