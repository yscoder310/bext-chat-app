import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button, Checkbox } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAppSelector } from '../store/hooks';
import { notifications } from '@mantine/notifications';
import { socketService } from '../lib/socket';
import { Conversation } from '../types';

interface InviteMembersModalProps {
  opened: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

export const InviteMembersModal = ({ opened, onClose, conversation }: InviteMembersModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.getAllUsers,
    enabled: opened,
  });

  // Filter out current user and existing participants
  const availableUsers = useMemo(() => {
    if (!conversation) return [];
    
    const participantIds = new Set(conversation.participants.map(p => p.id));
    
    return users.filter((user) => {
      const matchesSearch = user?.username?.toLowerCase().includes(search.toLowerCase());
      const isNotCurrentUser = currentUser && user.id !== currentUser.id;
      const isNotParticipant = !participantIds.has(user.id);
      return matchesSearch && isNotCurrentUser && isNotParticipant;
    });
  }, [users, search, currentUser, conversation]);

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleInvite = () => {
    if (!conversation) return;

    if (selectedUsers.size === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least one user to invite',
        color: 'red',
      });
      return;
    }

    // Check if group is at capacity
    if (conversation.groupSettings?.maxMembers) {
      const currentMemberCount = conversation.participants.length;
      const newMemberCount = currentMemberCount + selectedUsers.size;
      
      if (newMemberCount > conversation.groupSettings.maxMembers) {
        notifications.show({
          title: 'Error',
          message: `Group capacity exceeded. Maximum ${conversation.groupSettings.maxMembers} members allowed.`,
          color: 'red',
        });
        return;
      }
    }

    socketService.inviteToGroup(conversation.id, Array.from(selectedUsers));
    
    notifications.show({
      title: 'Invitations Sent',
      message: `Sent ${selectedUsers.size} invitation${selectedUsers.size > 1 ? 's' : ''}`,
      color: 'green',
    });

    // Reset form
    setSearch('');
    setSelectedUsers(new Set());
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    setSelectedUsers(new Set());
    onClose();
  };

  if (!conversation) return null;

  return (
    <Modal opened={opened} onClose={handleClose} title="Invite Members" size="md">
      <Stack>
        <Text size="sm" c="dimmed">
          Invite users to join <strong>{conversation.groupName}</strong>
        </Text>

        {conversation.groupSettings && (
          <Text size="xs" c="dimmed">
            Current: {conversation.participants.length} / {conversation.groupSettings.maxMembers} members
          </Text>
        )}

        <div>
          <Text size="sm" fw={500} mb="xs">
            Select Users ({selectedUsers.size} selected)
          </Text>
          <TextInput
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            mb="sm"
          />
        </div>

        <ScrollArea h={300}>
          <Stack gap="xs">
            {availableUsers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No users available to invite
              </Text>
            ) : (
              availableUsers.map((user) => (
                <Group key={user.id} justify="space-between" p="sm" style={{ cursor: 'pointer' }}>
                  <Group onClick={() => handleToggleUser(user.id)} style={{ flex: 1 }}>
                    <Avatar>{user.username?.[0]?.toUpperCase() || '?'}</Avatar>
                    <div>
                      <Text size="sm" fw={500}>
                        {user.username || 'Unknown'}
                      </Text>
                    </div>
                  </Group>
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onChange={() => handleToggleUser(user.id)}
                  />
                </Group>
              ))
            )}
          </Stack>
        </ScrollArea>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={selectedUsers.size === 0}>
            Send Invitations
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
