import React, { useState } from 'react';
import { UserIcon } from '../components/icons/UserIcon';
import { LockIcon } from '../components/icons/LockIcon';
import { MapIcon } from '../components/icons/MapIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import MapBackground from '../components/MapBackground';

interface LoginPageProps {
  onAdminLogin: (email: string, password: string) => boolean;
  onAdminSignup: (email: string, password: string) => { success: boolean; message?: string };
  onGuestContinue: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onAdminLogin, onAdminSignup, onGuestContinue }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const isValid = onAdminLogin(email, password);
    if (!isValid) {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const expectedToken = (import.meta as any).env.VITE_ADMIN_SIGNUP_TOKEN;
    
    if (!expectedToken) {
      setError('Admin signup is not configured. Please contact system administrator.');
      return;
    }
    
    if (signupToken !== expectedToken) {
      setError('Invalid signup token. Only authorized personnel can register.');
      return;
    }
    
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    const result = onAdminSignup(email, password);
    if (!result.success) {
      setError(result.message || 'An error occurred during registration.');
      return;
    }
    
    setSuccess('Account created successfully! You can now login.');
    setSignupToken('');
    setEmail('');
    setPassword('');
    setTimeout(() => {
      setActiveTab('login');
      setSuccess('');
    }, 2000);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 p-4 overflow-hidden">
      <MapBackground />
      
      {/* Animated gradient orbs - enhanced for light mode */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-violet-300/40 via-purple-400/30 to-fuchsia-300/40 dark:from-violet-400/30 dark:to-purple-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-300/40 via-blue-400/30 to-indigo-300/40 dark:from-pink-400/30 dark:to-rose-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-pink-300/30 via-rose-300/20 to-orange-300/30 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Main card with enhanced glassmorphism and cooler light mode */}
        <div className="animate-fadeInUp bg-white/95 dark:bg-slate-900/70 backdrop-blur-2xl border-2 border-violet-200/80 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-violet-600/20 dark:shadow-violet-500/10 p-8 space-y-8 hover:shadow-3xl hover:shadow-violet-600/30 dark:hover:shadow-violet-500/30 transition-all duration-500 hover:border-violet-300 dark:hover:border-slate-600">
          
          {/* Header with icon */}
          <div className="text-center animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center items-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-xl opacity-70 dark:opacity-60 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 dark:from-violet-500 dark:to-purple-600 p-4 rounded-2xl shadow-xl transform hover:scale-110 transition-transform duration-300">
                  <MapIcon className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent tracking-tight mb-2">
              MapItUP
            </h1>
            <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">Navigate your campus with ease.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-violet-100/50 dark:bg-slate-800/50 p-1 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
                activeTab === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          {/* Login form */}
          {activeTab === 'login' && (
          <form className="space-y-6 animate-fadeIn" style={{ animationDelay: '0.2s' }} onSubmit={handleLogin}>
            <div className="space-y-5">
              <div className="group">
                <label htmlFor="email" className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <UserIcon className="w-5 h-5 text-violet-500 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-violet-500/30 dark:focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md"
                    placeholder="admin@campus.edu"
                  />
                </div>
              </div>

              <div className="group">
                <label htmlFor="password-admin" className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <LockIcon className="w-5 h-5 text-violet-500 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                  </span>
                  <input
                    id="password-admin"
                    name="password-admin"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-violet-500/30 dark:focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                className="group relative w-full overflow-hidden py-4 px-6 border-none rounded-xl shadow-xl text-base font-extrabold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-600 dark:via-purple-600 dark:to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 dark:hover:from-violet-500 dark:hover:via-purple-500 dark:hover:to-pink-500 focus:outline-none focus:ring-4 focus:ring-violet-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-600/50 dark:hover:shadow-violet-500/40 active:scale-[0.98]"
              >
                <span className="relative z-10">Login as Admin</span>
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 dark:from-pink-600 dark:via-purple-600 dark:to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </form>
          )}

          {/* Sign Up form */}
          {activeTab === 'signup' && (
          <form className="space-y-6 animate-fadeIn" onSubmit={handleSignup}>
            <div className="space-y-5">
              <div className="group">
                <label htmlFor="signup-token" className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">
                  Admin Signup Token
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <LockIcon className="w-5 h-5 text-violet-500 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                  </span>
                  <input
                    id="signup-token"
                    name="signup-token"
                    type="password"
                    required
                    value={signupToken}
                    onChange={(e) => setSignupToken(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-violet-500/30 dark:focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md"
                    placeholder="Enter admin signup token"
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">Only authorized personnel have this token.</p>
              </div>

              <div className="group">
                <label htmlFor="email-signup" className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <UserIcon className="w-5 h-5 text-violet-500 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                  </span>
                  <input
                    id="email-signup"
                    name="email-signup"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-violet-500/30 dark:focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md"
                    placeholder="your.email@campus.edu"
                  />
                </div>
              </div>

              <div className="group">
                <label htmlFor="password-signup" className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <LockIcon className="w-5 h-5 text-violet-500 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                  </span>
                  <input
                    id="password-signup"
                    name="password-signup"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-violet-500/30 dark:focus:ring-violet-500/30 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md"
                    placeholder="Create a secure password"
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">Minimum 6 characters.</p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full overflow-hidden py-4 px-6 border-none rounded-xl shadow-xl text-base font-extrabold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-600 dark:via-purple-600 dark:to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 dark:hover:from-violet-500 dark:hover:via-purple-500 dark:hover:to-pink-500 focus:outline-none focus:ring-4 focus:ring-violet-500/50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-600/50 dark:hover:shadow-violet-500/40 active:scale-[0.98]"
              >
                <span className="relative z-10">Create Admin Account</span>
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 dark:from-pink-600 dark:via-purple-600 dark:to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </form>
          )}

          {error && (
            <div className="animate-fadeIn bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-800 rounded-xl p-3 shadow-sm">
              <p className="text-sm text-red-700 dark:text-red-400 font-semibold text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="animate-fadeIn bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-800 rounded-xl p-3 shadow-sm">
              <p className="text-sm text-green-700 dark:text-green-400 font-semibold text-center">{success}</p>
            </div>
          )}

          {/* Divider */}
          <div className="relative animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-violet-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/95 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 font-bold">
                Or
              </span>
            </div>
          </div>

          {/* Guest button */}
          <div className="animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={onGuestContinue}
              className="group w-full flex items-center justify-center py-4 px-6 border-2 border-indigo-300 dark:border-slate-600 rounded-xl shadow-md text-base font-extrabold text-indigo-700 dark:text-slate-200 bg-indigo-50 dark:bg-slate-800/50 hover:bg-indigo-100 dark:hover:bg-slate-700/50 hover:border-indigo-400 dark:hover:border-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 dark:focus:ring-slate-500/20 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-300/50 dark:hover:shadow-none"
            >
              Continue as Guest
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center mt-6 text-sm font-semibold text-slate-700 dark:text-slate-400 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          Discover the easiest way to navigate your campus ✨
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
