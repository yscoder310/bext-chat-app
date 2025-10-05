import axiosInstance from '../lib/axios';
import { Conversation, CreateGroupInput, Invitation, PublicGroup } from '../types';

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

  updateGroupDetails: async (
    conversationId: string, 
    updates: { groupName?: string; groupDescription?: string }
  ): Promise<Conversation> => {
    const { data } = await axiosInstance.put(`/conversations/${conversationId}/details`, updates);
    return data.data;
  },

  promoteToAdmin: async (conversationId: string, newAdminId: string): Promise<Conversation> => {
    const { data} = await axiosInstance.put(`/conversations/${conversationId}/admin`, {
      newAdminId,
    });
    return data.data;
  },

  leaveGroup: async (conversationId: string): Promise<void> => {
    await axiosInstance.post(`/conversations/${conversationId}/leave`);
  },

  // Invitation System
  getPendingInvitations: async (): Promise<Invitation[]> => {
    const { data } = await axiosInstance.get('/conversations/invitations/pending');
    return data.data; // Extract data from { success: true, data: [...] }
  },

  getPublicGroups: async (search?: string, page = 1, limit = 20): Promise<{
    groups: PublicGroup[];
    total: number;
    page: number;
    pages: number;
  }> => {
    const { data } = await axiosInstance.get('/conversations/public/discover', {
      params: { search, page, limit }
    });
    return data.data; // Extract data from { success: true, data: {...} }
  },

  joinPublicGroup: async (conversationId: string): Promise<Conversation> => {
    const { data } = await axiosInstance.post(`/conversations/${conversationId}/join`);
    return data.data; // Extract data from { success: true, data: {...} }
  },
};
