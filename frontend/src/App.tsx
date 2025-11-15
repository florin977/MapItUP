import React, { useState, useCallback } from 'react';
import { Page, UploadActivity, Building, Timetable, Day } from './types';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import GuestMapPage from './pages/GuestMapPage';
import { ThemeProvider } from './contexts/ThemeContext';

type Floor = 'ground' | 'first' | 'second';

const API = import.meta.env.VITE_API_URL;  // 🔥 Backend URL din .env

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

  const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const initialTimetable: Timetable = days.reduce((acc, day) => {
    acc[day] = Array(14).fill('Available');
    return acc;
  }, {} as Timetable);

  const [buildings, setBuildings] = useState<Building[]>([
    { id: 1, name: 'Library', lastUpdated: '2024-07-28', timetable: initialTimetable },
    { id: 2, name: 'Eng. Building', lastUpdated: '2024-07-28', timetable: initialTimetable },
    { id: 3, name: 'Student Center', lastUpdated: '2024-07-28', timetable: initialTimetable },
    { id: 4, name: 'Admin Office', lastUpdated: '2024-07-28', timetable: initialTimetable }
  ]);

  // ============================================================
  // 🔥 LOGIN – conectare cu backend
  // ============================================================
  const handleAdminLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail: email, parola: password })
      });

      const data = await res.json();

      if (!res.ok) {
        return false;
      }

      setCurrentPage(Page.Admin);
      return true;

    } catch (err) {
      return false;
    }
  };

  // ============================================================
  // 🔥 SIGNUP – trimitem token-ul la backend
  // ============================================================
  const handleAdminSignup = async (
    email: string,
    password: string,
    token: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail: email,
          parola: password,
          token: token   // 🔥 token trimis corect
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.msg };
      }

      return { success: true };

    } catch (err) {
      return { success: false, message: "Server error" };
    }
  };

  // ============================================================
  // LOGOUT / GUEST
  // ============================================================
  const handleGuestContinue = () => setCurrentPage(Page.Guest);
  const handleLogout = () => setCurrentPage(Page.Login);

  // ============================================================
  // GUEST SEARCH COUNTER
  // ============================================================
  const handleGuestSearch = useCallback((from: string, to: string) => {
    if (!from || !to || from === to) return;
    setGuestSearchCount(prev => prev + 1);
    const routeName = [from, to].sort().join(' -> ');
    setRouteSearches(prev => ({
      ...prev,
      [routeName]: (prev[routeName] || 0) + 1
    }));
  }, []);

  // ============================================================
  // MAP UPLOAD
  // ============================================================
  const handleMapUpload = useCallback((svgContent: string, floor: Floor) => {
    setCustomMapSvgs(prev => ({ ...prev, [floor]: svgContent }));
    setUploadActivities(prev => [
      { floor, timestamp: Date.now() },
      ...prev,
    ].slice(0, 5));
  }, []);

  // ============================================================
  // BUILDINGS CRUD
  // ============================================================
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
    setBuildings(prev =>
      prev.map(b => b.id === updatedBuilding.id
        ? { ...updatedBuilding, lastUpdated: new Date().toISOString().split('T')[0] }
        : b
      )
    );
  };

  const handleDeleteBuilding = (id: number) => {
    setBuildings(prev => prev.filter(b => b.id !== id));
  };

  // ============================================================
  // PAGE RENDERER
  // ============================================================
  const renderCurrentPage = () => {
    switch (currentPage) {
      case Page.Login:
        return (
          <LoginPage
            onAdminLogin={handleAdminLogin}
            onAdminSignup={handleAdminSignup}   // 🔥 token included
            onGuestContinue={handleGuestContinue}
          />
        );
      case Page.Admin:
        return (
          <AdminDashboardPage
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
          />
        );
      case Page.Guest:
        return (
          <GuestMapPage
            onBackToLogin={handleLogout}
            onSearch={handleGuestSearch}
            customMapSvgs={customMapSvgs}
            buildings={buildings}
          />
        );
      default:
        return (
          <LoginPage
            onAdminLogin={handleAdminLogin}
            onAdminSignup={handleAdminSignup}
            onGuestContinue={handleGuestContinue}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      {renderCurrentPage()}
    </ThemeProvider>
  );
};

export default App;
