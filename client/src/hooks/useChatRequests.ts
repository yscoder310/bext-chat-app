import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatRequestApi } from '../api/chatRequests';
import { notifications } from '@mantine/notifications';
import { socketService } from '../lib/socket';
import { useEffect } from 'react';
import { ChatRequest } from '../types';

export const useChatRequests = () => {
  const queryClient = useQueryClient();

  // Fetch pending requests
  const pendingRequestsQuery = useQuery({
    queryKey: ['chat-requests', 'pending'],
    queryFn: chatRequestApi.getPendingRequests,
  });

  // Fetch sent requests
  const sentRequestsQuery = useQuery({
    queryKey: ['chat-requests', 'sent'],
    queryFn: chatRequestApi.getSentRequests,
  });

  // Listen for real-time chat request events
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // When a new chat request is received
    const handleNewChatRequest = (request: ChatRequest) => {
      // Add to pending requests
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'pending'] });
      
      notifications.show({
        title: 'New Chat Request',
        message: `${request.senderId.username} wants to chat with you`,
        color: 'blue',
      });
    };

    // When your sent request is accepted
    const handleRequestAccepted = (_conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'sent'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      notifications.show({
        title: 'Request Accepted',
        message: 'Your chat request was accepted!',
        color: 'green',
      });
    };

    // When your sent request is rejected
    const handleRequestRejected = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'sent'] });
      
      notifications.show({
        title: 'Request Rejected',
        message: 'Your chat request was rejected',
        color: 'orange',
      });
    };

    socket.on('new-chat-request', handleNewChatRequest);
    socket.on('chat-request-accepted', handleRequestAccepted);
    socket.on('chat-request-rejected', handleRequestRejected);

    return () => {
      socket.off('new-chat-request', handleNewChatRequest);
      socket.off('chat-request-accepted', handleRequestAccepted);
      socket.off('chat-request-rejected', handleRequestRejected);
    };
  }, [queryClient]);

  // Send chat request
  const sendRequestMutation = useMutation({
    mutationFn: ({ receiverId, message }: { receiverId: string; message?: string }) =>
      chatRequestApi.sendRequest(receiverId, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'sent'] });
      
      // Notify via socket
      socketService.getSocket()?.emit('chat-request-sent', {
        receiverId: data.receiverId.id,
        request: data,
      });
      
      notifications.show({
        title: 'Success',
        message: 'Chat request sent',
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send request',
        color: 'red',
      });
    },
  });

  // Accept chat request
  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => chatRequestApi.acceptRequest(requestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      // Notify sender via socket
      if (data.chatRequest) {
        socketService.getSocket()?.emit('chat-request-accepted', {
          senderId: data.chatRequest.senderId,
          conversation: data.conversation,
        });
      }
      
      notifications.show({
        title: 'Success',
        message: 'Chat request accepted',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to accept request',
        color: 'red',
      });
    },
  });

  // Reject chat request
  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => chatRequestApi.rejectRequest(requestId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'pending'] });
      
      // Notify sender via socket
      socketService.getSocket()?.emit('chat-request-rejected', {
        senderId: data.senderId,
      });
      
      notifications.show({
        title: 'Success',
        message: 'Chat request rejected',
        color: 'blue',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to reject request',
        color: 'red',
      });
    },
  });

  // Cancel chat request
  const cancelRequestMutation = useMutation({
    mutationFn: (requestId: string) => chatRequestApi.cancelRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests', 'sent'] });
      
      notifications.show({
        title: 'Success',
        message: 'Chat request cancelled',
        color: 'blue',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to cancel request',
        color: 'red',
      });
    },
  });

  return {
    pendingRequests: pendingRequestsQuery.data || [],
    sentRequests: sentRequestsQuery.data || [],
    isLoadingPending: pendingRequestsQuery.isLoading,
    isLoadingSent: sentRequestsQuery.isLoading,
    sendRequest: sendRequestMutation.mutate,
    acceptRequest: acceptRequestMutation.mutate,
    rejectRequest: rejectRequestMutation.mutate,
    cancelRequest: cancelRequestMutation.mutate,
    refetchPending: pendingRequestsQuery.refetch,
    refetchSent: sentRequestsQuery.refetch,
  };
};
