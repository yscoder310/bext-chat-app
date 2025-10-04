import { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Group,
  TextInput,
  ActionIcon,
  ScrollArea,
  Text,
  Paper,
  Avatar,
  Loader,
  Center,
  Badge,
  Box,
  Tooltip,
} from '@mantine/core';
import { IconSend, IconMoodSmile, IconPaperclip, IconUsers, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { 
  format, 
  isToday, 
  isYesterday, 
  isThisWeek,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInSeconds
} from 'date-fns';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useAppSelector } from '../store/hooks';
import { useDisclosure } from '@mantine/hooks';
import { GroupMembersModal } from './GroupMembersModal';

const EmptyState = () => {
  return (
    <Center style={{ height: '100vh', maxHeight: 'calc(100vh - 60px)', backgroundColor: '#f8f9fa' }}>
      <Stack align="center" gap="xl">
        <Box
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#228be6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </Box>
        <Stack align="center" gap="xs">
          <Text size="xl" fw={600} c="dark">
            Welcome to Chat App
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            Select a conversation from the sidebar to start messaging, or create a new conversation to connect with others
          </Text>
        </Stack>
        <Badge size="lg" variant="light" color="blue">
          💬 Start Chatting
        </Badge>
      </Stack>
    </Center>
  );
};

export const ChatArea = () => {
  const [message, setMessage] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const [membersModalOpened, { open: openMembersModal, close: closeMembersModal }] = useDisclosure(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const lastConversationIdRef = useRef<string | null>(null);
  const { activeConversation, activeMessages, activeTypingUsers, isLoadingMessages, updateGroupName, promoteToAdmin } = useChat();
  const { sendMessage: socketSendMessage, startTyping, stopTyping } = useSocket();
  const { user } = useAppSelector((state) => state.auth);

  // Check if current user is an admin of the group
  const isCurrentUserAdmin = () => {
    if (!activeConversation || activeConversation.type !== 'group' || !user?.id) {
      return false;
    }
    
    console.log('🔍 Checking admin status:', {
      userId: user.id,
      groupAdmin: activeConversation.groupAdmin,
      groupAdmins: activeConversation.groupAdmins,
      conversationType: activeConversation.type
    });
    
    // Check in groupAdmins array (new way)
    if (activeConversation.groupAdmins && Array.isArray(activeConversation.groupAdmins) && activeConversation.groupAdmins.length > 0) {
      const isInAdmins = activeConversation.groupAdmins.some((admin: any) => {
        if (typeof admin === 'string') {
          return admin === user.id;
        }
        return admin?.id === user.id;
      });
      console.log('✅ isInAdmins (groupAdmins array):', isInAdmins);
      return isInAdmins;
    }
    
    // Fallback to single groupAdmin (old way, for backward compatibility)
    const isSingleAdmin = activeConversation.groupAdmin?.id === user.id;
    console.log('✅ isSingleAdmin (groupAdmin):', isSingleAdmin);
    return isSingleAdmin;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Scroll to bottom when messages change or conversation changes
  useEffect(() => {
    scrollToBottom();
  }, [activeMessages, activeConversation?.id]);

  // Immediate scroll when conversation changes (no animation)
  useEffect(() => {
    if (activeConversation?.id) {
      scrollToBottom('auto');
    }
  }, [activeConversation?.id]);

  // Clean up typing when conversation changes
  useEffect(() => {
    // If conversation changed and we were typing in the previous one, stop typing
    if (lastConversationIdRef.current && lastConversationIdRef.current !== activeConversation?.id) {
      if (isTypingRef.current) {
        console.log('🔄 Conversation changed, stopping typing in previous conversation');
        stopTyping(lastConversationIdRef.current);
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setMessage(''); // Clear message input when switching conversations
    }
    lastConversationIdRef.current = activeConversation?.id || null;
  }, [activeConversation?.id, stopTyping]);

  // Handle visibility change (window focus/blur)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Window lost focus - stop typing indicator
        if (isTypingRef.current && activeConversation?.id) {
          console.log('👁️ Window hidden, stopping typing indicator');
          stopTyping(activeConversation.id);
          isTypingRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeConversation?.id, stopTyping]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && activeConversation?.id) {
        stopTyping(activeConversation.id);
      }
    };
  }, [activeConversation?.id, stopTyping]);

  const handleSend = () => {
    if (!message.trim() || !activeConversation) return;

    socketSendMessage({
      conversationId: activeConversation.id,
      content: message.trim(),
    });

    setMessage('');
    
    // Clear typing timeout and stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      stopTyping(activeConversation.id);
      isTypingRef.current = false;
    }
    
    // Scroll to bottom after sending message
    setTimeout(() => scrollToBottom(), 50);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    if (!activeConversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If there's text, emit typing
    if (e.target.value.trim()) {
      if (!isTypingRef.current) {
        console.log('⌨️ Starting typing indicator for conversation:', activeConversation.id);
        startTyping(activeConversation.id);
        isTypingRef.current = true;
      }
      
      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = window.setTimeout(() => {
        if (isTypingRef.current && activeConversation?.id) {
          console.log('⏱️ Typing timeout - stopping typing indicator');
          stopTyping(activeConversation.id);
          isTypingRef.current = false;
        }
      }, 3000);
    } else {
      // If text is empty, stop typing immediately
      if (isTypingRef.current && activeConversation?.id) {
        console.log('🛑 Input cleared - stopping typing indicator');
        stopTyping(activeConversation.id);
        isTypingRef.current = false;
      }
    }
  };

  // Get the other user's name for one-to-one conversations
  const getConversationDisplayName = () => {
    if (!activeConversation) return '';
    
    if (activeConversation.type === 'group') {
      return activeConversation.groupName || 'Group Chat';
    }
    
    // For one-to-one, find the other user (not the current user)
    if (!activeConversation.participants || !Array.isArray(activeConversation.participants)) {
      return 'Unknown User';
    }
    
    const otherUser = activeConversation.participants.find(
      (p: any) => p?.id !== user?.id
    );
    return otherUser?.username || 'Unknown User';
  };

  // Get the other user's avatar initial
  const getConversationAvatar = () => {
    if (!activeConversation) return '?';
    
    if (activeConversation.type === 'group') {
      return activeConversation.groupName?.[0]?.toUpperCase() || 'G';
    }
    
    if (!activeConversation.participants || !Array.isArray(activeConversation.participants)) {
      return 'U';
    }
    
    const otherUser = activeConversation.participants.find(
      (p: any) => p?.id !== user?.id
    );
    return otherUser?.username?.[0]?.toUpperCase() || 'U';
  };

  // Get the other user's online status for one-to-one conversations
  const getOtherUserStatus = () => {
    if (!activeConversation || activeConversation.type === 'group') {
      return null;
    }
    
    if (!activeConversation.participants || !Array.isArray(activeConversation.participants)) {
      return null;
    }
    
    const otherUser = activeConversation.participants.find(
      (p: any) => p?.id !== user?.id
    );
    return otherUser?.isOnline;
  };

  // Get last seen time for offline users
  const getLastSeenText = () => {
    if (!activeConversation || activeConversation.type === 'group') {
      return null;
    }
    
    if (!activeConversation.participants || !Array.isArray(activeConversation.participants)) {
      return null;
    }
    
    const otherUser = activeConversation.participants.find(
      (p: any) => p?.id !== user?.id
    );
    
    if (!otherUser?.lastSeen) return null;
    
    const lastSeen = new Date(otherUser.lastSeen);
    const diffMins = differenceInMinutes(new Date(), lastSeen);
    
    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    
    const diffHours = differenceInHours(new Date(), lastSeen);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    
    const diffDays = differenceInDays(new Date(), lastSeen);
    return `Last seen ${diffDays}d ago`;
  };

  // Get online members count for group chats
  const getOnlineMembersCount = () => {
    if (!activeConversation || activeConversation.type !== 'group') {
      return null;
    }
    
    if (!activeConversation.participants || !Array.isArray(activeConversation.participants)) {
      return null;
    }
    
    const onlineCount = activeConversation.participants.filter((p: any) => p?.isOnline).length;
    const totalCount = activeConversation.participants.length;
    
    return { online: onlineCount, total: totalCount };
  };

  // Format message timestamp with smart formatting like WhatsApp
  const formatMessageTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    
    const seconds = differenceInSeconds(now, date);
    const minutes = differenceInMinutes(now, date);
    const hours = differenceInHours(now, date);

    // Less than 30 seconds - show "just now"
    if (seconds < 30) {
      return 'just now';
    }
    
    // Less than 60 seconds - show "X secs ago"
    if (seconds < 60) {
      return `${seconds} secs ago`;
    }
    
    // Less than 60 minutes - show "X mins ago"
    if (minutes < 60) {
      return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
    }
    
    // Less than 24 hours (today) - show "X hours ago" or time
    if (isToday(date)) {
      if (hours < 12) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
      }
      // After 12 hours, show actual time
      return format(date, 'h:mm a');
    }
    
    // Yesterday - show "Yesterday"
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    
    // Within this week - show day name
    if (isThisWeek(date, { weekStartsOn: 0 })) {
      return format(date, 'EEEE'); // Full day name
    }
    
    // Older messages - show date
    const daysDiff = differenceInDays(now, date);
    if (daysDiff < 365) {
      return format(date, 'MMM d'); // e.g., "Oct 1"
    }
    
    // More than a year - show full date
    return format(date, 'MMM d, yyyy'); // e.g., "Oct 1, 2024"
  };

  const isOtherUserOnline = getOtherUserStatus();
  const lastSeenText = getLastSeenText();
  const groupMembersInfo = getOnlineMembersCount();

  if (!activeConversation) {
    return <EmptyState />;
  }

  if (isLoadingMessages) {
    return (
      <Center style={{ height: '100vh', maxHeight: 'calc(100vh - 60px)', backgroundColor: '#f8f9fa' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="blue" />
          <Text size="sm" c="dimmed">Loading messages...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack 
      gap={0} 
      style={{ 
        backgroundColor: '#f8f9fa',
        height: '100vh',
        maxHeight: 'calc(100vh - 60px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Paper 
        p="lg" 
        shadow="sm" 
        radius={0}
        style={{
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#ffffff',
          flexShrink: 0,
        }}
      >
        <Group justify="space-between">
          <Group>
            <div style={{ position: 'relative' }}>
              <Avatar 
                size={48}
                radius="xl"
                color="blue"
                styles={{
                  root: {
                    border: '2px solid #e9ecef',
                  }
                }}
              >
                {getConversationAvatar()}
              </Avatar>
              {activeConversation.type === 'one-to-one' && isOtherUserOnline !== null && (
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
                {activeConversation.type === 'group' && isEditingGroupName ? (
                  <Group gap={4}>
                    <TextInput
                      value={editedGroupName}
                      onChange={(e) => setEditedGroupName(e.target.value)}
                      size="sm"
                      styles={{ input: { fontWeight: 600 } }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editedGroupName.trim() && activeConversation.id) {
                            updateGroupName({ 
                              conversationId: activeConversation.id, 
                              groupName: editedGroupName.trim() 
                            });
                            setIsEditingGroupName(false);
                          }
                        } else if (e.key === 'Escape') {
                          setIsEditingGroupName(false);
                          setEditedGroupName(activeConversation.groupName || '');
                        }
                      }}
                      autoFocus
                    />
                    <ActionIcon 
                      color="green" 
                      variant="subtle"
                      onClick={() => {
                        if (editedGroupName.trim() && activeConversation.id) {
                          updateGroupName({ 
                            conversationId: activeConversation.id, 
                            groupName: editedGroupName.trim() 
                          });
                          setIsEditingGroupName(false);
                        }
                      }}
                    >
                      <IconCheck size={18} />
                    </ActionIcon>
                    <ActionIcon 
                      color="red" 
                      variant="subtle"
                      onClick={() => {
                        setIsEditingGroupName(false);
                        setEditedGroupName(activeConversation.groupName || '');
                      }}
                    >
                      <IconX size={18} />
                    </ActionIcon>
                  </Group>
                ) : (
                  <Group gap={4}>
                    <Text fw={600} size="lg">
                      {getConversationDisplayName()}
                    </Text>
                    {activeConversation.type === 'group' && isCurrentUserAdmin() && (
                      <Tooltip label="Edit group name">
                        <ActionIcon 
                          variant="subtle" 
                          size="sm"
                          onClick={() => {
                            setEditedGroupName(activeConversation.groupName || '');
                            setIsEditingGroupName(true);
                          }}
                        >
                          <IconEdit size={16} />
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
                {activeConversation.type === 'one-to-one' && isOtherUserOnline !== null && (
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
                {activeConversation.type === 'one-to-one' && !isOtherUserOnline && lastSeenText && (
                  <Text size="xs" c="dimmed">
                    • {lastSeenText}
                  </Text>
                )}
                {activeConversation.type === 'group' && groupMembersInfo && (
                  <Text size="xs" c="dimmed">
                    {groupMembersInfo.online}/{groupMembersInfo.total} members online
                  </Text>
                )}
              </Group>
            </div>
          </Group>

          {activeConversation.type === 'group' && (
            <Tooltip label="View members">
              <ActionIcon 
                variant="subtle" 
                size="lg"
                onClick={openMembersModal}
              >
                <IconUsers size={20} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Paper>

      {/* Messages Area */}
      <ScrollArea 
        style={{ 
          flex: 1, 
          minHeight: 0,
          backgroundImage: `
            linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%),
            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)
          `,
          backgroundBlendMode: 'overlay',
        }} 
        p="md"
        styles={{
          viewport: {
            paddingBottom: '20px',
            '& > div': {
              display: 'block !important',
            }
          }
        }}
      >
        <Stack gap="sm">
          {activeMessages.map((msg) => {
            // Determine if this is the user's own message
            const isOwn = typeof msg.senderId === 'string' 
              ? msg.senderId === user?.id 
              : (msg.senderId as any)?.id === user?.id;

            return (
              <Group
                key={msg._id}
                justify={isOwn ? 'flex-end' : 'flex-start'}
                align="flex-start"
                gap="xs"
                wrap="nowrap"
                style={{ width: '100%' }}
              >
                {!isOwn && (
                  <Avatar 
                    size={36} 
                    radius="xl" 
                    color="blue"
                    style={{
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    {typeof msg.senderId === 'string' ? 'U' : msg.senderId.username[0].toUpperCase()}
                  </Avatar>
                )}
                <Paper
                  p="xs"
                  px="sm"
                  radius="md"
                  shadow="sm"
                  style={{
                    backgroundColor: isOwn ? '#228be6' : 'white',
                    color: isOwn ? 'white' : 'black',
                    maxWidth: '65%',
                    border: isOwn ? 'none' : '1px solid #e9ecef',
                    wordBreak: 'break-word',
                    marginLeft: isOwn ? 'auto' : '0',
                    marginRight: isOwn ? '0' : 'auto',
                    boxShadow: isOwn 
                      ? '0 4px 12px rgba(34, 139, 230, 0.25)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                  }}
                >
                  {!isOwn && typeof msg.senderId !== 'string' && (
                    <Text 
                      size="xs" 
                      fw={600} 
                      c="#228be6"
                      mb={4}
                      style={{
                        letterSpacing: '0.3px',
                      }}
                    >
                      {msg.senderId.username}
                    </Text>
                  )}
                  <Text 
                    size="sm" 
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                      letterSpacing: '0.2px',
                    }}
                  >
                    {msg.content}
                  </Text>
                  <Group gap={4} mt={6} justify={isOwn ? 'flex-end' : 'flex-start'}>
                    <Text 
                      size="xs" 
                      c={isOwn ? 'rgba(255,255,255,0.85)' : 'dimmed'} 
                      fw={500}
                      style={{ 
                        fontSize: '10px',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </Text>
                    {isOwn && (
                      <svg 
                        width="14" 
                        height="10" 
                        viewBox="0 0 16 11" 
                        fill="none"
                        style={{ opacity: 0.85 }}
                      >
                        <path 
                          d="M11.071.653a.75.75 0 0 1 1.058 0l3.854 3.854a.75.75 0 0 1 0 1.058l-3.854 3.854a.75.75 0 1 1-1.058-1.058l2.576-2.576H.75a.75.75 0 0 1 0-1.5h12.897L10.571 1.71A.75.75 0 0 1 11.071.653Z" 
                          fill="rgba(255,255,255,0.85)"
                        />
                        <path 
                          d="M5.071.653a.75.75 0 0 1 1.058 0l3.854 3.854a.75.75 0 0 1 0 1.058l-3.854 3.854a.75.75 0 1 1-1.058-1.058l2.576-2.576H.75a.75.75 0 0 1 0-1.5h6.897L5.571 1.71A.75.75 0 0 1 5.071.653Z" 
                          fill="rgba(255,255,255,0.85)"
                        />
                      </svg>
                    )}
                  </Group>
                </Paper>
                {isOwn && <div style={{ width: 36, flexShrink: 0 }} />}
              </Group>
            );
          })}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </Stack>
      </ScrollArea>

      {/* Input Area */}
      <Paper 
        p="md" 
        shadow="md"
        radius={0}
        style={{
          borderTop: '1px solid #dee2e6',
          backgroundColor: 'white',
          flexShrink: 0,
        }}
      >
        <Group gap="xs" align="flex-end">
          <ActionIcon 
            size={42} 
            variant="light" 
            color="gray"
            radius="xl"
            style={{
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <IconPaperclip size={20} />
          </ActionIcon>
          
          <TextInput
            placeholder="Type a message..."
            value={message}
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            radius="xl"
            size="md"
            styles={{
              input: {
                border: '2px solid #e9ecef',
                backgroundColor: '#f8f9fa',
                fontSize: '14px',
                padding: '12px 18px',
                transition: 'all 0.2s ease',
                '&:focus': {
                  borderColor: '#228be6',
                  backgroundColor: 'white',
                  boxShadow: '0 0 0 3px rgba(34, 139, 230, 0.1)',
                },
                '&::placeholder': {
                  color: '#adb5bd',
                },
              },
            }}
            style={{ flex: 1 }}
          />
          
          <ActionIcon 
            size={42} 
            variant="light" 
            color="gray"
            radius="xl"
            style={{
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <IconMoodSmile size={20} />
          </ActionIcon>
          
          <ActionIcon 
            size={42} 
            onClick={handleSend} 
            disabled={!message.trim()}
            radius="xl"
            variant="filled"
            color="blue"
            style={{
              transition: 'all 0.2s ease',
            }}
            styles={{
              root: {
                '&:disabled': {
                  backgroundColor: '#e9ecef',
                  color: '#adb5bd',
                },
                '&:not(:disabled):hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 12px rgba(34, 139, 230, 0.3)',
                },
              },
            }}
          >
            <IconSend size={20} />
          </ActionIcon>
        </Group>
      </Paper>

      {/* Group Members Modal */}
      {activeConversation.type === 'group' && (
        <GroupMembersModal
          opened={membersModalOpened}
          onClose={closeMembersModal}
          conversation={activeConversation}
          currentUserId={user?.id}
          onPromoteToAdmin={(newAdminId) => {
            if (activeConversation.id) {
              promoteToAdmin({ conversationId: activeConversation.id, newAdminId });
            }
          }}
        />
      )}
    </Stack>
  );
};
