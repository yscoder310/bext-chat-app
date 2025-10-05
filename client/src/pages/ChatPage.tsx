import { useEffect } from 'react';
import { AppShell, Burger, Group, Title, Avatar, Menu, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { ConversationList } from '../components/ConversationList';
import { ChatArea } from '../components/ChatArea';
import { ChatRequestButton } from '../components/ChatRequestButton';
import { UserProfileModal } from '../components/UserProfileModal';
import { UserSettingsModal } from '../components/UserSettingsModal';
import { getAvatarColor } from '../utils/avatarColor';

export const ChatPage = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [opened, { toggle }] = useDisclosure();
  const [profileOpened, { open: openProfile, close: closeProfile }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const { user, logout } = useAuth();
  
  // Initialize socket connection and listeners
  useSocket();

  useEffect(() => {
    console.log('ChatPage mounted, socket should be initializing...');
  }, []);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={0}
      styles={{
        main: {
          backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[1],
        },
        header: {
          backgroundColor: isDark ? theme.colors.dark[6] : 'white',
          borderBottom: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger 
              opened={opened} 
              onClick={toggle} 
              hiddenFrom="sm" 
              size="sm"
            />
            <Title order={3}>Chat App</Title>
          </Group>
          
          <Group>
            <ChatRequestButton />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar 
                  src={user?.avatar} 
                  alt={user?.username}
                  color={getAvatarColor(user?.username || 'User')}
                  style={{ 
                    cursor: 'pointer',
                  }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{user?.username}</Menu.Label>
                <Menu.Item leftSection={<User size={14} />} onClick={openProfile}>
                  Profile Settings
                </Menu.Item>
                <Menu.Item leftSection={<Settings size={14} />} onClick={openSettings}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<LogOut size={14} />}
                  color="red"
                  onClick={logout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar 
        p="md"
        style={{
          backgroundColor: isDark ? theme.colors.dark[6] : 'white',
          borderRight: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          boxShadow: isDark 
            ? '2px 0 8px rgba(0, 0, 0, 0.3)' 
            : '2px 0 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <ConversationList />
      </AppShell.Navbar>

      <AppShell.Main>
        <ChatArea />
      </AppShell.Main>

      <UserProfileModal opened={profileOpened} onClose={closeProfile} />
      <UserSettingsModal opened={settingsOpened} onClose={closeSettings} />
    </AppShell>
  );
};
