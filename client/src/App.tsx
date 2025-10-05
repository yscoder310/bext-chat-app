import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider } from 'react-redux';
import { useEffect, useState, lazy, Suspense } from 'react';
import { store } from './store';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageLoader } from './components/LoadingFallback';
import { socketService } from './lib/socket';
import { getSetting } from './components/UserSettingsModal';
import { initializeNotifications, isNotificationSupported } from './utils/browserNotifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then(module => ({ default: module.ChatPage })));

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
});

function AppContent() {
  useEffect(() => {
    // Auto-reconnect socket if user is logged in
    const token = localStorage.getItem('token');
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    // Request notification permission when user interacts with the app
    // This ensures notifications work when tab is minimized or inactive
    if (token && isNotificationSupported()) {
      const desktopNotifications = getSetting('desktopNotifications') as boolean;
      if (desktopNotifications && Notification.permission === 'default') {
        // Request permission on first user interaction (click, keypress, etc.)
        const requestPermission = () => {
          initializeNotifications();
          // Remove listeners after first interaction
          document.removeEventListener('click', requestPermission);
          document.removeEventListener('keypress', requestPermission);
        };
        
        document.addEventListener('click', requestPermission, { once: true });
        document.addEventListener('keypress', requestPermission, { once: true });
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function App() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    const darkMode = getSetting('darkMode') as boolean;
    return darkMode ? 'dark' : 'light';
  });

  useEffect(() => {
    // Listen for storage changes to sync theme across tabs
    const handleStorageChange = () => {
      const darkMode = getSetting('darkMode') as boolean;
      const newScheme: 'light' | 'dark' = darkMode ? 'dark' : 'light';
      setColorScheme(newScheme);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event from UserSettingsModal
    const handleThemeChange = (e: CustomEvent) => {
      setColorScheme(e.detail.colorScheme);
    };
    
    window.addEventListener('themeChange' as any, handleThemeChange as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange' as any, handleThemeChange as any);
    };
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} forceColorScheme={colorScheme}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <AppContent />
          </ModalsProvider>
        </MantineProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
