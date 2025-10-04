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
  messageType: 'text' | 'image' | 'file';
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
  groupAdmin?: User;
  lastMessage?: Message;
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
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
  participants: string[];
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
