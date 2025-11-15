import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

const ADMIN_SIGNUP_TOKEN = "UPT_CAMPUS_EXPLORER_ADMIN_TOKEN";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/admin");
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError("");

    if (signupToken !== ADMIN_SIGNUP_TOKEN) {
      setError("Invalid admin signup token.");
      return;
    }

    navigate("/admin");
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo-box">
          <div className="login-logo">🏛️</div>
        </div>

        <h1 className="login-title">MapItUP</h1>
        <p className="login-subtitle">Navigate your campus with ease</p>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === "login" ? "login-tab-active" : ""}`}
            onClick={() => { setActiveTab("login"); setError(""); }}
          >
            Login
          </button>
          <button
            className={`login-tab ${activeTab === "signup" ? "login-tab-active" : ""}`}
            onClick={() => { setActiveTab("signup"); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        {/* LOGIN */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin}>

            <label className="login-label">Admin Email</label>
            <input
              type="email"
              className="login-input"
              placeholder="admin@campus.edu"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />

            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />

            <button className="login-btn-primary">Login as Admin</button>

            <div className="login-divider">OR</div>

            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => navigate("/guest")}
            >
              Continue as Guest →
            </button>
          </form>
        )}

        {/* SIGN UP */}
        {activeTab === "signup" && (
          <form onSubmit={handleSignup}>
            <label className="login-label">Admin Signup Token</label>
            <input
              className="login-input"
              placeholder="Enter admin token"
              value={signupToken}
              onChange={(e) => setSignupToken(e.target.value)}
            />

            <label className="login-label">Email Address</label>
            <input
              type="email"
              className="login-input"
              placeholder="your.email@campus.edu"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              required
            />

            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              placeholder="Create password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              required
            />

            {error && <div className="login-error">{error}</div>}

            <button className="login-btn-primary">
              Create Admin Account
            </button>

            <div className="login-divider">OR</div>

            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => navigate("/guest")}
            >
              Continue as Guest →
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
