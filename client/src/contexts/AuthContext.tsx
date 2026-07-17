import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { User } from '../types';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  RegisterCredentials 
} from '../api/auth';
import { 
  getCurrentUser, 
  updateProfile as apiUpdateProfile, 
  UpdateProfileData 
} from '../api/users';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone_number: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, load from sessionStorage
    const storedToken = sessionStorage.getItem('bluetech_token');
    const storedUser = sessionStorage.getItem('bluetech_user');
    const storedExpiry = sessionStorage.getItem('bluetech_token_expiry');

    if (storedToken) {
      // Check expiry
      if (storedExpiry && Date.now() > parseInt(storedExpiry)) {
        sessionStorage.clear();
      } else {
        setToken(storedToken);
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
        }
      }
    }
    setIsLoading(false);
  }, []);

  const loginWithToken = (token: string, user: User, expiresIn?: number) => {
    setToken(token);
    setUser(user);
    sessionStorage.setItem('bluetech_token', token);
    sessionStorage.setItem('bluetech_user', JSON.stringify(user));
    if (expiresIn) {
      sessionStorage.setItem('bluetech_token_expiry', String(Date.now() + expiresIn * 1000));
    }
  };

  const login = async (phone_number: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginUser({ phone_number, password });
      loginWithToken(response.access_token, response.user, response.expires_in);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      if (error.response?.status === 403) {
        const detail = error.response.data?.detail;
        const phone = detail?.phone_number || phone_number;
        toast.error(detail?.message || 'Phone not verified. Check your SMS.');
        // Navigate is not available here — throw a special error for the caller
        const err: any = new Error('unverified');
        err.phone = phone;
        throw err;
      }
      const msg = error.response?.data?.detail || error.response?.data?.message || 'Login failed. Please verify credentials.';
      toast.error(msg);
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
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('bluetech_token');
    sessionStorage.removeItem('bluetech_user');
    sessionStorage.removeItem('bluetech_token_expiry');
    logoutUser().catch(() => {});
    toast.success('Logged out successfully.');
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      const updatedUser = await apiUpdateProfile(data);
      setUser(updatedUser);
      sessionStorage.setItem('bluetech_user', JSON.stringify(updatedUser));
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
      setUser(currentUser);
      sessionStorage.setItem('bluetech_user', JSON.stringify(currentUser));
    } catch {
      // session expired or invalid
      logout();
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      loginWithToken,
      register,
      logout,
      updateProfile,
      refreshUser
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
