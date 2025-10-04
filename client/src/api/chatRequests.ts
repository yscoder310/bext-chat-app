import axiosInstance from '../lib/axios';
import { ChatRequest } from '../types';

export const chatRequestApi = {
  sendRequest: async (receiverId: string, message?: string): Promise<ChatRequest> => {
    const { data } = await axiosInstance.post('/chat-requests', { receiverId, message });
    return data.data;
  },

  getPendingRequests: async (): Promise<ChatRequest[]> => {
    const { data } = await axiosInstance.get('/chat-requests/pending');
    return data.data;
  },

  getSentRequests: async (): Promise<ChatRequest[]> => {
    const { data } = await axiosInstance.get('/chat-requests/sent');
    return data.data;
  },

  acceptRequest: async (requestId: string): Promise<any> => {
    const { data } = await axiosInstance.put(`/chat-requests/${requestId}/accept`);
    return data.data;
  },

  rejectRequest: async (requestId: string): Promise<ChatRequest> => {
    const { data } = await axiosInstance.put(`/chat-requests/${requestId}/reject`);
    return data.data;
  },

  cancelRequest: async (requestId: string): Promise<void> => {
    await axiosInstance.delete(`/chat-requests/${requestId}`);
  },
};
