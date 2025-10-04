import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button } from '@mantine/core';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useChatRequests } from '../hooks/useChatRequests';

interface UserListModalProps {
  opened: boolean;
  onClose: () => void;
}

export const UserListModal = ({ opened, onClose }: UserListModalProps) => {
  const [search, setSearch] = useState('');
  const { sendRequest } = useChatRequests();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.getAllUsers,
    enabled: opened,
  });

  const filteredUsers = users.filter((user) =>
    user?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartChat = (userId: string) => {
    sendRequest({ receiverId: userId });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Start a conversation" size="md">
      <Stack>
        <TextInput
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <ScrollArea h={400}>
          <Stack gap="xs">
            {filteredUsers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No users found
              </Text>
            ) : (
              filteredUsers.map((user) => (
                <Group key={user.id} justify="space-between" p="sm">
                  <Group>
                    <Avatar>{user.username?.[0]?.toUpperCase() || '?'}</Avatar>
                    <div>
                      <Text size="sm" fw={500}>
                        {user.username || 'Unknown'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email || ''}
                      </Text>
                    </div>
                  </Group>
                  <Button size="xs" onClick={() => handleStartChat(user.id)}>
                    Send Request
                  </Button>
                </Group>
              ))
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
};
