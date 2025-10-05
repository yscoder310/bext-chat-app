import { useState } from 'react';
import { 
  Paper, 
  Group, 
  Avatar, 
  Text, 
  Badge, 
  Box, 
  Tooltip, 
  ActionIcon, 
  Menu, 
  TextInput,
  useMantineColorScheme, 
  useMantineTheme 
} from '@mantine/core';
import { 
  Users, 
  Edit, 
  Check, 
  X, 
  MoreVertical, 
  LogOut, 
  UserPlus 
} from 'lucide-react';
import { Conversation } from '../../types';
import { getAvatarColor } from '../../utils/avatarColor';

interface ChatHeaderProps {
  conversation: Conversation;
  currentUserId?: string;
  displayName: string;
  avatarInitial: string;
  isOtherUserOnline: boolean | null;
  lastSeenText: string | null;
  groupMembersInfo: { online: number; total: number } | null;
  isCurrentUserAdmin: boolean;
  activeTypingUsers: any[];
  onOpenMembersModal: () => void;
  onOpenEditDetails: () => void;
  onOpenInviteMembers: () => void;
  onLeaveGroup: () => void;
  onUpdateGroupName: (name: string) => void;
}

export const ChatHeader = ({
  conversation,
  currentUserId,
  displayName,
  avatarInitial,
  isOtherUserOnline,
  lastSeenText,
  groupMembersInfo,
  isCurrentUserAdmin,
  activeTypingUsers,
  onOpenMembersModal,
  onOpenEditDetails,
  onOpenInviteMembers,
  onLeaveGroup,
  onUpdateGroupName,
}: ChatHeaderProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');

  const handleSaveGroupName = () => {
    if (editedGroupName.trim()) {
      onUpdateGroupName(editedGroupName.trim());
      setIsEditingGroupName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingGroupName(false);
    setEditedGroupName(conversation.groupName || '');
  };

  const handleStartEdit = () => {
    setEditedGroupName(conversation.groupName || '');
    setIsEditingGroupName(true);
  };

  return (
    <Paper 
      p="lg" 
      shadow="sm" 
      radius={0}
      style={{
        borderBottom: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[6] : 'white',
        flexShrink: 0,
      }}
    >
      <Group justify="space-between">
        <Group>
          <div style={{ position: 'relative' }}>
            <Avatar 
              size={48}
              radius="xl"
              color={getAvatarColor(displayName)}
              styles={{
                root: {
                  border: `2px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
                }
              }}
            >
              {avatarInitial}
            </Avatar>
            {conversation.type === 'one-to-one' && isOtherUserOnline !== null && (
              <Box
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: isOtherUserOnline ? '#40c057' : '#868e96',
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            )}
          </div>
          <div>
            <Group gap={8} align="center">
              {conversation.type === 'group' && isEditingGroupName ? (
                <Group gap={4}>
                  <TextInput
                    value={editedGroupName}
                    onChange={(e) => setEditedGroupName(e.target.value)}
                    size="sm"
                    styles={{ input: { fontWeight: 600 } }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveGroupName();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                  />
                  <ActionIcon 
                    color="green" 
                    variant="subtle"
                    onClick={handleSaveGroupName}
                  >
                    <Check size={18} />
                  </ActionIcon>
                  <ActionIcon 
                    color="red" 
                    variant="subtle"
                    onClick={handleCancelEdit}
                  >
                    <X size={18} />
                  </ActionIcon>
                </Group>
              ) : (
                <Group gap={4}>
                  <Text fw={600} size="lg">
                    {displayName}
                  </Text>
                  {conversation.type === 'group' && isCurrentUserAdmin && (
                    <Tooltip label="Edit group name">
                      <ActionIcon 
                        variant="subtle" 
                        size="sm"
                        onClick={handleStartEdit}
                      >
                        <Edit size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              )}
              {activeTypingUsers.length > 0 && (
                <Text size="xs" c="blue" fw={500} style={{ fontStyle: 'italic' }}>
                  typing...
                </Text>
              )}
            </Group>
            <Group gap={8}>
              {conversation.type === 'one-to-one' && isOtherUserOnline !== null && (
                <Badge
                  size="sm"
                  color={isOtherUserOnline ? 'green' : 'gray'}
                  variant="light"
                  leftSection={
                    <Box
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: isOtherUserOnline ? '#40c057' : '#868e96',
                      }}
                    />
                  }
                >
                  {isOtherUserOnline ? 'Online' : 'Offline'}
                </Badge>
              )}
              {conversation.type === 'one-to-one' && !isOtherUserOnline && lastSeenText && (
                <Text size="xs" c="dimmed">
                  • {lastSeenText}
                </Text>
              )}
              {conversation.type === 'group' && groupMembersInfo && (
                <Text size="xs" c="dimmed">
                  {groupMembersInfo.online}/{groupMembersInfo.total} members online
                </Text>
              )}
            </Group>
          </div>
        </Group>

        {conversation.type === 'group' && (
          <Group gap="xs">
            <Tooltip label="View members">
              <ActionIcon 
                variant="subtle" 
                size="lg"
                onClick={onOpenMembersModal}
              >
                <Users size={20} />
              </ActionIcon>
            </Tooltip>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Tooltip label="Group options">
                  <ActionIcon 
                    variant="subtle" 
                    size="lg"
                  >
                    <MoreVertical size={20} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {isCurrentUserAdmin && (
                  <>
                    <Menu.Item 
                      leftSection={<Edit size={16} />}
                      onClick={onOpenEditDetails}
                    >
                      Edit Group Details
                    </Menu.Item>
                    <Menu.Item 
                      leftSection={<UserPlus size={16} />}
                      onClick={onOpenInviteMembers}
                    >
                      Invite Members
                    </Menu.Item>
                  </>
                )}
                <Menu.Item 
                  leftSection={<LogOut size={16} />}
                  color="red"
                  onClick={onLeaveGroup}
                >
                  Leave Group
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>
    </Paper>
  );
};
