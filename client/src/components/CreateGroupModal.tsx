import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button, Checkbox } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAppSelector } from '../store/hooks';
import { notifications } from '@mantine/notifications';

interface CreateGroupModalProps {
  opened: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, participants: string[]) => void;
}

export const CreateGroupModal = ({ opened, onClose, onCreateGroup }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: authApi.getAllUsers,
    enabled: opened,
  });

  // Filter out current user
  const availableUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = user?.username?.toLowerCase().includes(search.toLowerCase());
      const isNotCurrentUser = currentUser && user.id !== currentUser.id;
      return matchesSearch && isNotCurrentUser;
    });
  }, [users, search, currentUser]);

  const handleToggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a group name',
        color: 'red',
      });
      return;
    }

    if (selectedUsers.size < 2) {
      notifications.show({
        title: 'Error',
        message: 'Please select at least 2 members for the group',
        color: 'red',
      });
      return;
    }

    onCreateGroup(groupName.trim(), Array.from(selectedUsers));
    
    // Reset form
    setGroupName('');
    setSearch('');
    setSelectedUsers(new Set());
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSearch('');
    setSelectedUsers(new Set());
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create Group Chat" size="md">
      <Stack>
        <TextInput
          label="Group Name"
          placeholder="Enter group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />

        <div>
          <Text size="sm" fw={500} mb="xs">
            Add Members ({selectedUsers.size} selected)
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
                No users found
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
                      <Text size="xs" c="dimmed">
                        {user.email || ''}
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
          <Button onClick={handleCreate} disabled={!groupName.trim() || selectedUsers.size < 2}>
            Create Group
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
