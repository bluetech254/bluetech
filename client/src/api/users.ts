/**
 * api/users.ts — Client user self-service API calls.
 *
 * Endpoints map to backend auth/router.py (prefix: /api/v1/auth):
 *   GET  /auth/users/me          → get current user profile
 *   PUT  /auth/users/me          → update full_name / email
 *   PUT  /auth/users/me/password → change own password
 *
 * NOTE: baseURL in axios.ts is /api/v1, so paths here include /auth/
 */
import api from './axios';
import { User } from '../types';

export interface UpdateProfileData {
  full_name?: string;
  email?: string;
}

export interface UpdatePasswordData {
  current_password: string;
  new_password: string;
}

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/users/me');
  return response.data;
};

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.put('/auth/users/me', data);
  return response.data;
};

export const changePassword = async (data: UpdatePasswordData): Promise<{ message: string }> => {
  const response = await api.put('/auth/users/me/password', data);
  return response.data;
};
