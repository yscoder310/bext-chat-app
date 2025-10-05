import { Request } from 'express';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  systemMessageType?: 'member-added' | 'member-removed' | 'admin-promoted' | 'member-left' | 'group-created';
  metadata?: Map<string, string>;
  isRead: boolean;
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  _id: string;
  type: 'one-to-one' | 'group';
  participants: string[];
  groupName?: string;
  groupDescription?: string;
  groupType?: 'private' | 'public';
  groupAdmins?: string[];
  groupAdmin?: string; // Keep for backward compatibility
  groupSettings?: {
    maxMembers?: number;
    allowMemberInvites?: boolean;
    isArchived?: boolean;
  };
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatRequest {
  _id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
