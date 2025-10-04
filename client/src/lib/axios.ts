import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getTokenFromStore();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      handleUnauthorized();
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get token from localStorage
function getTokenFromStore(): string | null {
  try {
    // Try to get from localStorage first (for persistence)
    const token = localStorage.getItem('token');
    if (token) return token;
    
    // Fallback to Redux store if available
    const state = (window as any).__REDUX_STATE__;
    return state?.auth?.token || null;
  } catch {
    return null;
  }
}

// Handle unauthorized access
function handleUnauthorized() {
  // Clear auth data and redirect to login
  localStorage.clear();
  window.location.href = '/login';
}

export default axiosInstance;
