import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginStart, loginSuccess, loginFailure, logout as logoutAction } from '../store/slices/authSlice';
import { resetChatState } from '../store/slices/chatSlice';
import { authApi } from '../api/auth';
import { LoginCredentials, RegisterCredentials } from '../types';
import { socketService } from '../lib/socket';
import { notifications } from '@mantine/notifications';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onMutate: () => {
      dispatch(loginStart());
    },
    onSuccess: (data) => {
      dispatch(loginSuccess(data));
      
      // Connect to socket
      socketService.connect(data.token);
      
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green',
      });
      
      navigate('/');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Login failed';
      dispatch(loginFailure(message));
      
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (credentials: RegisterCredentials) => authApi.register(credentials),
    onMutate: () => {
      dispatch(loginStart());
    },
    onSuccess: (data) => {
      dispatch(loginSuccess(data));
      
      // Connect to socket
      socketService.connect(data.token);
      
      notifications.show({
        title: 'Success',
        message: 'Account created successfully',
        color: 'green',
      });
      
      navigate('/');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Registration failed';
      dispatch(loginFailure(message));
      
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    },
  });

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Disconnect socket
      socketService.disconnect();
      
      // Clear Redux state
      dispatch(logoutAction());
      dispatch(resetChatState());
      
      // Clear all TanStack Query cache
      queryClient.clear();
      
      // Clear localStorage completely
      localStorage.clear();
      
      // Navigate to login
      navigate('/login');
      
      notifications.show({
        title: 'Success',
        message: 'Logged out successfully',
        color: 'blue',
      });
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
};
