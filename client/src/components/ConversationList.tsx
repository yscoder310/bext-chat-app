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
} from '@mantine/core';
import { IconSearch, IconPlus, IconUsers, IconUser } from '@tabler/icons-react';
import { format, isToday, isYesterday, differenceInMinutes, differenceInDays } from 'date-fns';
import { useChat } from '../hooks/useChat';
import { useChatRequests } from '../hooks/useChatRequests';
import { useDisclosure } from '@mantine/hooks';
import { UserListModal } from './UserListModal';
import { CreateGroupModal } from './CreateGroupModal';
import { useAppSelector } from '../store/hooks';

export const ConversationList = () => {
  const [search, setSearch] = useState('');
  const [userListOpened, { open: openUserList, close: closeUserList }] = useDisclosure(false);
  const [groupModalOpened, { open: openGroupModal, close: closeGroupModal }] = useDisclosure(false);
  const { conversations, selectConversation, activeConversation, isLoadingConversations, createGroup } =
    useChat();
  const { pendingRequests } = useChatRequests();
  const { typingUsers } = useAppSelector((state) => state.chat);

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
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
            styles={{
              input: {
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                '&:focus': {
                  backgroundColor: 'white',
                  borderColor: '#228be6',
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
                <IconPlus size={18} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item leftSection={<IconUser size={16} />} onClick={openUserList}>
                New Chat
              </Menu.Item>
              <Menu.Item leftSection={<IconUsers size={16} />} onClick={openGroupModal}>
                New Group
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
                      ? '#e7f5ff' 
                      : 'transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeConversation?.id !== conv.id) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
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
                      color="blue"
                      variant="light"
                      style={{
                        border: '2px solid #e9ecef',
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
                          border: '2px solid white',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={500} style={{ flex: 1 }}>
                        {getConversationName(conv)}
                      </Text>
                      {getLastMessageTime(conv) && (
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                          {getLastMessageTime(conv)}
                        </Text>
                      )}
                    </Group>
                    <Text 
                      size="xs" 
                      c={getTypingStatus(conv) ? 'blue' : 'dimmed'} 
                      truncate
                      style={{ fontStyle: getTypingStatus(conv) ? 'italic' : 'normal' }}
                    >
                      {getTypingStatus(conv) ? 'typing...' : getLastMessageText(conv)}
                    </Text>
                    {conv.type === 'group' && conv.participants && (
                      <Text size="xs" c="dimmed" mt={2}>
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
        onCreateGroup={(groupName, participants) => {
          createGroup({ groupName, participants });
        }}
      />
    </>
  );
};
