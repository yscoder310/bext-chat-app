import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setConversations,
  setActiveConversation,
  setMessages,
  addConversation,
  removeConversation,
  clearTypingUsers,
  markMessagesAsRead,
} from '../store/slices/chatSlice';
import { conversationApi } from '../api/conversations';
import { messageApi } from '../api/messages';
import { CreateGroupInput } from '../types';
import { notifications } from '@mantine/notifications';
import { useSocket } from './useSocket';

export const useChat = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { joinConversation, leaveConversation } = useSocket();
  
  const { conversations, activeConversationId, messages, typingUsers, isLoadingMessages } =
    useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);

  // Fetch conversations
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationApi.getUserConversations,
  });

  // Update Redux when conversations are fetched
  useEffect(() => {
    if (conversationsQuery.data) {
      dispatch(setConversations(conversationsQuery.data));
    }
  }, [conversationsQuery.data, dispatch]);

  // Handle errors
  useEffect(() => {
    if (conversationsQuery.error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load conversations',
        color: 'red',
      });
    }
  }, [conversationsQuery.error]);

  // Fetch messages for active conversation
  const messagesQuery = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => messageApi.getMessages(activeConversationId!, 1, 50),
    enabled: !!activeConversationId,
  });

  // Update Redux when messages are fetched
  useEffect(() => {
    if (messagesQuery.data && activeConversationId) {
      dispatch(setMessages({
        conversationId: activeConversationId,
        messages: messagesQuery.data.messages,
      }));
    }
  }, [messagesQuery.data, activeConversationId, dispatch]);

  // Handle errors
  useEffect(() => {
    if (messagesQuery.error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load messages',
        color: 'red',
      });
    }
  }, [messagesQuery.error]);

  // Create one-to-one conversation
  const createOneToOneMutation = useMutation({
    mutationFn: (userId: string) => conversationApi.createOneToOne(userId),
    onSuccess: (data) => {
      dispatch(addConversation(data));
      dispatch(setActiveConversation(data.id));
      joinConversation(data.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      notifications.show({
        title: 'Success',
        message: 'Conversation created',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create conversation',
        color: 'red',
      });
    },
  });

  // Create group conversation
  const createGroupMutation = useMutation({
    mutationFn: (groupData: CreateGroupInput) => conversationApi.createGroup(groupData),
    onSuccess: (data) => {
      dispatch(addConversation(data));
      dispatch(setActiveConversation(data.id));
      joinConversation(data.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      notifications.show({
        title: 'Success',
        message: 'Group created successfully',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create group',
        color: 'red',
      });
    },
  });

  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => conversationApi.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      dispatch(removeConversation(conversationId));
      leaveConversation(conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      notifications.show({
        title: 'Success',
        message: 'Conversation deleted',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete conversation',
        color: 'red',
      });
    },
  });

  // Select conversation
  const selectConversation = (conversationId: string) => {
    // Leave previous conversation
    if (activeConversationId) {
      leaveConversation(activeConversationId);
      // Clear typing indicators for previous conversation
      dispatch(clearTypingUsers(activeConversationId));
    }
    
    // Set new active conversation
    dispatch(setActiveConversation(conversationId));
    
    // Clear typing indicators for new conversation (fresh start)
    dispatch(clearTypingUsers(conversationId));
    
    // Join new conversation
    joinConversation(conversationId);
    
    // Mark messages as read (both API and Redux)
    messageApi.markAsRead(conversationId);
    if (user) {
      dispatch(markMessagesAsRead({ conversationId, userId: user.id }));
    }
  };

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  
  // Get active conversation messages
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  
  // Get typing users for active conversation
  const activeTypingUsers = activeConversationId ? typingUsers[activeConversationId] || [] : [];

  return {
    conversations,
    activeConversation,
    activeMessages,
    activeTypingUsers,
    isLoadingConversations: conversationsQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading || isLoadingMessages,
    selectConversation,
    createOneToOne: createOneToOneMutation.mutate,
    createGroup: createGroupMutation.mutate,
    deleteConversation: deleteConversationMutation.mutate,
    refetchConversations: conversationsQuery.refetch,
    refetchMessages: messagesQuery.refetch,
  };
};
