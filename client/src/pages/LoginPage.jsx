import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./LoginPage.css";

const ADMIN_TOKEN = 'UPT_CAMPUS_EXPLORER_ADMIN_TOKEN';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login');

  // LOGIN STATES
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // SIGNUP STATES
  const [signupToken, setSignupToken] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');

  const navigate = useNavigate();

  // ============================
  // LOGIN REAL
  // ============================
  const handleLoginAsAdmin = async () => {
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError("Email and password required.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail: loginEmail,
          parola: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.msg);
        return;
      }

      localStorage.setItem("admin_token", data.token);
      navigate('/admin');

    } catch (err) {
      console.error(err);
      setLoginError("Server error.");
    }
  };

  // ============================
  // SIGN-UP REAL
  // ============================
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');

    if (signupToken !== ADMIN_TOKEN) {
      setSignupError("Invalid admin signup token.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mail: signupEmail,
          parola: signupPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSignupError(data.msg);
        return;
      }

      alert("Admin account created.");
      navigate('/admin');

    } catch (err) {
      console.error(err);
      setSignupError("Server error.");
    }
  };

  const handleContinueAsGuest = () => {
    navigate('/guest');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="logo-circle">
          <span className="logo-letter">M</span>
        </div>

        <h1 className="app-title">MapItUP</h1>
        <p className="app-subtitle">Navigate your campus with ease.</p>

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

        {/* LOGIN FORM */}
        {activeTab === 'login' && (
          <div className="form-section">

            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                placeholder="admin@campus.edu"
                className="input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            {loginError && <div className="error-box">{loginError}</div>}

            <button className="primary-btn" onClick={handleLoginAsAdmin}>
              Login as Admin
            </button>

            <div className="divider"><span>Or</span></div>

            <button className="secondary-btn" onClick={handleContinueAsGuest}>
              Continue as Guest →
            </button>

          </div>
        )}

        {/* SIGNUP FORM */}
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
              <small className="helper-text">Only authorized personnel have this token.</small>
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
            </div>

            {signupError && <div className="error-box">{signupError}</div>}

            <button type="submit" className="primary-btn">
              Create Admin Account
            </button>

            <div className="divider"><span>Or</span></div>

            <button type="button" className="secondary-btn" onClick={handleContinueAsGuest}>
              Continue as Guest →
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
