/**
 * api/users.ts — Client user self-service API calls.
 *
 * Endpoints map to backend auth/router.py:
 *   GET  /users/me         → get current user profile
 *   PUT  /users/me         → update full_name / email
 *   PUT  /users/me/password → change own password
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
  const response = await api.get('/users/me');
  return response.data;
};

export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.put('/users/me', data);
  return response.data;
};

export const changePassword = async (data: UpdatePasswordData): Promise<{ message: string }> => {
  const response = await api.put('/users/me/password', data);
  return response.data;
};
