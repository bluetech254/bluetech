/**
 * api/auth.ts — Client authentication API calls.
 *
 * Endpoints map to backend auth/router.py (prefix: /api/v1/auth)
 * baseURL in axios.ts already includes /api/v1 so paths here are relative.
 */
import api from './axios';
import { User } from '../types';

export interface LoginCredentials {
  phone_number: string;
  password: string;
}

export interface RegisterCredentials {
  full_name: string;
  phone_number: string;
  email?: string;
  password: string;
  referral_code?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in?: number;
  message?: string;
}

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const registerUser = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/signup', credentials);
  return response.data;
};

export const resendVerification = async (phone_number: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/resend-code', { phone_number });
  return response.data;
};

export const verifyPhone = async (
  phone_number: string,
  verification_code: string
): Promise<{ message: string }> => {
  const response = await api.post('/auth/verify-phone', { phone_number, verification_code });
  return response.data;
};

export const requestPasswordReset = async (phone_number: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/forgot-password', { phone_number });
  return response.data;
};

export const resetPassword = async (
  phone_number: string,
  reset_code: string,
  new_password: string
): Promise<{ message: string }> => {
  const response = await api.post('/auth/reset-password', { phone_number, reset_code, new_password });
  return response.data;
};

/**
 * Stateless logout — backend just returns {message: "Logged out"}.
 * Real logout is handled in AuthContext by clearing sessionStorage.
 * This call is fire-and-forget: failure does not affect client-side logout.
 */
export const logoutUser = async (): Promise<void> => {
  await api.post('/auth/logout').catch(() => {});
};
