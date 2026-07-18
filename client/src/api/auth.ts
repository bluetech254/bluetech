import api from './axios';
import { User } from '../types';

export interface LoginCredentials {
  phone_number: string;
  password: string;
}

export interface RegisterCredentials {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  message?: string;
  expires_in?: number;
}

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', {
    phone_number: credentials.phone_number,
    password: credentials.password,
  });
  return response.data;
};

export const registerUser = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/signup', credentials);
  return response.data;
};

export const resendVerification = async (phone_number: string) => {
  const response = await api.post('/auth/resend-code', { phone_number });
  return response.data;
};

export const verifyPhone = async (phone_number: string, verification_code: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/verify-phone', { phone_number, verification_code });
  return response.data;
};

export const requestPasswordReset = async (phone_number: string) => {
  const response = await api.post('/auth/password-reset', null, {
    params: { phone_number },
  });
  return response.data;
};

export const resetPassword = async (phone_number: string, reset_code: string, new_password: string) => {
  const response = await api.post('/auth/reset-password', null, {
    params: { phone_number, reset_code, new_password },
  });
  return response.data;
};

export const logoutUser = async (): Promise<void> => {
  await api.post('/auth/logout').catch(() => {});
};
