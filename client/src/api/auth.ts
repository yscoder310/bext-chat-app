import axiosInstance from '../lib/axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types';

export const authApi = {
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post('/auth/register', credentials);
    return data.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await axiosInstance.post('/auth/login', credentials);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const { data } = await axiosInstance.get('/auth/profile');
    return data.data;
  },

  getAllUsers: async (): Promise<User[]> => {
    const { data } = await axiosInstance.get('/auth/users');
    return data.data;
  },

  updateProfile: async (updates: { username?: string; email?: string }): Promise<AuthResponse> => {
    const { data } = await axiosInstance.put('/auth/profile', updates);
    return data.data;
  },

  updatePassword: async (passwords: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    const { data } = await axiosInstance.put('/auth/password', passwords);
    return data.data;
  },
};
