import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import GuestPage from './pages/GuestPage.jsx'
import './App.css'

function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/guest" element={<GuestPage />} />
        {/* orice alt url te trimite înapoi la login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
