/**
 * Browser notification utility for cross-platform desktop notifications
 * Supports Windows, macOS, and Linux with proper permission handling
 */

/**
 * Check if browser notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

/**
 * Check if the browser tab/window is currently hidden or minimized
 * Works across all platforms (Windows, macOS, Linux)
 */
export const isTabHidden = (): boolean => {
  return document.hidden || document.visibilityState === 'hidden';
};

/**
 * Check if browser notifications are enabled and permission is granted
 */
export const isNotificationEnabled = (): boolean => {
  return isNotificationSupported() && Notification.permission === 'granted';
};

/**
 * Request notification permission from the user
 * Returns the permission status: 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
  onClick?: () => void;
  onClose?: () => void;
  autoClose?: number; // Auto-close after N milliseconds
}

/**
 * Show a browser notification
 * Automatically handles permission checks and cross-platform compatibility
 */
export const showBrowserNotification = (options: BrowserNotificationOptions): Notification | null => {
  const {
    title,
    body,
    icon = '/favicon.ico',
    tag,
    silent = false,
    requireInteraction = false,
    onClick,
    onClose,
    autoClose = 5000, // Default 5 seconds
  } = options;

  // Check if notifications are supported and enabled
  if (!isNotificationEnabled()) {
    return null;
  }

  try {
    // Create the notification
    const notification = new Notification(title, {
      body,
      icon,
      tag, // Prevents duplicate notifications for same conversation
      silent,
      requireInteraction,
      badge: icon, // Badge icon for mobile/PWA
      renotify: true, // Re-alert user for same tag
    } as NotificationOptions);

    // Handle notification click
    if (onClick) {
      notification.onclick = () => {
        onClick();
        notification.close();
      };
    } else {
      // Default behavior: focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Handle notification close
    if (onClose) {
      notification.onclose = onClose;
    }

    // Auto-close notification after specified time
    if (autoClose > 0) {
      setTimeout(() => {
        notification.close();
      }, autoClose);
    }

    return notification;
  } catch (error) {
    console.error('Error showing browser notification:', error);
    return null;
  }
};

/**
 * Show notification only when tab is hidden/minimized
 * This provides better UX by not showing redundant notifications
 */
export const showNotificationWhenHidden = (options: BrowserNotificationOptions): Notification | null => {
  if (isTabHidden()) {
    return showBrowserNotification(options);
  }
  return null;
};

/**
 * Initialize notification permission on app load
 * This should be called when user first interacts with the app
 */
export const initializeNotifications = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    return false;
  }

  // If permission is already granted or denied, don't ask again
  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  // Permission is 'default', need to request
  const permission = await requestNotificationPermission();
  return permission === 'granted';
};

/**
 * Listen for visibility changes and execute callback
 * Useful for tracking when user switches tabs
 */
export const onVisibilityChange = (callback: (isHidden: boolean) => void): (() => void) => {
  const handler = () => {
    callback(isTabHidden());
  };

  document.addEventListener('visibilitychange', handler);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handler);
  };
};

/**
 * Update page title with notification count (e.g., "(3) Chat App")
 * Common pattern for showing unread messages when tab is inactive
 */
export const updatePageTitle = (count: number, baseTitle: string = 'Chat App'): void => {
  if (count > 0) {
    document.title = `(${count}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
};

/**
 * Flash the page title to grab attention (for critical notifications)
 * Automatically stops when user focuses the tab
 */
export const flashPageTitle = (
  message: string,
  baseTitle: string = 'Chat App',
  interval: number = 1000
): (() => void) => {
  let currentTitle = baseTitle;

  const flashInterval = setInterval(() => {
    if (!isTabHidden()) {
      // Stop flashing when tab becomes visible
      clearInterval(flashInterval);
      document.title = baseTitle;
      return;
    }

    document.title = currentTitle === baseTitle ? message : baseTitle;
    currentTitle = document.title;
  }, interval);

  // Return cleanup function
  return () => {
    clearInterval(flashInterval);
    document.title = baseTitle;
  };
};
