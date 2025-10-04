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
} from '@mantine/core';
import { IconSend, IconMoodSmile, IconPaperclip } from '@tabler/icons-react';
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

const EmptyState = () => {
  return (
    <Center h="calc(100vh - 60px)" style={{ backgroundColor: '#f8f9fa' }}>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const lastConversationIdRef = useRef<string | null>(null);
  const { activeConversation, activeMessages, activeTypingUsers, isLoadingMessages } = useChat();
  const { sendMessage: socketSendMessage, startTyping, stopTyping } = useSocket();
  const { user } = useAppSelector((state) => state.auth);

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

  if (!activeConversation) {
    return <EmptyState />;
  }

  if (isLoadingMessages) {
    return (
      <Center h="calc(100vh - 60px)" style={{ backgroundColor: '#f8f9fa' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" color="blue" />
          <Text size="sm" c="dimmed">Loading messages...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack h="calc(100vh - 60px)" gap={0} style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <Paper 
        p="lg" 
        shadow="sm" 
        radius={0}
        style={{
          borderBottom: '1px solid #e9ecef',
          backgroundColor: 'white',
        }}
      >
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
              <Text fw={600} size="lg">
                {getConversationDisplayName()}
              </Text>
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
            </Group>
          </div>
        </Group>
      </Paper>

      {/* Messages Area */}
      <ScrollArea 
        style={{ flex: 1 }} 
        p="md"
        styles={{
          viewport: {
            paddingBottom: '20px',
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
              >
                {!isOwn && (
                  <Avatar size={32} radius="xl" color="blue">
                    {typeof msg.senderId === 'string' ? 'U' : msg.senderId.username[0].toUpperCase()}
                  </Avatar>
                )}
                <Paper
                  p="sm"
                  radius="lg"
                  shadow="xs"
                  style={{
                    backgroundColor: isOwn ? '#228be6' : 'white',
                    color: isOwn ? 'white' : 'black',
                    maxWidth: '70%',
                    border: isOwn ? 'none' : '1px solid #e9ecef',
                    wordBreak: 'break-word',
                    marginLeft: isOwn ? 'auto' : '0',
                    marginRight: isOwn ? '0' : 'auto',
                  }}
                >
                  {!isOwn && typeof msg.senderId !== 'string' && (
                    <Text size="xs" fw={600} c={isOwn ? 'rgba(255,255,255,0.9)' : 'dimmed'} mb={4}>
                      {msg.senderId.username}
                    </Text>
                  )}
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Text>
                  <Group gap={4} mt={6} justify={isOwn ? 'flex-end' : 'flex-start'}>
                    <Text 
                      size="xs" 
                      c={isOwn ? 'rgba(255,255,255,0.8)' : 'dimmed'} 
                      fw={500}
                      style={{ 
                        fontSize: '10px',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </Text>
                  </Group>
                </Paper>
                {isOwn && <div style={{ width: 32 }} />}
              </Group>
            );
          })}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </Stack>
      </ScrollArea>

      {/* Input Area */}
      <Paper 
        p="md" 
        shadow="sm"
        radius={0}
        style={{
          borderTop: '1px solid #e9ecef',
          backgroundColor: 'white',
        }}
      >
        <Group gap="xs" align="flex-end">
          <ActionIcon 
            size={40} 
            variant="subtle" 
            color="gray"
            radius="xl"
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
                border: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa',
                '&:focus': {
                  borderColor: '#228be6',
                  backgroundColor: 'white',
                },
              },
            }}
            style={{ flex: 1 }}
          />
          
          <ActionIcon 
            size={40} 
            variant="subtle" 
            color="gray"
            radius="xl"
          >
            <IconMoodSmile size={20} />
          </ActionIcon>
          
          <ActionIcon 
            size={40} 
            onClick={handleSend} 
            disabled={!message.trim()}
            radius="xl"
            variant="filled"
            color="blue"
            styles={{
              root: {
                '&:disabled': {
                  backgroundColor: '#e9ecef',
                  color: '#adb5bd',
                },
              },
            }}
          >
            <IconSend size={20} />
          </ActionIcon>
        </Group>
      </Paper>
    </Stack>
  );
};
