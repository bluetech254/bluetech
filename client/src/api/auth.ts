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
}

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const registerUser = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/signup', credentials);
  return response.data;
};

export const logoutUser = async (): Promise<void> => {
  await api.post('/auth/logout');
};
