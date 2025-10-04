import { Modal, Stack, ScrollArea, Group, Avatar, Text, Badge, Box, Menu, ActionIcon, TextInput, Divider, Paper } from '@mantine/core';
import { IconDots, IconCrown, IconSearch, IconUserMinus } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import { Conversation } from '../types';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  console.log('📋 GroupMembersModal - conversation data:', {
    type: conversation.type,
    groupName: conversation.groupName,
    groupAdmin: conversation.groupAdmin,
    groupAdmins: conversation.groupAdmins,
    participantsCount: conversation.participants?.length,
    currentUserId,
  });
  
  if (conversation.type !== 'group') return null;

  // Check if user is an admin (supports multiple admins)
  const isAdmin = (userId: string) => {
    console.log('🔍 Checking if user is admin:', {
      userId,
      groupAdmin: conversation.groupAdmin,
      groupAdmins: conversation.groupAdmins,
    });
    
    // Check in groupAdmins array (new way)
    if (conversation.groupAdmins && Array.isArray(conversation.groupAdmins) && conversation.groupAdmins.length > 0) {
      const result = conversation.groupAdmins.some((admin) => {
        if (typeof admin === 'string') {
          return admin === userId;
        }
        return admin?.id === userId;
      });
      console.log('✅ isAdmin (groupAdmins):', result);
      return result;
    }
    // Fallback to single groupAdmin (old way)
    const result = conversation.groupAdmin?.id === userId;
    console.log('✅ isAdmin (groupAdmin fallback):', result);
    return result;
  };
  
  const isCurrentUserAdmin = currentUserId ? isAdmin(currentUserId) : false;
  
  console.log('👤 Current user admin status:', isCurrentUserAdmin);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversation.participants;
    }
    
    const query = searchQuery.toLowerCase();
    return conversation.participants.filter((member) => 
      member.username?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
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
        <Paper p="sm" radius="md" style={{ backgroundColor: '#f8f9fa' }}>
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
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          styles={{
            input: {
              '&:focus': {
                borderColor: '#228be6',
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
                          backgroundColor: member.id === currentUserId ? '#e7f5ff' : 'transparent',
                          border: member.id === currentUserId ? '1px solid #d0ebff' : '1px solid transparent',
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          if (member.id !== currentUserId) {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
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
                              <Avatar size={40} color="blue" radius="xl">
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
                                  border: '2px solid white',
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
                                    leftSection={<IconCrown size={10} />}
                                  >
                                    Admin
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed" truncate>
                                {member.email || 'No email'}
                              </Text>
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
                                  <IconDots size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {!isAdmin(member.id) && onPromoteToAdmin && (
                                  <Menu.Item 
                                    leftSection={<IconCrown size={16} />}
                                    onClick={() => onPromoteToAdmin(member.id)}
                                    color="blue"
                                  >
                                    Make Admin
                                  </Menu.Item>
                                )}
                                {onRemoveMember && (
                                  <Menu.Item 
                                    leftSection={<IconUserMinus size={16} />}
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
                          backgroundColor: member.id === currentUserId ? '#e7f5ff' : 'transparent',
                          border: member.id === currentUserId ? '1px solid #d0ebff' : '1px solid transparent',
                          opacity: 0.7,
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          if (member.id !== currentUserId) {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
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
                            <Avatar size={40} color="gray" radius="xl">
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
                                    leftSection={<IconCrown size={10} />}
                                  >
                                    Admin
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed" truncate>
                                {member.email || 'No email'}
                              </Text>
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
                                  <IconDots size={18} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {!isAdmin(member.id) && onPromoteToAdmin && (
                                  <Menu.Item 
                                    leftSection={<IconCrown size={16} />}
                                    onClick={() => onPromoteToAdmin(member.id)}
                                    color="blue"
                                  >
                                    Make Admin
                                  </Menu.Item>
                                )}
                                {onRemoveMember && (
                                  <Menu.Item 
                                    leftSection={<IconUserMinus size={16} />}
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
