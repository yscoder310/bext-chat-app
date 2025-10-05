import { Modal, Stack, ScrollArea, Group, Avatar, Text, Badge, Box, Menu, ActionIcon, TextInput, Divider, Paper, useMantineColorScheme, useMantineTheme } from '@mantine/core';
import { modals } from '@mantine/modals';
import { MoreVertical, Crown, Search, UserMinus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Conversation } from '../types';
import { getAvatarColor } from '../utils/avatarColor';

interface GroupMembersModalProps {
  opened: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId?: string;
  onPromoteToAdmin?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
}

export const GroupMembersModal = ({ 
  opened, 
  onClose, 
  conversation, 
  currentUserId, 
  onPromoteToAdmin,
  onRemoveMember 
}: GroupMembersModalProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Only show members modal for group conversations
  if (conversation.type !== 'group') return null;

  // Handle promote to admin with confirmation
  const handlePromoteToAdmin = (member: any) => {
    modals.openConfirmModal({
      title: 'Promote to Admin',
      children: (
        <Text size="sm">
          Are you sure you want to promote <strong>{member.username}</strong> to admin? 
          They will have full control over the group including managing members and settings.
        </Text>
      ),
      labels: { confirm: 'Promote to Admin', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: () => onPromoteToAdmin?.(member.id),
    });
  };

  /**
   * Check if a user is an admin in the group
   * Supports both the new groupAdmins array (multiple admins) and legacy groupAdmin field
   */
  const isAdmin = (userId: string) => {
    // Primary check: Look in groupAdmins array
    if (conversation.groupAdmins && Array.isArray(conversation.groupAdmins) && conversation.groupAdmins.length > 0) {
      return conversation.groupAdmins.some((admin) => {
        // Handle both string IDs and admin objects
        if (typeof admin === 'string') {
          return admin === userId;
        }
        return admin?.id === userId;
      });
    }
    
    // Fallback: Check single groupAdmin field for backward compatibility
    return conversation.groupAdmin?.id === userId;
  };
  
  // Check if the current user is an admin (determines if they can promote/remove members)
  const isCurrentUserAdmin = currentUserId ? isAdmin(currentUserId) : false;

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversation.participants;
    }
    
    const query = searchQuery.toLowerCase();
    return conversation.participants.filter((member) => 
      member.username?.toLowerCase().includes(query)
    );
  }, [conversation.participants, searchQuery]);

  const onlineMembers = filteredMembers.filter((p) => p.isOnline);
  const offlineMembers = filteredMembers.filter((p) => !p.isOnline);
  const totalMembers = conversation.participants.length;
  const onlineCount = conversation.participants.filter((p) => p.isOnline).length;

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={
        <Group gap="xs">
          <Text fw={600} size="lg">{conversation.groupName}</Text>
          <Badge size="sm" variant="light" color="gray">
            {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
          </Badge>
        </Group>
      } 
      size="md"
      styles={{
        title: { width: '100%' },
      }}
    >
      <Stack gap="md">
        {/* Stats Section */}
        <Paper 
          p="sm" 
          radius="md" 
          style={{ 
            backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
            border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
          }}
        >
          <Group justify="space-between">
            <Group gap="xs">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#40c057',
                }}
              />
              <Text size="sm" fw={500}>
                {onlineCount} online
              </Text>
            </Group>
            <Group gap="xs">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#868e96',
                }}
              />
              <Text size="sm" c="dimmed">
                {totalMembers - onlineCount} offline
              </Text>
            </Group>
          </Group>
        </Paper>

        {/* Search Bar */}
        <TextInput
          placeholder="Search members..."
          leftSection={<Search size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          styles={{
            input: {
              backgroundColor: isDark ? theme.colors.dark[7] : 'white',
              borderColor: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
              color: isDark ? theme.colors.gray[0] : 'black',
              '&:focus': {
                borderColor: theme.colors.blue[6],
                backgroundColor: isDark ? theme.colors.dark[6] : 'white',
              },
              '&::placeholder': {
                color: isDark ? theme.colors.dark[2] : theme.colors.gray[5],
              },
            },
          }}
        />

        <Divider />

        {/* Members List */}
        <ScrollArea h={400} type="auto">
          <Stack gap="xs">
            {filteredMembers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No members found
              </Text>
            ) : (
              <>
                {/* Online Members */}
                {onlineMembers.length > 0 && (
                  <>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="sm" mt="xs">
                      Online — {onlineMembers.length}
                    </Text>
                    {onlineMembers.map((member) => (
                      <Paper
                        key={member.id}
                        p="sm"
                        radius="md"
                        style={{
                          backgroundColor: member.id === currentUserId 
                            ? (isDark ? theme.colors.dark[5] : theme.colors.blue[0])
                            : 'transparent',
                          border: member.id === currentUserId 
                            ? `1px solid ${isDark ? theme.colors.blue[8] : theme.colors.blue[2]}`
                            : '1px solid transparent',
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          if (member.id !== currentUserId) {
                            e.currentTarget.style.backgroundColor = isDark 
                              ? theme.colors.dark[6] 
                              : theme.colors.gray[0];
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (member.id !== currentUserId) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Group style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ position: 'relative' }}>
                              <Avatar size={40} color={getAvatarColor(member.username || 'User')} radius="xl">
                                {member.username?.[0]?.toUpperCase() || '?'}
                              </Avatar>
                              <Box
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  right: 0,
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: '#40c057',
                                  border: `2px solid ${isDark ? theme.colors.dark[7] : 'white'}`,
                                  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                                }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Group gap={6} wrap="nowrap">
                                <Text size="sm" fw={500} truncate>
                                  {member.username}
                                </Text>
                                {member.id === currentUserId && (
                                  <Badge size="xs" color="blue" variant="light">
                                    You
                                  </Badge>
                                )}
                                {isAdmin(member.id) && (
                                  <Badge 
                                    size="xs" 
                                    color="yellow" 
                                    variant="light" 
                                    leftSection={<Crown size={10} />}
                                  >
                                    Admin
                                  </Badge>
                                )}
                              </Group>
                            </div>
                          </Group>
                          
                          {/* Admin Actions Menu */}
                          {isCurrentUserAdmin && member.id !== currentUserId && (
                            <Menu shadow="md" width={200} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon 
                                  variant="subtle" 
                                  color="gray"
                                  size="lg"
                                  style={{ flexShrink: 0 }}
                                >
                                  <MoreVertical size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {!isAdmin(member.id) && onPromoteToAdmin && (
                                  <Menu.Item 
                                    leftSection={<Crown size={16} />}
                                    onClick={() => handlePromoteToAdmin(member)}
                                    color="blue"
                                  >
                                    Make Admin
                                  </Menu.Item>
                                )}
                                {onRemoveMember && (
                                  <Menu.Item 
                                    leftSection={<UserMinus size={16} />}
                                    onClick={() => onRemoveMember(member.id)}
                                    color="red"
                                  >
                                    Remove Member
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </>
                )}

                {/* Offline Members */}
                {offlineMembers.length > 0 && (
                  <>
                    <Text 
                      size="xs" 
                      fw={600} 
                      c="dimmed" 
                      tt="uppercase" 
                      px="sm" 
                      mt={onlineMembers.length > 0 ? 'md' : 'xs'}
                    >
                      Offline — {offlineMembers.length}
                    </Text>
                    {offlineMembers.map((member) => (
                      <Paper
                        key={member.id}
                        p="sm"
                        radius="md"
                        style={{
                          backgroundColor: member.id === currentUserId 
                            ? (isDark ? theme.colors.dark[5] : theme.colors.blue[0])
                            : 'transparent',
                          border: member.id === currentUserId 
                            ? `1px solid ${isDark ? theme.colors.blue[8] : theme.colors.blue[2]}`
                            : '1px solid transparent',
                          opacity: 0.7,
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          if (member.id !== currentUserId) {
                            e.currentTarget.style.backgroundColor = isDark 
                              ? theme.colors.dark[6] 
                              : theme.colors.gray[0];
                            e.currentTarget.style.opacity = '0.85';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (member.id !== currentUserId) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.opacity = '0.7';
                          }
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Group style={{ flex: 1, minWidth: 0 }}>
                            <Avatar size={40} color={getAvatarColor(member.username || 'User')} radius="xl">
                              {member.username?.[0]?.toUpperCase() || '?'}
                            </Avatar>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Group gap={6} wrap="nowrap">
                                <Text size="sm" fw={500} c="dimmed" truncate>
                                  {member.username}
                                </Text>
                                {member.id === currentUserId && (
                                  <Badge size="xs" color="gray" variant="light">
                                    You
                                  </Badge>
                                )}
                                {isAdmin(member.id) && (
                                  <Badge 
                                    size="xs" 
                                    color="gray" 
                                    variant="light" 
                                    leftSection={<Crown size={10} />}
                                  >
                                    Admin
                                  </Badge>
                                )}
                              </Group>
                            </div>
                          </Group>

                          {/* Admin Actions Menu */}
                          {isCurrentUserAdmin && member.id !== currentUserId && (
                            <Menu shadow="md" width={200} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon 
                                  variant="subtle" 
                                  color="gray"
                                  size="lg"
                                  style={{ flexShrink: 0 }}
                                >
                                  <MoreVertical size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {!isAdmin(member.id) && onPromoteToAdmin && (
                                  <Menu.Item 
                                    leftSection={<Crown size={16} />}
                                    onClick={() => handlePromoteToAdmin(member)}
                                    color="blue"
                                  >
                                    Make Admin
                                  </Menu.Item>
                                )}
                                {onRemoveMember && (
                                  <Menu.Item 
                                    leftSection={<UserMinus size={16} />}
                                    onClick={() => onRemoveMember(member.id)}
                                    color="red"
                                  >
                                    Remove Member
                                  </Menu.Item>
                                )}
                              </Menu.Dropdown>
                            </Menu>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </>
                )}
              </>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
};
