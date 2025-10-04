import { useEffect } from 'react';
import { AppShell, Burger, Group, Title, Avatar, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLogout, IconSettings } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { ConversationList } from '../components/ConversationList';
import { ChatArea } from '../components/ChatArea';
import { ChatRequestButton } from '../components/ChatRequestButton';

export const ChatPage = () => {
  const [opened, { toggle }] = useDisclosure();
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
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>Chat App</Title>
          </Group>
          
          <Group>
            <ChatRequestButton />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar src={user?.avatar} alt={user?.username} style={{ cursor: 'pointer' }} />
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>{user?.username}</Menu.Label>
                <Menu.Item leftSection={<IconSettings size={14} />}>
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
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

      <AppShell.Navbar p="md">
        <ConversationList />
      </AppShell.Navbar>

      <AppShell.Main>
        <ChatArea />
      </AppShell.Main>
    </AppShell>
  );
};
