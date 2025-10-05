import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useChatRequests } from '../hooks/useChatRequests';
import { useAppSelector } from '../store/hooks';
import { Conversation } from '../types';

interface UserListModalProps {
  opened: boolean;
  onClose: () => void;
  existingConversations: Conversation[];
}

export const UserListModal = ({ opened, onClose, existingConversations }: UserListModalProps) => {
  const [search, setSearch] = useState('');
  const { sendRequest } = useChatRequests();
  const { user: currentUser } = useAppSelector((state) => state.auth);

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
