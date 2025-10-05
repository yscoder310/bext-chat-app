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
import { 
  showBrowserNotification, 
  isNotificationEnabled, 
  isTabHidden,
  updatePageTitle 
} from '../utils/browserNotifications';
import { getSetting } from '../components/UserSettingsModal';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);
  const { activeConversationId } = useAppSelector((state) => state.chat);
  const queryClient = useQueryClient();

  /**
   * Establish socket connection when authentication token is available
   */
  useEffect(() => {
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }
  }, [token]);

  /**
   * Set up socket event listeners for real-time updates
   * Listeners are registered once and handle all socket events
   */
  useEffect(() => {
    // Handle incoming messages
    socketService.onNewMessage((message: Message) => {
      dispatch(addMessage(message, user?.id));
      
      // Determine if this is user's own message
      const isOwnMessage = typeof message.senderId === 'string' 
        ? message.senderId === user?.id 
        : (message.senderId as any)?.id === user?.id;
      
      // Show notifications only for messages from others in inactive conversations
      if (!isOwnMessage && message.conversationId !== activeConversationId) {
        // Play sound notification if enabled in settings
        const soundEnabled = getSetting('soundEnabled') as boolean;
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Extract sender name from message
        let senderName = 'Unknown';
        if (typeof message.senderId !== 'string') {
          senderName = message.senderId.username || 'Unknown';
        }
        
        // Show browser notification when tab is hidden/minimized (cross-platform)
        const desktopNotifications = getSetting('desktopNotifications') as boolean;
        const messagePreview = getSetting('messagePreview') as boolean;
        
        if (desktopNotifications && isNotificationEnabled()) {
          // Only show notification if tab is minimized/inactive
          // This prevents redundant notifications when user is actively using the app
          if (isTabHidden()) {
            showBrowserNotification({
              title: `New message from ${senderName}`,
              body: messagePreview ? message.content : 'You have a new message',
              tag: message.conversationId, // Prevents duplicate notifications
              onClick: () => {
                // Focus window and switch to the conversation
                window.focus();
                dispatch(setActiveConversation(message.conversationId));
              },
              autoClose: 8000, // Auto-close after 8 seconds
            });
            
            // Also update page title to show notification count
            updatePageTitle(1, 'New Message - Chat App');
          }
        }
      }
    });

    // Handle typing indicators (user started typing)
    socketService.onUserTyping((data) => {
      dispatch(addTypingUser(data));
    });

    // Handle typing indicators (user stopped typing)
    socketService.onUserStoppedTyping((data) => {
      dispatch(removeTypingUser(data));
    });

    // Handle read receipts
    socketService.onMessagesRead((data) => {
      dispatch(markMessagesAsRead(data));
    });

    // Handle user online status changes
    socketService.onUserOnline((data) => {
      dispatch(addOnlineUser(data.userId));
    });

    socketService.onUserOffline((data) => {
      dispatch(removeOnlineUser(data.userId));
    });

    // Receive initial list of online users
    socketService.onOnlineUsers((users) => {
      dispatch(setOnlineUsers(users));
    });

    // Handle new chat request (1-on-1 conversation request)
    socketService.onNewChatRequest(() => {
      // Show browser notification for new chat request when tab is hidden
      const desktopNotifications = getSetting('desktopNotifications') as boolean;
      
      if (desktopNotifications && isNotificationEnabled() && isTabHidden()) {
        showBrowserNotification({
          title: 'New Chat Request',
          body: 'You have received a new chat request',
          onClick: () => {
            window.focus();
          },
          autoClose: 10000,
        });
        updatePageTitle(1, 'New Request - Chat App');
      }
    });

    // Handle accepted chat request
    socketService.onChatRequestAccepted((conversation) => {
      // Validate conversation structure before adding to state
      if (conversation?.id && conversation?.participants && Array.isArray(conversation.participants)) {
        dispatch(addConversation(conversation));
      } else {
        console.error('Invalid conversation data received:', conversation);
      }
    });

    // Handle new group creation
    socketService.onGroupCreated((conversation) => {
      // Validate group conversation structure
      if (conversation?.id && conversation?.participants && Array.isArray(conversation.participants)) {
        dispatch(addConversation(conversation));
      } else {
        console.error('Invalid group conversation data received:', conversation);
      }
    });

    /**
     * Handle group updates (name change, admin promotion, member removed, etc.)
     * - If user is still a member: update conversation data
     * - If user was removed: remove conversation from list
     */
    socketService.onGroupUpdated((conversation) => {
      if (conversation?.id && conversation?.participants && Array.isArray(conversation.participants)) {
        // Check if current user is still a participant
        const isUserInConversation = conversation.participants.some((p: any) => 
          p.id === user?.id || p._id === user?.id
        );
        
        if (isUserInConversation) {
          // User is still a member - update conversation
          dispatch(updateConversation(conversation));
        } else {
          // User was removed - remove conversation from list
          dispatch(removeConversation(conversation.id));
          
          // Clear active conversation if it's the one being removed
          if (activeConversationId === conversation.id) {
            dispatch(setActiveConversation(null));
          }
        }
      } else {
        console.error('Invalid group conversation data received:', conversation);
      }
    });

    /**
     * Handle conversation refresh event
     * Handle conversation refresh event
     * Refetches all conversations from the server to ensure sync
     */
    socketService.onConversationRefresh(() => {
      // Refetch conversations to sync with server state
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    /**
     * Handle conversation removal (user left group)
     * Removes conversation from local state and refetches for sync
     */
    socketService.onConversationRemoved((data) => {
      // Remove conversation from Redux state immediately
      dispatch(removeConversation(data.conversationId));
      
      // Clear active conversation if it's the one being removed
      if (activeConversationId === data.conversationId) {
        dispatch(setActiveConversation(null));
      }
      
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    // Handle group invitation received
    socketService.onGroupInvitation(() => {
      // Refetch invitations to show new invitation
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      
      // Show browser notification for new group invitation when tab is hidden
      const desktopNotifications = getSetting('desktopNotifications') as boolean;
      
      if (desktopNotifications && isNotificationEnabled() && isTabHidden()) {
        showBrowserNotification({
          title: 'Group Invitation',
          body: 'You have been invited to join a group',
          onClick: () => {
            window.focus();
          },
          autoClose: 10000,
        });
        updatePageTitle(1, 'New Invitation - Chat App');
      }
    });

    // Handle invitations sent successfully
    socketService.onInvitationsSent(() => {
      // Invitations were sent - no action needed here
    });

    // Handle accepted invitation (user joined group)
    socketService.onInvitationAccepted((conversation) => {
      // Validate and add newly joined conversation
      if (conversation?.id && conversation?.participants && Array.isArray(conversation.participants)) {
        dispatch(addConversation(conversation));
        // Refresh conversations and invitations lists
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['invitations'] });
      }
    });

    // Handle declined invitation
    socketService.onInvitationDeclined(() => {
      // Refresh invitations list to remove declined invitation
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    });

    // Handle new member joined group
    socketService.onMemberJoined((data) => {
      // Refresh conversation to update member list
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    // Cleanup: Remove all event listeners when component unmounts
    return () => {
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
        socketService.getOnlineUsers();
        clearInterval(checkConnection);
      }
    }, 100);

    // Periodically refresh online users list (every 10 seconds)
    const onlineUsersInterval = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.getOnlineUsers();
      }
    }, 10000); // Refresh every 10 seconds

    return () => {
      clearInterval(checkConnection);
      clearInterval(onlineUsersInterval);
    };
  }, [token]);

  /**
   * Reset page title when user focuses the tab
   * This clears notification indicators when user returns to the app
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isTabHidden()) {
        // User is back on the tab, reset the title
        updatePageTitle(0, 'Chat App');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
