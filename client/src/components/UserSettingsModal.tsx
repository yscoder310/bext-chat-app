import { Modal, Stack, Switch, Text, Divider, Group, Paper } from '@mantine/core';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { 
  Moon, 
  Bell, 
  Eye, 
  Keyboard,
  Volume2,
  CheckSquare
} from 'lucide-react';

interface UserSettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

interface Settings {
  // Appearance
  darkMode: boolean;
  
  // Notifications
  soundEnabled: boolean;
  desktopNotifications: boolean;
  messagePreview: boolean;
  
  // Privacy
  showOnlineStatus: boolean;
  sendReadReceipts: boolean;
  
  // Chat
  enterToSend: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  soundEnabled: true,
  desktopNotifications: true,
  messagePreview: true,
  showOnlineStatus: true,
  sendReadReceipts: true,
  enterToSend: true,
};

export const UserSettingsModal = ({ opened, onClose }: UserSettingsModalProps) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    
    // Apply dark mode immediately and dispatch event
    if (key === 'darkMode') {
      const colorScheme = value ? 'dark' : 'light';
      document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
      
      // Dispatch custom event for App.tsx to listen to
      window.dispatchEvent(new CustomEvent('themeChange', {
        detail: { colorScheme }
      }));
    }
    
    // Request notification permission if enabling desktop notifications
    if (key === 'desktopNotifications' && value) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'denied') {
            notifications.show({
              title: 'Permission Denied',
              message: 'Please enable notifications in your browser settings',
              color: 'red',
            });
            updateSetting('desktopNotifications', false);
          }
        });
      }
    }
  };

  // Helper function to get notification permission status
  const getNotificationStatus = () => {
    if (!('Notification' in window)) return 'not-supported';
    return Notification.permission;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="lg" fw={600}>
          Settings
        </Text>
      }
      size="md"
    >
      <Stack gap="lg">
        {/* Appearance Settings */}
        <div>
          <Text size="sm" fw={600} mb="md" c="dimmed">
            APPEARANCE
          </Text>
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <Group gap="sm">
                <Moon size={20} />
                <div>
                  <Text size="sm" fw={500}>
                    Dark Mode
                  </Text>
                  <Text size="xs" c="dimmed">
                    Switch between light and dark theme
                  </Text>
                </div>
              </Group>
              <Switch
                checked={settings.darkMode}
                onChange={(e) => updateSetting('darkMode', e.currentTarget.checked)}
                size="md"
              />
            </Group>
          </Paper>
        </div>

        <Divider />

        {/* Notification Settings */}
        <div>
          <Text size="sm" fw={600} mb="md" c="dimmed">
            NOTIFICATIONS
          </Text>
          <Stack gap="sm">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <Volume2 size={20} />
                  <div>
                    <Text size="sm" fw={500}>
                      Sound
                    </Text>
                    <Text size="xs" c="dimmed">
                      Play sound for new messages
                    </Text>
                  </div>
                </Group>
                <Switch
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSetting('soundEnabled', e.currentTarget.checked)}
                  size="md"
                />
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <Bell size={20} />
                  <div>
                    <Text size="sm" fw={500}>
                      Desktop Notifications
                    </Text>
                    <Text size="xs" c="dimmed">
                      Show notifications for new messages
                      {getNotificationStatus() === 'denied' && ' (Blocked)'}
                    </Text>
                  </div>
                </Group>
                <Switch
                  checked={settings.desktopNotifications}
                  onChange={(e) => updateSetting('desktopNotifications', e.currentTarget.checked)}
                  disabled={getNotificationStatus() === 'denied'}
                  size="md"
                />
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <Eye size={20} />
                  <div>
                    <Text size="sm" fw={500}>
                      Message Preview
                    </Text>
                    <Text size="xs" c="dimmed">
                      Show message content in notifications
                    </Text>
                  </div>
                </Group>
                <Switch
                  checked={settings.messagePreview}
                  onChange={(e) => updateSetting('messagePreview', e.currentTarget.checked)}
                  disabled={!settings.desktopNotifications}
                  size="md"
                />
              </Group>
            </Paper>
          </Stack>
        </div>

        <Divider />

        {/* Privacy Settings */}
        <div>
          <Text size="sm" fw={600} mb="md" c="dimmed">
            PRIVACY
          </Text>
          <Stack gap="sm">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <Eye size={20} />
                  <div>
                    <Text size="sm" fw={500}>
                      Online Status
                    </Text>
                    <Text size="xs" c="dimmed">
                      Let others see when you're online
                    </Text>
                  </div>
                </Group>
                <Switch
                  checked={settings.showOnlineStatus}
                  onChange={(e) => updateSetting('showOnlineStatus', e.currentTarget.checked)}
                  size="md"
                />
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="sm">
                  <CheckSquare size={20} />
                  <div>
                    <Text size="sm" fw={500}>
                      Read Receipts
                    </Text>
                    <Text size="xs" c="dimmed">
                      Send read receipts to others
                    </Text>
                  </div>
                </Group>
                <Switch
                  checked={settings.sendReadReceipts}
                  onChange={(e) => updateSetting('sendReadReceipts', e.currentTarget.checked)}
                  size="md"
                />
              </Group>
            </Paper>
          </Stack>
        </div>

        <Divider />

        {/* Chat Settings */}
        <div>
          <Text size="sm" fw={600} mb="md" c="dimmed">
            CHAT
          </Text>
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <Group gap="sm">
                <Keyboard size={20} />
                <div>
                  <Text size="sm" fw={500}>
                    Enter to Send
                  </Text>
                  <Text size="xs" c="dimmed">
                    Press Enter to send, Shift+Enter for new line
                  </Text>
                </div>
              </Group>
              <Switch
                checked={settings.enterToSend}
                onChange={(e) => updateSetting('enterToSend', e.currentTarget.checked)}
                size="md"
              />
            </Group>
          </Paper>
        </div>

        {/* Info Text */}
        <Text size="xs" c="dimmed" ta="center">
          Settings are saved locally in your browser
        </Text>
      </Stack>
    </Modal>
  );
};

// Export function to get current settings
export const getSettings = (): Settings => {
  const savedSettings = localStorage.getItem('userSettings');
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  return DEFAULT_SETTINGS;
};

// Export function to check specific setting
export const getSetting = <K extends keyof Settings>(key: K): Settings[K] => {
  const settings = getSettings();
  return settings[key];
};
