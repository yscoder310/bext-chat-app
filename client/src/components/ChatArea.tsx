import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  Stack,
  Loader,
  Center,
  Modal,
  Button,
  Group,
  Text,
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

  /**
   * Check if current user is an admin of the group
   * Supports both the new groupAdmins array and legacy groupAdmin field for backward compatibility
   */
  const isCurrentUserAdmin = () => {
    if (!activeConversation || activeConversation.type !== 'group' || !user?.id) {
      return false;
    }
    
    // Primary check: Look in the groupAdmins array (supports multiple admins)
    if (activeConversation.groupAdmins && Array.isArray(activeConversation.groupAdmins) && activeConversation.groupAdmins.length > 0) {
      const isInAdmins = activeConversation.groupAdmins.some((admin: any) => {
        // Handle both string IDs and admin objects with id property
        if (typeof admin === 'string') {
          return admin === user.id;
        }
        return admin?.id === user.id;
      });
      return isInAdmins;
    }
    
    // Fallback check: Use single groupAdmin field for backward compatibility
    const isSingleAdmin = activeConversation.groupAdmin?.id === user.id;
    return isSingleAdmin;
  };

  /**
   * Clean up typing indicator when switching between conversations
   * Ensures users don't see stale typing indicators from previous chats
   */
  useEffect(() => {
    if (lastConversationIdRef.current && lastConversationIdRef.current !== activeConversation?.id) {
      // Stop typing indicator for the previous conversation
      if (isTypingRef.current) {
        stopTyping(lastConversationIdRef.current);
        isTypingRef.current = false;
      }
      // Clear any pending typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
    lastConversationIdRef.current = activeConversation?.id || null;
  }, [activeConversation?.id, stopTyping]);

  /**
   * Stop typing indicator when window loses focus (tab switch, minimize, etc.)
   * Prevents typing indicator from staying active indefinitely
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTypingRef.current && activeConversation?.id) {
        stopTyping(activeConversation.id);
        isTypingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeConversation?.id, stopTyping]);

  /**
   * Cleanup: Stop typing indicator and clear timeout on component unmount
   */
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

  const handleSend = (content: string) => {
    if (!content.trim() || !activeConversation) return;

    socketSendMessage({
      conversationId: activeConversation.id,
      content: content.trim(),
    });
    
    // Clear typing state after sending message
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      stopTyping(activeConversation.id);
      isTypingRef.current = false;
    }
  };

  /**
   * Start typing indicator when user begins typing
   * Auto-stops after 3 seconds of inactivity
   */
  const handleTypingStart = () => {
    if (!activeConversation) return;

    // Clear existing timeout to reset the 3-second countdown
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing indicator if not already active
    if (!isTypingRef.current) {
      startTyping(activeConversation.id);
      isTypingRef.current = true;
    }
    
    // Auto-stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current && activeConversation?.id) {
        stopTyping(activeConversation.id);
        isTypingRef.current = false;
      }
    }, 3000);
  };

  /**
   * Immediately stop typing indicator (called when input is cleared)
   */
  const handleTypingStop = () => {
    if (isTypingRef.current && activeConversation?.id) {
      stopTyping(activeConversation.id);
      isTypingRef.current = false;
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
  const getLastSeenTextForUser = () => {
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
    
    return getLastSeenText(otherUser.lastSeen);
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

  const handleUpdateGroupName = (newName: string) => {
    if (!activeConversation) return;
    updateGroupName({ 
      conversationId: activeConversation.id, 
      groupName: newName 
    });
  };

  const handlePromoteToAdmin = (userId: string) => {
    if (!activeConversation) return;
    promoteToAdmin({
      conversationId: activeConversation.id,
      newAdminId: userId
    });
  };

  const handleLeaveGroup = () => {
    if (!activeConversation) return;
    leaveGroup(activeConversation.id);
    setLeaveGroupConfirm(false);
  };

  const isOtherUserOnline = getOtherUserStatus();
  const lastSeenText = getLastSeenTextForUser();
  const groupMembersInfo = getOnlineMembersCount();

  if (!activeConversation) {
    return <ChatEmptyState />;
  }

  if (isLoadingMessages) {
    return (
      <Center style={{ 
        height: '100vh', 
        maxHeight: 'calc(100vh - 60px)', 
        backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0] 
      }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack 
      gap={0} 
      style={{ 
        height: '100vh', 
        maxHeight: 'calc(100vh - 60px)',
        backgroundColor: isDark ? theme.colors.dark[7] : theme.colors.gray[0] 
      }}
    >
      <ChatHeader
        conversation={activeConversation}
        displayName={getConversationDisplayName()}
        avatarInitial={getConversationAvatar()}
        isOtherUserOnline={isOtherUserOnline ?? null}
        lastSeenText={lastSeenText}
        groupMembersInfo={groupMembersInfo}
        activeTypingUsers={activeTypingUsers}
        isCurrentUserAdmin={isCurrentUserAdmin()}
        onUpdateGroupName={handleUpdateGroupName}
        onOpenMembersModal={openMembersModal}
        onOpenInviteMembers={openInviteMembers}
        onOpenEditDetails={openEditDetails}
        onLeaveGroup={() => setLeaveGroupConfirm(true)}
      />

      <MessagesArea
        messages={activeMessages}
        currentUserId={user?.id}
        formatMessageTime={formatMessageTime}
      />

      <MessageInput
        onSendMessage={handleSend}
        onTyping={handleTypingStart}
        onStopTyping={handleTypingStop}
      />

      {/* Lazy-loaded modals */}
      <Suspense fallback={null}>
        {membersModalOpened && (
          <GroupMembersModal
            opened={membersModalOpened}
            onClose={closeMembersModal}
            conversation={activeConversation}
            currentUserId={user?.id}
            onPromoteToAdmin={handlePromoteToAdmin}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {inviteMembersOpened && (
          <InviteMembersModal
            opened={inviteMembersOpened}
            onClose={closeInviteMembers}
            conversation={activeConversation}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {editDetailsOpened && (
          <EditGroupDetailsModal
            opened={editDetailsOpened}
            onClose={closeEditDetails}
            conversation={activeConversation}
          />
        )}
      </Suspense>

      {/* Leave group confirmation */}
      <Modal
        opened={leaveGroupConfirm}
        onClose={() => setLeaveGroupConfirm(false)}
        title="Leave Group"
        centered
      >
        <Text size="sm" mb="md">
          Are you sure you want to leave this group? You won't be able to send or receive messages from this group anymore.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => setLeaveGroupConfirm(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleLeaveGroup}>
            Leave Group
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
};
