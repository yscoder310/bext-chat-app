import { useState } from 'react';
import {
  Stack,
  TextInput,
  ScrollArea,
  UnstyledButton,
  Group,
  Avatar,
  Text,
  Badge,
  ActionIcon,
  Loader,
  Menu,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { Search, Plus, Users, User, Mail, Globe } from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes, differenceInDays } from 'date-fns';
import { useChat } from '../hooks/useChat';
import { useChatRequests } from '../hooks/useChatRequests';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { UserListModal } from './UserListModal';
import { CreateGroupModal } from './CreateGroupModal';
import { InvitationNotification } from './InvitationNotification';
import { PublicGroupsDiscovery } from './PublicGroupsDiscovery';
import { useAppSelector } from '../store/hooks';
import { conversationApi } from '../api/conversations';
import { getAvatarColor } from '../utils/avatarColor';

export const ConversationList = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [search, setSearch] = useState('');
  const [userListOpened, { open: openUserList, close: closeUserList }] = useDisclosure(false);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const [invitationsOpened, { open: openInvitations, close: closeInvitations }] = useDisclosure(false);
  const [publicGroupsOpened, { open: openPublicGroups, close: closePublicGroups }] = useDisclosure(false);
  const { conversations, selectConversation, activeConversation, isLoadingConversations, createGroup } =
    useChat();
  const { pendingRequests } = useChatRequests();
  const { typingUsers } = useAppSelector((state) => state.chat);

  // Get pending invitations count
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: conversationApi.getPendingInvitations,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = search.toLowerCase();
    if (conv.type === 'group') {
      return conv.groupName?.toLowerCase().includes(searchLower);
    } else {
      return conv.participants.some((p: any) =>
        p.username?.toLowerCase().includes(searchLower)
      );
    }
  });

  const getConversationName = (conv: any) => {
    if (!conv) return 'Unknown';
    
    if (conv.type === 'group') {
      return conv.groupName || 'Group Chat';
    }
    
    // For one-to-one conversations, get the other user's name
    const currentUserId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;
    
    if (!conv.participants || !Array.isArray(conv.participants)) {
      return 'Unknown';
    }
    
    const otherUser = conv.participants.find((p: any) => p?.id !== currentUserId);
    return otherUser?.username || 'Unknown';
  };

  // Get online status for one-to-one conversations
  const getOtherUserOnlineStatus = (conv: any) => {
    if (!conv || conv.type === 'group') return null;
    
    const currentUserId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;
    
    if (!conv.participants || !Array.isArray(conv.participants)) {
      return false;
    }
    
    const otherUser = conv.participants.find((p: any) => p?.id !== currentUserId);
    return otherUser?.isOnline || false;
  };

  // Check if someone is typing in this conversation
  const getTypingStatus = (conv: any) => {
    if (!conv || !conv.id) return false;
    const conversationTyping = typingUsers[conv.id] || [];
    return conversationTyping.length > 0;
  };

  // Get display text for last message or typing status
  const getLastMessageText = (conv: any) => {
    if (!conv) return 'No messages yet';
    
    if (getTypingStatus(conv)) {
      return 'typing...';
    }
    return conv.lastMessage?.content || 'No messages yet';
  };

  // Format last message time like WhatsApp
  const getLastMessageTime = (conv: any) => {
    if (!conv?.lastMessageAt) return '';
    
    const date = new Date(conv.lastMessageAt);
    const now = new Date();
    
    const minutes = differenceInMinutes(now, date);
    const days = differenceInDays(now, date);
    
    // Less than 1 minute - show "now"
    if (minutes < 1) {
      return 'now';
    }
    
    // Less than 60 minutes - show "X min ago"
    if (minutes < 60) {
      return minutes === 1 ? '1 min' : `${minutes} mins`;
    }
    
    // Today - show time
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    
    // Yesterday
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    
    // Within a week - show day name
    if (days < 7) {
      return format(date, 'EEE'); // e.g., "Mon"
    }
    
    // Older - show date
    return format(date, 'MMM d');
  };

  if (isLoadingConversations) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader />
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="md" h="100%">
        <Group>
          <TextInput
            placeholder="Search conversations..."
            leftSection={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
            styles={{
              input: {
                backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
                border: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
                color: isDark ? theme.colors.gray[0] : 'black',
                '&:focus': {
                  backgroundColor: isDark ? theme.colors.dark[7] : 'white',
                  borderColor: theme.colors.blue[6],
                },
              }
            }}
            radius="md"
          />
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon 
                variant="gradient" 
                size="lg"
                gradient={{ from: '#228be6', to: '#1c7ed6', deg: 135 }}
                style={{
                  boxShadow: '0 2px 8px rgba(34, 139, 230, 0.3)',
                }}
              >
                <Plus size={18} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<User size={16} />} onClick={openUserList}>
                New Chat
              </Menu.Item>
              <Menu.Item leftSection={<Users size={16} />} onClick={openGroupModal}>
                New Group
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item leftSection={<Globe size={16} />} onClick={openPublicGroups}>
                Discover Public Groups
              </Menu.Item>
              <Menu.Item 
                leftSection={<Mail size={16} />} 
                onClick={openInvitations}
                rightSection={
                  invitations.length > 0 && (
                    <Badge size="xs" color="red" circle>
                      {invitations.length}
                    </Badge>
                  )
                }
              >
                Group Invitations
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {pendingRequests.length > 0 && (
          <Badge 
            color="blue" 
            variant="light"
            size="lg"
            style={{
              padding: '8px 12px',
            }}
          >
            {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
          </Badge>
        )}

        <ScrollArea style={{ flex: 1 }}>
          <Stack gap="xs">
            {filteredConversations.filter(conv => conv && conv.id).map((conv) => (
              <UnstyledButton
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor:
                    activeConversation?.id === conv.id 
                      ? (isDark ? theme.colors.dark[5] : theme.colors.blue[0])
                      : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeConversation?.id !== conv.id) {
                    e.currentTarget.style.backgroundColor = isDark 
                      ? theme.colors.dark[6] 
                      : theme.colors.gray[0];
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeConversation?.id !== conv.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Group>
                  <div style={{ position: 'relative' }}>
                    <Avatar 
                      size={46}
                      color={getAvatarColor(getConversationName(conv))}
                      variant="light"
                      style={{
                        border: `2px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
                      }}
                    >
                      {getConversationName(conv)?.[0] || '?'}
                    </Avatar>
                    {conv.type === 'one-to-one' && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getOtherUserOnlineStatus(conv) ? '#40c057' : '#868e96',
                          border: `2px solid ${isDark ? theme.colors.dark[7] : 'white'}`,
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text 
                        size="sm" 
                        fw={500} 
                        style={{ 
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getConversationName(conv)}
                      </Text>
                      {getLastMessageTime(conv) && (
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0, marginLeft: 8 }}>
                          {getLastMessageTime(conv)}
                        </Text>
                      )}
                    </Group>
                    <Text 
                      size="xs" 
                      c={getTypingStatus(conv) ? 'blue' : 'dimmed'} 
                      style={{ 
                        fontStyle: getTypingStatus(conv) ? 'italic' : 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getTypingStatus(conv) ? 'typing...' : getLastMessageText(conv)}
                    </Text>
                    {conv.type === 'group' && conv.participants && (
                      <Text 
                        size="xs" 
                        c="dimmed" 
                        mt={2}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.participants.filter((p: any) => p.isOnline).length}/{conv.participants.length} online
                      </Text>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge color="blue" variant="filled" size="sm">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea>
      </Stack>

      <UserListModal 
        opened={userListOpened} 
        onClose={closeUserList}
        existingConversations={conversations}
      />

      <CreateGroupModal
        opened={groupModalOpened}
        onClose={closeGroupModal}
        onCreateGroup={(groupData) => {
          createGroup(groupData);
        }}
      />

      <InvitationNotification
        opened={invitationsOpened}
        onClose={closeInvitations}
      />

      <PublicGroupsDiscovery
        opened={publicGroupsOpened}
        onClose={closePublicGroups}
      />
    </>
  );
};
