import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, User } from 'lucide-react';
import BlueTechLogo from './BlueTechLogo';

interface AuthGateProps {
  children: React.ReactNode;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check if admin is already authenticated
    const token = sessionStorage.getItem('bt_admin_token');
    const adminData = sessionStorage.getItem('bt_admin_data');
    if (token && adminData) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save auth data
        sessionStorage.setItem('bt_admin_token', data.access_token);
        sessionStorage.setItem('bt_admin_data', JSON.stringify(data.user));
        setIsAuthenticated(true);
      } else {
        setError(data.detail || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Login Form - Direct on background */}
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          {/* Logo */}
          <div className="mb-4">
            <BlueTechLogo className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-center mb-1">
            Blue Technology
          </h1>
          <p className="text-sm text-blue-200/80 text-center">
            Admin Portal
          </p>
          <p className="text-xs text-blue-300/60 mt-0.5 text-center">
            Kenyan Repair & E-Commerce Management
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/40 rounded-xl py-2.5 pl-10 pr-4 transition-all duration-200 outline-none text-sm"
                required
                disabled={loading}
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-100 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/40 rounded-xl py-2.5 pl-10 pr-12 transition-all duration-200 outline-none text-sm"
                required
                disabled={loading}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-xl p-3 text-xs text-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white font-semibold rounded-xl py-2.5 px-4 shadow-xl shadow-blue-500/40 transition-all hover:shadow-blue-500/60 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
