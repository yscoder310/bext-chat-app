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
};
