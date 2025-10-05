import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  addMessage,
  addTypingUser,
  removeTypingUser,
  addOnlineUser,
  removeOnlineUser,
  setOnlineUsers,
  markMessagesAsRead,
  addConversation,
  updateConversation,
  removeConversation,
  setActiveConversation,
} from '../store/slices/chatSlice';
import { socketService } from '../lib/socket';
import { Message } from '../types';
import { playNotificationSound } from '../utils/notificationSound';
import { getSetting } from '../components/UserSettingsModal';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);
  const { activeConversationId } = useAppSelector((state) => state.chat);
  const queryClient = useQueryClient();

  // Connect to socket when token is available
  useEffect(() => {
    if (token && !socketService.isConnected()) {
      console.log('Connecting to socket with token...');
      socketService.connect(token);
    }
  }, [token]);

  // Set up socket event listeners once
  useEffect(() => {
    console.log('Setting up socket event listeners...');

    // New message
    socketService.onNewMessage((message: Message) => {
      console.log('Redux: Dispatching addMessage', message);
      dispatch(addMessage(message, user?.id));
      
      // Only show notifications for messages from other users
      const isOwnMessage = typeof message.senderId === 'string' 
        ? message.senderId === user?.id 
        : (message.senderId as any)?.id === user?.id;
      
      // Don't notify for own messages or if the conversation is currently active
      if (!isOwnMessage && message.conversationId !== activeConversationId) {
        // Play sound notification if enabled
        const soundEnabled = getSetting('soundEnabled') as boolean;
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Show desktop notification if enabled
        const desktopNotifications = getSetting('desktopNotifications') as boolean;
        if (desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
          const messagePreview = getSetting('messagePreview') as boolean;
          
          // Get sender name
          let senderName = 'Unknown';
          if (typeof message.senderId !== 'string') {
            senderName = message.senderId.username || 'Unknown';
          }
          
          // Create notification
          const notification = new Notification(`New message from ${senderName}`, {
            body: messagePreview ? message.content : 'You have a new message',
            icon: '/favicon.ico', // You can replace this with your app icon
            tag: message.conversationId, // Prevents duplicate notifications for same conversation
            requireInteraction: false,
          });
          
          // Close notification after 5 seconds
          setTimeout(() => notification.close(), 5000);
          
          // Optional: Focus the app when notification is clicked
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
    });

    // Typing indicators
    socketService.onUserTyping((data) => {
      console.log('Redux: Dispatching addTypingUser', data);
      dispatch(addTypingUser(data));
    });

    socketService.onUserStoppedTyping((data) => {
      console.log('Redux: Dispatching removeTypingUser', data);
      dispatch(removeTypingUser(data));
    });

    // Read receipts
    socketService.onMessagesRead((data) => {
      dispatch(markMessagesAsRead(data));
    });

    // Online status
    socketService.onUserOnline((data) => {
      dispatch(addOnlineUser(data.userId));
    });

    socketService.onUserOffline((data) => {
      dispatch(removeOnlineUser(data.userId));
    });

    socketService.onOnlineUsers((users) => {
      dispatch(setOnlineUsers(users));
    });

    // Chat requests
    socketService.onNewChatRequest((request) => {
      // Handle new chat request notification
      console.log('New chat request:', request);
    });

    socketService.onChatRequestAccepted((conversation) => {
      // Validate conversation data before adding
      if (conversation && conversation.id && conversation.participants && Array.isArray(conversation.participants)) {
        dispatch(addConversation(conversation));
      } else {
        console.error('Invalid conversation data received:', conversation);
      }
    });

    // Group created
    socketService.onGroupCreated((conversation) => {
      console.log('Group created, adding to conversations:', conversation);
      if (conversation && conversation.id && conversation.participants && Array.isArray(conversation.participants)) {
        dispatch(addConversation(conversation));
      } else {
        console.error('Invalid group conversation data received:', conversation);
      }
    });

    // Group updated (name change, admin promotion, member left)
    socketService.onGroupUpdated((conversation) => {
      console.log('🔄 Group updated event received:', conversation);
      console.log('Conversation ID:', conversation?.id);
      console.log('Participants:', conversation?.participants);
      console.log('Current user ID:', user?.id);
      
      if (conversation && conversation.id && conversation.participants && Array.isArray(conversation.participants)) {
        // Check if current user is still in the participants list
        const isUserInConversation = conversation.participants.some((p: any) => 
          p.id === user?.id || p._id === user?.id
        );
        
        console.log('Is current user still in conversation?', isUserInConversation);
        
        if (isUserInConversation) {
          // User is still a member - update the conversation
          console.log('✅ Updating conversation for remaining member');
          dispatch(updateConversation(conversation));
        } else {
          // User is no longer a member - remove the conversation
          console.log('❌ User removed from conversation, removing from list');
          dispatch(removeConversation(conversation.id));
          
          // Clear active conversation if this was the active one
          if (activeConversationId === conversation.id) {
            dispatch(setActiveConversation(null));
          }
        }
      } else {
        console.error('❌ Invalid updated group conversation data received:', conversation);
      }
    });

    // Conversation refresh - simpler approach, just refetch conversations
    socketService.onConversationRefresh((data) => {
      console.log('='.repeat(60));
      console.log('🔄 [SOCKET] CONVERSATION-REFRESH EVENT RECEIVED');
      console.log('🔄 [SOCKET] Data:', data);
      console.log('🔄 [SOCKET] Current user:', user?.username, user?.id);
      console.log('🔄 [SOCKET] This user should STAY in the group');
      console.log('='.repeat(60));
      
      // Refetch conversations from server
      // This will automatically show/hide the conversation based on current user's participation
      console.log('🔄 [SOCKET] Invalidating conversations query');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      console.log('='.repeat(60));
    });

    // Conversation removed - user left the group
    socketService.onConversationRemoved((data) => {
      console.log('='.repeat(60));
      console.log('🗑️ [SOCKET] CONVERSATION-REMOVED EVENT RECEIVED');
      console.log('🗑️ [SOCKET] Conversation ID:', data.conversationId);
      console.log('🗑️ [SOCKET] Current user:', user?.username, user?.id);
      console.log('🗑️ [SOCKET] Active conversation ID:', activeConversationId);
      console.log('='.repeat(60));
      
      // Remove conversation from local state immediately
      dispatch(removeConversation(data.conversationId));
      
      // Clear active conversation if this was the active one
      if (activeConversationId === data.conversationId) {
        console.log('🗑️ [SOCKET] Clearing active conversation');
        dispatch(setActiveConversation(null));
      }
      
      // Also refetch to ensure everything is in sync
      console.log('🗑️ [SOCKET] Invalidating conversations query');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      console.log('='.repeat(60));
    });

    // Invitation system events
    socketService.onGroupInvitation((invitation) => {
      console.log('📬 Received group invitation:', invitation);
      // Show notification
      // You can add a notification here or update a badge
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    });

    socketService.onInvitationsSent((data) => {
      console.log('✅ Invitations sent:', data);
      // Invitations were successfully sent
    });

    socketService.onInvitationAccepted((conversation) => {
      console.log('✅ Invitation accepted, joined group:', conversation);
      if (conversation && conversation.id && conversation.participants && Array.isArray(conversation.participants)) {
        dispatch(addConversation(conversation));
        // Refetch conversations to ensure sync
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['invitations'] });
      }
    });

    socketService.onInvitationDeclined((data) => {
      console.log('❌ Invitation declined:', data);
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    });

    socketService.onMemberJoined((data) => {
      console.log('👤 Member joined group:', data);
      // Refetch the specific conversation to update member list
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => {
      console.log('Cleaning up socket event listeners...');
      socketService.offNewMessage();
      socketService.offUserTyping();
      socketService.offUserStoppedTyping();
      socketService.offMessagesRead();
      socketService.offUserOnline();
      socketService.offUserOffline();
    };
  }, [dispatch, user?.id, queryClient, activeConversationId]); // Added dependencies

  // Get online users when socket connects
  useEffect(() => {
    // Small delay to ensure socket is fully connected
    const checkConnection = setInterval(() => {
      if (socketService.isConnected()) {
        console.log('Socket connected, requesting online users...');
        socketService.getOnlineUsers();
        clearInterval(checkConnection);
      }
    }, 100);

    // Periodically refresh online users (every 10 seconds for real-time updates)
    const onlineUsersInterval = setInterval(() => {
      if (socketService.isConnected()) {
        console.log('🔄 Periodic refresh: requesting online users...');
        socketService.getOnlineUsers();
      }
    }, 10000); // Reduced from 30s to 10s for more frequent updates

    return () => {
      clearInterval(checkConnection);
      clearInterval(onlineUsersInterval);
    };
  }, [token]);

  // Socket methods
  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketService.leaveConversation(conversationId);
  }, []);

  const sendMessage = useCallback((data: {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
  }) => {
    socketService.sendMessage(data);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    socketService.startTyping(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketService.stopTyping(conversationId);
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    socketService.markAsRead(conversationId);
  }, []);

  return {
    isConnected: socketService.isConnected(),
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
};
