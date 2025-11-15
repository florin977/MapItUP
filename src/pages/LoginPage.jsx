import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_TOKEN = 'UPT_CAMPUS_EXPLORER_ADMIN_TOKEN';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' sau 'signup'
  const [signupToken, setSignupToken] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLoginAsAdmin = () => {
    // deocamdată nu verificăm nimic, doar navigăm
    navigate('/admin');
  };

  const handleContinueAsGuest = () => {
    navigate('/guest');
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (signupToken !== ADMIN_TOKEN) {
      setError('Invalid admin signup token.');
      return;
    }

    if (!signupEmail || !signupPassword) {
      setError('Please fill in email and password.');
      return;
    }

    // aici ai simula salvarea în backend
    // momentan doar navigăm spre pagina de admin
    navigate('/admin');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo / icon (poți pune imagine aici mai târziu) */}
        <div className="logo-circle">
          <span className="logo-letter">M</span>
        </div>

        <h1 className="app-title">MapItUP</h1>
        <p className="app-subtitle">Navigate your campus with ease.</p>

        {/* Tabs Login / Sign Up */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign Up
          </button>
        </div>

        {activeTab === 'login' && (
          <div className="form-section">
            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                placeholder="admin@campus.edu"
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="input"
              />
            </div>

            <button
              className="primary-btn"
              onClick={handleLoginAsAdmin}
            >
              Login as Admin
            </button>

            <div className="divider">
              <span>Or</span>
            </div>

            <button
              className="secondary-btn"
              onClick={handleContinueAsGuest}
            >
              Continue as Guest →
            </button>
          </div>
        )}

        {activeTab === 'signup' && (
          <form className="form-section" onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label>Admin Signup Token</label>
              <input
                type="text"
                placeholder="Enter admin signup token"
                className="input"
                value={signupToken}
                onChange={(e) => setSignupToken(e.target.value)}
              />
              <small className="helper-text">
                Only authorized personnel have this token.
              </small>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="your.email@campus.edu"
                className="input"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a secure password"
                className="input"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
              <small className="helper-text">
                Minimum 6 characters.
              </small>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="primary-btn">
              Create Admin Account
            </button>

            <div className="divider">
              <span>Or</span>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={handleContinueAsGuest}
            >
              Continue as Guest →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
