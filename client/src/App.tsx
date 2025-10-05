import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider } from 'react-redux';
import { useEffect, useState } from 'react';
import { store } from './store';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatPage } from './pages/ChatPage';
import { socketService } from './lib/socket';
import { getSetting } from './components/UserSettingsModal';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

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
  }, []);

  return (
    <BrowserRouter>
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
          <Notifications position="top-right" />
          <AppContent />
        </MantineProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
