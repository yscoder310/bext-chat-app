import axiosInstance from '../lib/axios';
import { Conversation, CreateGroupInput } from '../types';

export const conversationApi = {
  getUserConversations: async (): Promise<Conversation[]> => {
    const { data } = await axiosInstance.get('/conversations');
    return data.data;
  },

  getConversationById: async (conversationId: string): Promise<Conversation> => {
    const { data } = await axiosInstance.get(`/conversations/${conversationId}`);
    return data.data;
  },

  createOneToOne: async (otherUserId: string): Promise<Conversation> => {
    const { data } = await axiosInstance.post('/conversations/one-to-one', { otherUserId });
    return data.data;
  },

  createGroup: async (groupData: CreateGroupInput): Promise<Conversation> => {
    const { data } = await axiosInstance.post('/conversations/group', groupData);
    return data.data;
  },

  addParticipant: async (conversationId: string, participantId: string): Promise<Conversation> => {
    const { data } = await axiosInstance.post(`/conversations/${conversationId}/participants`, {
      participantId,
    });
    return data.data;
  },

  removeParticipant: async (
    conversationId: string,
    participantId: string
  ): Promise<Conversation> => {
    const { data } = await axiosInstance.delete(
      `/conversations/${conversationId}/participants/${participantId}`
    );
    return data.data;
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    await axiosInstance.delete(`/conversations/${conversationId}`);
  },

  updateGroupName: async (conversationId: string, groupName: string): Promise<Conversation> => {
    const { data } = await axiosInstance.put(`/conversations/${conversationId}/name`, {
      groupName,
    });
    return data.data;
  },

  promoteToAdmin: async (conversationId: string, newAdminId: string): Promise<Conversation> => {
    const { data } = await axiosInstance.put(`/conversations/${conversationId}/admin`, {
      newAdminId,
    });
    return data.data;
  },
};
