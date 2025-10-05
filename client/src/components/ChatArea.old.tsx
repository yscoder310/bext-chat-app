import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  Stack,
  Loader,
  Center,
  Text,
  Modal,
  Button,
  Group,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useAppSelector } from '../store/hooks';
import { ChatEmptyState } from './chat/ChatEmptyState';
import { ChatHeader } from './chat/ChatHeader';
import { MessagesArea } from './chat/MessagesArea';
import { MessageInput } from './chat/MessageInput';
import { formatMessageTime, getLastSeenText } from '../utils/chatHelpers';

// Lazy load heavy modals for better performance
const InviteMembersModal = lazy(() => import('./InviteMembersModal').then(module => ({ default: module.InviteMembersModal })));
const GroupMembersModal = lazy(() => import('./GroupMembersModal').then(module => ({ default: module.GroupMembersModal })));
const EditGroupDetailsModal = lazy(() => import('./EditGroupDetailsModal').then(module => ({ default: module.EditGroupDetailsModal })));


export const ChatArea = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [membersModalOpened, { open: openMembersModal, close: closeMembersModal }] = useDisclosure(false);
  const [inviteMembersOpened, { open: openInviteMembers, close: closeInviteMembers }] = useDisclosure(false);
  const [editDetailsOpened, { open: openEditDetails, close: closeEditDetails }] = useDisclosure(false);
  const [leaveGroupConfirm, setLeaveGroupConfirm] = useState(false);
  
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const lastConversationIdRef = useRef<string | null>(null);
  
  const { activeConversation, activeMessages, activeTypingUsers, isLoadingMessages, updateGroupName, promoteToAdmin, leaveGroup } = useChat();
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
      <Center style={{ 
        height: '100vh', 
        maxHeight: 'calc(100vh - 60px)', 
        backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0] 
      }}>
        <Stack align="center" gap="md">
          <Loader size="lg" type="dots" color="blue" />
          <Text size="sm" c="dimmed" fw={500}>Loading messages...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack 
      gap={0} 
      style={{ 
        backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
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
                color={getAvatarColor(getConversationDisplayName())}
                styles={{
                  root: {
                    border: `2px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
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
                      <Check size={18} />
                    </ActionIcon>
                    <ActionIcon 
                      color="red" 
                      variant="subtle"
                      onClick={() => {
                        setIsEditingGroupName(false);
                        setEditedGroupName(activeConversation.groupName || '');
                      }}
                    >
                      <X size={18} />
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
            <Group gap="xs">
              <Tooltip label="View members">
                <ActionIcon 
                  variant="subtle" 
                  size="lg"
                  onClick={openMembersModal}
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
                  {isCurrentUserAdmin() && (
                    <>
                      <Menu.Item 
                        leftSection={<Edit size={16} />}
                        onClick={openEditDetails}
                      >
                        Edit Group Details
                      </Menu.Item>
                      <Menu.Item 
                        leftSection={<UserPlus size={16} />}
                        onClick={openInviteMembers}
                      >
                        Invite Members
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Item 
                    leftSection={<LogOut size={16} />}
                    color="red"
                    onClick={() => setLeaveGroupConfirm(true)}
                  >
                    Leave Group
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )}
        </Group>
      </Paper>

      {/* Messages Area */}
      <ScrollArea 
        style={{ 
          flex: 1, 
          minHeight: 0,
          backgroundImage: isDark
            ? `
              linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%),
              repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.02) 10px, rgba(255,255,255,.02) 20px)
            `
            : `
              linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%),
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
          {activeMessages.map((msg, index) => {
            // Render system messages differently
            if (msg.messageType === 'system') {
              // Determine icon based on system message type
              let icon = null;
              let iconColor = '#868e96';
              
              switch (msg.systemMessageType) {
                case 'member-added':
                  icon = <UserPlus size={14} />;
                  iconColor = '#40c057';
                  break;
                case 'member-left':
                case 'member-removed':
                  icon = <UserMinus size={14} />;
                  iconColor = '#fa5252';
                  break;
                case 'admin-promoted':
                  icon = <Crown size={14} />;
                  iconColor = '#fab005';
                  break;
                case 'group-created':
                  icon = <Users size={14} />;
                  iconColor = '#228be6';
                  break;
                default:
                  icon = <UserCheck size={14} />;
              }

              return (
                <Center key={msg._id} my="xs">
                  <Paper
                    p="xs"
                    px="md"
                    radius="xl"
                    style={{
                      backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
                      border: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                      maxWidth: '80%',
                    }}
                  >
                    <Group gap="xs" justify="center">
                      <Box style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>
                        {icon}
                      </Box>
                      <Text
                        size="xs"
                        c="dimmed"
                        ta="center"
                        style={{
                          fontStyle: 'italic',
                          letterSpacing: '0.2px',
                        }}
                      >
                        {msg.content}
                      </Text>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{
                          fontSize: '9px',
                          opacity: 0.7,
                        }}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </Text>
                    </Group>
                  </Paper>
                </Center>
              );
            }

            // Regular message rendering
            const isOwn = typeof msg.senderId === 'string' 
              ? msg.senderId === user?.id 
              : (msg.senderId as any)?.id === user?.id;

            // Check if this message should be clustered with the previous one
            const prevMsg = index > 0 ? activeMessages[index - 1] : null;
            
            const prevSenderId = prevMsg && typeof prevMsg.senderId === 'string' 
              ? prevMsg.senderId 
              : (prevMsg?.senderId as any)?.id;
            
            const currentSenderId = typeof msg.senderId === 'string' 
              ? msg.senderId 
              : (msg.senderId as any)?.id;
            
            // Messages are clustered if:
            // 1. Previous message exists and is not a system message
            // 2. Same sender as previous message
            // 3. Messages are within 2 minutes of each other
            const timeDiff = prevMsg ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : Infinity;
            const isClusteredMessage = prevMsg && 
              prevMsg.messageType !== 'system' && 
              prevSenderId === currentSenderId && 
              timeDiff < 120000; // 2 minutes

            return (
              <Group
                key={msg._id}
                justify={isOwn ? 'flex-end' : 'flex-start'}
                align="flex-start"
                gap="xs"
                wrap="nowrap"
                style={{ 
                  width: '100%',
                  marginTop: isClusteredMessage ? '2px' : undefined, // Tight spacing for clustered messages
                }}
              >
                {!isOwn && (
                  isClusteredMessage ? (
                    // Spacer for clustered messages (same width as avatar)
                    <div style={{ width: 36, flexShrink: 0 }} />
                  ) : (
                    // Show avatar for first message in cluster
                    <Avatar 
                      size={36} 
                      radius="xl" 
                      color={getAvatarColor(
                        typeof msg.senderId === 'string' 
                          ? 'User' 
                          : msg.senderId.username
                      )}
                      style={{
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      {typeof msg.senderId === 'string' ? 'U' : msg.senderId.username[0].toUpperCase()}
                    </Avatar>
                  )
                )}
                <Paper
                  p="xs"
                  px="sm"
                  radius="md"
                  shadow="sm"
                  style={{
                    backgroundColor: isOwn 
                      ? theme.colors.blue[6] 
                      : (isDark ? theme.colors.dark[6] : 'white'),
                    color: isOwn ? 'white' : (isDark ? theme.colors.gray[0] : 'black'),
                    maxWidth: '65%',
                    border: isOwn 
                      ? 'none' 
                      : `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[2]}`,
                    wordBreak: 'break-word',
                    marginLeft: isOwn ? 'auto' : '0',
                    marginRight: isOwn ? '0' : 'auto',
                    boxShadow: isOwn 
                      ? '0 4px 12px rgba(34, 139, 230, 0.25)' 
                      : (isDark 
                        ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.08)'),
                    position: 'relative',
                  }}
                >
                  {/* Only show username for first message in cluster */}
                  {!isOwn && !isClusteredMessage && typeof msg.senderId !== 'string' && (
                    <Text 
                      size="xs" 
                      fw={600} 
                      c={isDark ? theme.colors.blue[4] : theme.colors.blue[6]}
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
          borderTop: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
          backgroundColor: isDark ? theme.colors.dark[6] : 'white',
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
            <Paperclip size={20} />
          </ActionIcon>
          
          <TextInput
            placeholder="Type a message..."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => {
              const enterToSend = getSetting('enterToSend') as boolean;
              
              if (e.key === 'Enter') {
                if (enterToSend) {
                  // Enter to send mode: Enter sends (unless Shift is held)
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  // Shift+Enter does nothing (allows default new line behavior)
                } else {
                  // Ctrl+Enter to send mode: Enter does nothing, Ctrl+Enter sends
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  // Plain Enter allows default new line behavior
                }
              }
            }}
            radius="xl"
            size="md"
            styles={{
              input: {
                border: `2px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[2]}`,
                backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0],
                color: isDark ? theme.colors.gray[0] : 'black',
                fontSize: '14px',
                padding: '12px 18px',
                transition: 'all 0.2s ease',
                '&:focus': {
                  borderColor: theme.colors.blue[6],
                  backgroundColor: isDark ? theme.colors.dark[6] : 'white',
                  boxShadow: `0 0 0 3px ${isDark ? 'rgba(34, 139, 230, 0.15)' : 'rgba(34, 139, 230, 0.1)'}`,
                },
                '&::placeholder': {
                  color: isDark ? theme.colors.dark[2] : theme.colors.gray[5],
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
            <Smile size={20} />
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
                  backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.gray[2],
                  color: isDark ? theme.colors.dark[2] : theme.colors.gray[5],
                },
                '&:not(:disabled):hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 12px rgba(34, 139, 230, 0.3)',
                },
              },
            }}
          >
            <Send size={20} />
          </ActionIcon>
        </Group>
      </Paper>

      {/* Group Members Modal */}
      {activeConversation.type === 'group' && (
        <Suspense fallback={null}>
          {membersModalOpened && (
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

          {editDetailsOpened && (
            <EditGroupDetailsModal
              opened={editDetailsOpened}
              onClose={closeEditDetails}
              conversation={activeConversation}
            />
          )}
        </Suspense>
      )}

      {/* Leave Group Confirmation Modal */}
      <Modal
        opened={leaveGroupConfirm}
        onClose={() => setLeaveGroupConfirm(false)}
        title="Leave Group"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to leave <strong>{activeConversation.type === 'group' ? activeConversation.groupName : 'this conversation'}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            You won't be able to send or receive messages in this group unless someone adds you back.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button 
              variant="default" 
              onClick={() => setLeaveGroupConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={() => {
                if (activeConversation.id) {
                  leaveGroup(activeConversation.id);
                  setLeaveGroupConfirm(false);
                }
              }}
            >
              Leave Group
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Suspense fallback={null}>
        {inviteMembersOpened && (
          <InviteMembersModal
            opened={inviteMembersOpened}
            onClose={closeInviteMembers}
            conversation={activeConversation}
          />
        )}
      </Suspense>
    </Stack>
  );
};
