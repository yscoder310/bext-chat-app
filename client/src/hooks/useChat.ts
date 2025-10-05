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
  updateConversation,
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
    staleTime: 0, // Allow refetching when needed
    refetchOnMount: true, // Refetch when component mounts
  });

  // Update Redux when conversations are fetched
  useEffect(() => {
    if (conversationsQuery.data) {
      console.log('🔄 [USE_CHAT] Conversations data changed, updating Redux');
      console.log('🔄 [USE_CHAT] New data has', conversationsQuery.data.length, 'conversations');
      console.log('🔄 [USE_CHAT] User:', user?.username);
      console.log('🔄 [USE_CHAT] Stack trace:', new Error().stack);
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

  // Update group name
  const updateGroupNameMutation = useMutation({
    mutationFn: ({ conversationId, groupName }: { conversationId: string; groupName: string }) =>
      conversationApi.updateGroupName(conversationId, groupName),
    onSuccess: (data) => {
      dispatch(updateConversation(data));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      notifications.show({
        title: 'Success',
        message: 'Group name updated successfully',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update group name',
        color: 'red',
      });
    },
  });

  // Promote to admin
  const promoteToAdminMutation = useMutation({
    mutationFn: ({ conversationId, newAdminId }: { conversationId: string; newAdminId: string }) =>
      conversationApi.promoteToAdmin(conversationId, newAdminId),
    onSuccess: (data) => {
      dispatch(updateConversation(data));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      notifications.show({
        title: 'Success',
        message: 'Admin role transferred successfully',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to promote to admin',
        color: 'red',
      });
    },
  });

  // Leave group
  const leaveGroupMutation = useMutation({
    mutationFn: (conversationId: string) => {
      console.log('🚪 [LEAVE GROUP] Starting leave group for conversation:', conversationId);
      return conversationApi.leaveGroup(conversationId);
    },
    onSuccess: (_, conversationId) => {
      console.log('🚪 [LEAVE GROUP] Leave successful for conversation:', conversationId);
      console.log('🚪 [LEAVE GROUP] Current user:', user?.username);
      
      // DON'T manually remove - let the socket event handle it
      // This ensures all users (including the one leaving) get the same update
      console.log('🚪 [LEAVE GROUP] Waiting for socket event to update UI');
      
      notifications.show({
        title: 'Success',
        message: 'You have left the group',
        color: 'green',
      });
    },
    onError: (error) => {
      console.error('🚪 [LEAVE GROUP] Error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to leave group',
        color: 'red',
      });
    },
  });

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
    updateGroupName: updateGroupNameMutation.mutate,
    promoteToAdmin: promoteToAdminMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    refetchConversations: conversationsQuery.refetch,
    refetchMessages: messagesQuery.refetch,
  };
};
