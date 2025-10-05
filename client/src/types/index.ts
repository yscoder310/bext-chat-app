export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User | string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  systemMessageType?: 'member-added' | 'member-removed' | 'admin-promoted' | 'member-left' | 'group-created';
  metadata?: Record<string, string>;
  isRead: boolean;
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  type: 'one-to-one' | 'group';
  participants: User[];
  groupName?: string;
  groupDescription?: string;
  groupType?: 'private' | 'public';
  groupAdmin?: User;
  groupAdmins?: User[];
  groupSettings?: GroupSettings;
  lastMessage?: Message;
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupSettings {
  maxMembers: number;
  allowMemberInvites: boolean;
  isArchived: boolean;
}

export interface Invitation {
  _id: string;
  conversationId: Conversation | string;
  invitedBy: User;
  invitedUser: User | string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}

export interface PublicGroup {
  id: string;
  groupName: string;
  groupDescription?: string;
  groupType: 'public';
  memberCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
}

export interface ChatRequest {
  _id: string;
  senderId: User;
  receiverId: User;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface MessageInput {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
}

export interface CreateGroupInput {
  groupName: string;
  groupDescription?: string;
  groupType?: 'private' | 'public';
  participants: string[];
  settings?: {
    maxMembers?: number;
    allowMemberInvites?: boolean;
    isArchived?: boolean;
  };
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  username?: string;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
}
