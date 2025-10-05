import { Modal, Stack, TextInput, ScrollArea, Group, Avatar, Text, Button, Checkbox, Textarea, Switch, NumberInput } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAppSelector } from '../store/hooks';
import { notifications } from '@mantine/notifications';
import { CreateGroupInput } from '../types';

interface CreateGroupModalProps {
  opened: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: CreateGroupInput) => void;
}

export const CreateGroupModal = ({ opened, onClose, onCreateGroup }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [maxMembers, setMaxMembers] = useState(500);
  const [allowMemberInvites, setAllowMemberInvites] = useState(false);
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

    const groupData: CreateGroupInput = {
      groupName: groupName.trim(),
      groupDescription: groupDescription.trim() || undefined,
      groupType: isPublic ? 'public' : 'private',
      participants: Array.from(selectedUsers),
      settings: {
        maxMembers,
        allowMemberInvites,
        isArchived: false,
      },
    };

    onCreateGroup(groupData);
    
    // Reset form
    setGroupName('');
    setGroupDescription('');
    setIsPublic(false);
    setMaxMembers(500);
    setAllowMemberInvites(false);
    setSearch('');
    setSelectedUsers(new Set());
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setGroupDescription('');
    setIsPublic(false);
    setMaxMembers(500);
    setAllowMemberInvites(false);
    setSearch('');
    setSelectedUsers(new Set());
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create Group Chat" size="lg">
      <Stack>
        <TextInput
          label="Group Name"
          placeholder="Enter group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          required
        />

        <Textarea
          label="Group Description"
          placeholder="What's this group about? (optional)"
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          minRows={2}
          maxRows={4}
          maxLength={500}
        />

        <Group grow>
          <Switch
            label="Public Group"
            description="Anyone can discover and join"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
          />
          <Switch
            label="Allow Member Invites"
            description="Let members invite others"
            checked={allowMemberInvites}
            onChange={(e) => setAllowMemberInvites(e.currentTarget.checked)}
          />
        </Group>

        <NumberInput
          label="Maximum Members"
          description="Set the group capacity"
          value={maxMembers}
          onChange={(value) => setMaxMembers(Number(value) || 500)}
          min={2}
          max={1000}
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
