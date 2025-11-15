import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import GuestPage from './pages/GuestPage.jsx';
import Configurare2D from './pages/Configurare2D.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route path="/configurare2d" element={<Configurare2D />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
