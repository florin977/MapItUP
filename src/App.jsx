import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import GuestPage from './pages/GuestPage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/guest" element={<GuestPage />} />
    </Routes>
  );
}

export default App;
