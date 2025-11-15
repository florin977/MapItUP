import React, { useState } from 'react';
import { UserIcon } from '../components/icons/UserIcon';
import { LockIcon } from '../components/icons/LockIcon';
import { MapIcon } from '../components/icons/MapIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import MapBackground from '../components/MapBackground';

interface LoginPageProps {
  onAdminLogin: (email: string, password: string) => Promise<boolean>;
  onAdminSignup: (email: string, password: string, token: string) => Promise<{ success: boolean; message?: string }>;
  onGuestContinue: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onAdminLogin, onAdminSignup, onGuestContinue }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ============================================================
  // LOGIN
  // ============================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const ok = await onAdminLogin(email, password);
    if (!ok) {
      setError('Invalid credentials. Please try again.');
    }
  };

  // ============================================================
  // SIGNUP (token trimis către backend)
  // ============================================================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

  const expectedToken = import.meta.env.VITE_ADMIN_SIGNUP_TOKEN;
    if (!expectedToken) {
      setError('Admin signup is not configured. Please contact the system administrator.');
      return;
    }

    if (!signupToken) {
      setError('Signup token is required.');
      return;
    }

    if (signupToken !== expectedToken) {
      setError('Invalid signup! token. Only authorized personnel can register.');
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

    // 🔥 trimitem tokenul către backend
    const result = await onAdminSignup(email, password, signupToken);

    if (!result.success) {
      setError(result.message || 'Signup error.');
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

  // =======================================================================
  // UI IDENTIC – doar funcțiile au fost adaptate pentru backend + token
  // =======================================================================

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 p-4 overflow-hidden">
      <MapBackground />

      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-violet-300/40 via-purple-400/30 to-fuchsia-300/40 dark:from-violet-400/30 dark:to-purple-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-300/40 via-blue-400/30 to-indigo-300/40 dark:from-pink-400/30 dark:to-rose-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-pink-300/30 via-rose-300/20 to-orange-300/30 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="animate-fadeInUp bg-white/95 dark:bg-slate-900/70 backdrop-blur-2xl border-2 border-violet-200/80 dark:border-slate-700/50 rounded-3xl shadow-2xl shadow-violet-600/20 dark:shadow-violet-500/10 p-8 space-y-8 hover:shadow-3xl hover:shadow-violet-600/30 dark:hover:shadow-violet-500/30 transition-all duration-500 hover:border-violet-300 dark:hover:border-slate-600">

          <div className="text-center animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-center items-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-xl opacity-70 dark:opacity-60 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 dark:from-violet-500 dark:to-purple-600 p-4 rounded-2xl shadow-xl transform hover:scale-110 transition-transform duration-300">
                  <MapIcon className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent tracking-tight mb-2">MapItUP</h1>
            <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">Navigate your campus with ease!!.</p>
          </div>

          {/* TABS */}
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

          {/* LOGIN */}
          {activeTab === 'login' && (
            <form className="space-y-6 animate-fadeIn" onSubmit={handleLogin} style={{ animationDelay: '0.2s' }}>
              <div className="space-y-5">
                <div className="group">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">Admin Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <UserIcon className="w-5 h-5 text-violet-500" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@campus.edu"
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <LockIcon className="w-5 h-5 text-violet-500" />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="group relative w-full py-4 px-6 rounded-xl text-white font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
                Login as Admin
              </button>
            </form>
          )}

          {/* SIGNUP */}
          {activeTab === 'signup' && (
            <form className="space-y-6 animate-fadeIn" onSubmit={handleSignup}>
              <div className="space-y-5">

                <div className="group">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">Admin Signup Token!</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <LockIcon className="w-5 h-5 text-violet-500" />
                    </span>
                    <input
                      type="password"
                      required
                      value={signupToken}
                      onChange={(e) => setSignupToken(e.target.value)}
                      placeholder="Enter token"
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <UserIcon className="w-5 h-5 text-violet-500" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@campus.edu"
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 rounded-xl"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-2">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <LockIcon className="w-5 h-5 text-violet-500" />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-violet-200 dark:border-slate-700 bg-violet-50/50 dark:bg-slate-800/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="group relative w-full py-4 px-6 rounded-xl text-white font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
                Create Admin Account
              </button>
            </form>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 rounded-xl p-3">
              <p className="text-sm text-red-700 dark:text-red-400 text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-100 dark:bg-green-900/30 border-2 border-green-300 rounded-xl p-3">
              <p className="text-sm text-green-700 dark:text-green-400 text-center">{success}</p>
            </div>
          )}

          {/* GUEST */}
          <button
            onClick={onGuestContinue}
            className="group w-full py-4 px-6 border-2 border-indigo-300 dark:border-slate-600 rounded-xl bg-indigo-50 dark:bg-slate-800/50 text-indigo-700 dark:text-slate-200 font-extrabold"
          >
            Continue as Guest
            <ArrowRightIcon className="ml-2 w-5 h-5 inline-block" />
          </button>

        </div>

        <p className="text-center mt-6 text-sm font-semibold text-slate-700 dark:text-slate-400">Discover the easiest way to navigate your campus ✨</p>
      </div>
    </div>
  );
};

export default LoginPage;
