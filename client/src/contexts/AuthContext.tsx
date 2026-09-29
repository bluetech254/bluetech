import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { User } from '../types';
import {
  loginUser,
  registerUser,
  logoutUser,
  RegisterCredentials,
} from '../api/auth';
import {
  getCurrentUser,
  updateProfile as apiUpdateProfile,
  UpdateProfileData,
} from '../api/users';
import {
  getToken,
  setToken,
  getUser,
  setUser,
  clearSession,
  isTokenExpired,
  getTokenExpiry,
  StoredUser,
} from '../utils/tokenStore';
import { SESSION_EXPIRED_EVENT } from '../api/axios';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone_number: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: User, expiresIn?: number) => void;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Hydrate from tokenStore on mount ────────────────────────────────────────
  useEffect(() => {
    if (isTokenExpired()) {
      clearSession();
    } else {
      const storedToken = getToken();
      const storedUser  = getUser();
      if (storedToken) setTokenState(storedToken);
      if (storedUser)  setUserState(storedUser as unknown as User);
    }
    setIsLoading(false);
  }, []);

  // ── Auto-logout when token expires ──────────────────────────────────────────
  useEffect(() => {
    const expiry = getTokenExpiry();
    if (!expiry || !token) return;

    const remaining = expiry - Date.now();
    if (remaining <= 0) {
      _doLogout();
      return;
    }

    const timer = setTimeout(() => {
      toast.error('Your session has expired. Please log in again.');
      _doLogout(true);
    }, remaining);

    return () => clearTimeout(timer);
  }, [token]);

  // ── Listen for 401 from axios interceptor ───────────────────────────────────
  useEffect(() => {
    const handler = () => _doLogout();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, []);

  // ── Internal helpers ─────────────────────────────────────────────────────────

  const _doLogout = (showToast = false) => {
    setTokenState(null);
    setUserState(null);
    clearSession();
    if (showToast) toast.error('Session expired. Please log in again.');
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  const loginWithToken = (newToken: string, newUser: User, expiresIn?: number) => {
    setToken(newToken, expiresIn);
    setUser(newUser as unknown as Record<string, unknown>);
    setTokenState(newToken);
    setUserState(newUser);
  };

  const login = async (phone_number: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginUser({ phone_number, password });
      loginWithToken(response.access_token, response.user, response.expires_in);
    } catch (error: any) {
      if (error.response?.status === 403) {
        const detail = error.response.data?.detail;
        const phone  = detail?.phone_number || phone_number;
        const err: any = new Error('unverified');
        err.phone = phone;
        throw err;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterCredentials) => {
    setIsLoading(true);
    try {
      const response = await registerUser(data);
      loginWithToken(response.access_token, response.user, response.expires_in);
      toast.success('Account registered successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    _doLogout();
    logoutUser().catch(() => {});
    toast.success('Logged out successfully.');
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const updatedUser = await apiUpdateProfile(data);
      setUser(updatedUser as unknown as Record<string, unknown>);
      setUserState(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update profile.';
      toast.error(msg);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser as unknown as Record<string, unknown>);
      setUserState(currentUser);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      loginWithToken,
      register,
      logout,
      updateProfile,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
