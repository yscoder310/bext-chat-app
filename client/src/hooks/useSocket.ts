import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
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
} from '../store/slices/chatSlice';
import { socketService } from '../lib/socket';
import { Message } from '../types';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);

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

    // Group updated (name change or admin promotion)
    socketService.onGroupUpdated((conversation) => {
      console.log('Group updated, updating conversation:', conversation);
      if (conversation && conversation.id && conversation.participants && Array.isArray(conversation.participants)) {
        dispatch(updateConversation(conversation));
      } else {
        console.error('Invalid updated group conversation data received:', conversation);
      }
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
  }, [dispatch]);

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
