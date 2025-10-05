import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button, Badge, ActionIcon, Paper, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useChatRequests } from '../hooks/useChatRequests';
import { useAppSelector } from '../store/hooks';
import { Conversation } from '../types';
import { Search, MessageCircle, Send } from 'lucide-react';

interface UserListModalProps {
  opened: boolean;
  onClose: () => void;
  existingConversations: Conversation[];
}

export const UserListModal = ({ opened, onClose, existingConversations }: UserListModalProps) => {
  const [search, setSearch] = useState('');
  const { sendRequest } = useChatRequests();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.getAllUsers,
    enabled: opened,
  });

  // Get list of user IDs who already have one-to-one conversations with current user
  const existingUserIds = useMemo(() => {
    const userIds = new Set<string>();
    
    existingConversations.forEach((conv) => {
      if (conv.type === 'one-to-one' && currentUser) {
        // Find the other participant in the conversation
        const otherParticipant = conv.participants.find(
          (p) => p.id !== currentUser.id
        );
        if (otherParticipant) {
          userIds.add(otherParticipant.id);
        }
      }
    });
    
    return userIds;
  }, [existingConversations, currentUser]);

  // Filter out current user and users who already have conversations
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user?.username?.toLowerCase().includes(search.toLowerCase());
    const isNotCurrentUser = currentUser && user.id !== currentUser.id;
    const notInExistingConversation = !existingUserIds.has(user.id);
    
    return matchesSearch && isNotCurrentUser && notInExistingConversation;
  });

  const handleStartChat = (userId: string) => {
    sendRequest({ receiverId: userId });
    onClose();
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={
        <Group gap="xs">
          <MessageCircle size={20} color={theme.colors.blue[6]} />
          <Text fw={600}>Start a Conversation</Text>
        </Group>
      }
      size="md"
      radius="lg"
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search users by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftSection={<Search size={16} />}
          radius="md"
          size="md"
        />

        <ScrollArea h={400} type="auto">
          <Stack gap="xs">
            {filteredUsers.length === 0 ? (
              <Paper 
                p="xl" 
                radius="md" 
                style={{
                  backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
                  border: `2px dashed ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                }}
              >
                <Stack align="center" gap="md">
                  <ActionIcon size={60} radius="xl" variant="light" color="gray">
                    <Search size={30} />
                  </ActionIcon>
                  <Stack align="center" gap={4}>
                    <Text size="sm" fw={500} c="dimmed">
                      No users found
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      {search ? 'Try a different search term' : 'All users already have conversations'}
                    </Text>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              filteredUsers.map((user) => (
                <Paper
                  key={user.id}
                  p="md"
                  radius="md"
                  shadow="xs"
                  style={{
                    backgroundColor: isDark ? theme.colors.dark[6] : 'white',
                    border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <Avatar 
                        size={44} 
                        radius="xl"
                        color="blue"
                        variant="light"
                      >
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={600}>
                          {user.username || 'Unknown'}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          Available
                        </Badge>
                      </div>
                    </Group>
                    <Button 
                      size="sm" 
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
                      onClick={() => handleStartChat(user.id)}
                      leftSection={<Send size={16} />}
                      radius="md"
                    >
                      Send Request
                    </Button>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
};
