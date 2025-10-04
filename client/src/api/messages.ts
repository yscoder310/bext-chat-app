import axiosInstance from '../lib/axios';
import { Message, MessageInput } from '../types';

interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const messageApi = {
  getMessages: async (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<MessagesResponse> => {
    const { data } = await axiosInstance.get(`/messages/${conversationId}`, {
      params: { page, limit },
    });
    return data.data;
  },

  sendMessage: async (messageData: MessageInput): Promise<Message> => {
    const { data } = await axiosInstance.post('/messages', messageData);
    return data.data;
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    await axiosInstance.put(`/messages/${conversationId}/read`);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await axiosInstance.delete(`/messages/${messageId}`);
  },
};
