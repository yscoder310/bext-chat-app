import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessageService } from '../services/messageService';
import { AuthService } from '../services/authService';
import { JWTPayload } from '../types';
import {
  logSocketConnection,
  logSocketDisconnection,
  logSocketEvent,
  logSocketError,
} from './logger';

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

// Track online users: userId -> socketId
const onlineUsers: Record<string, string> = {};

// Track typing timeouts: conversationId -> userId -> timeout
const typingTimeouts: Record<string, Record<string, NodeJS.Timeout>> = {};

let socketInstance: Server | null = null;

/**
 * Authenticate socket connection using JWT token
 */
const authenticateSocket = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      logSocketError('authentication', 'anonymous', new Error('Token required'));
      return next(new Error('Authentication error: Token required'));
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    socket.user = decoded;
    next();
  } catch (error) {
    logSocketError('authentication', 'anonymous', error instanceof Error ? error : new Error('Invalid token'));
    next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Emit event to all participants in a conversation
 * Uses socket rooms for efficient broadcasting
 */
const emitToConversation = (
  chatNamespace: any,
  conversationId: string,
  event: string,
  data: any
) => {
  chatNamespace.to(`conversation:${conversationId}`).emit(event, data);
};

/**
 * Emit event to a specific user by userId
 */
const emitToUser = (chatNamespace: any, userId: string, event: string, data: any) => {
  chatNamespace.to(`user:${userId}`).emit(event, data);
};

/**
 * Clear typing indicator for a user in a conversation
 */
const clearTyping = (
  chatNamespace: any,
  conversationId: string,
  userId: string
) => {
  if (typingTimeouts[conversationId]?.[userId]) {
    clearTimeout(typingTimeouts[conversationId][userId]);
    delete typingTimeouts[conversationId][userId];
  }

  emitToConversation(chatNamespace, conversationId, 'user-stopped-typing', {
    userId,
    conversationId,
  });
};

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Chat namespace with authentication
  const chatNamespace = io.of('/chat');
  chatNamespace.use(authenticateSocket);

  chatNamespace.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.userId;
    logSocketConnection(userId, socket.id);

    // Track online status
    onlineUsers[userId] = socket.id;
    AuthService.updateOnlineStatus(userId, true);

    // Join user's personal room and broadcast online status
    socket.join(`user:${userId}`);
    chatNamespace.emit('user-online', { userId });

    /**
     * Join a conversation room
     */
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    /**
     * Leave a conversation room
     */
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    /**
     * Send a message
     */
    socket.on('send-message', async (data: {
      conversationId: string;
      content: string;
      messageType?: 'text' | 'image' | 'file';
    }) => {
      try {
        const message = await MessageService.sendMessage(
          data.conversationId,
          userId,
          data.content,
          data.messageType || 'text'
        );

        // Emit to all participants in the conversation room
        emitToConversation(chatNamespace, data.conversationId, 'new-message', message);
        
        // Send acknowledgment to sender
        socket.emit('message-sent', { success: true, message });
        
        logSocketEvent('send-message', userId, { conversationId: data.conversationId, messageType: data.messageType });
      } catch (error: any) {
        logSocketError('send-message', userId, error);
        socket.emit('message-error', { error: error.message });
      }
    });

    /**
     * User started typing
     */
    socket.on('typing-start', (data: { conversationId: string }) => {
      // Clear any existing timeout
      clearTyping(chatNamespace, data.conversationId, userId);

      // Broadcast typing indicator
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId,
        conversationId: data.conversationId,
      });

      // Auto-clear after 5 seconds
      if (!typingTimeouts[data.conversationId]) {
        typingTimeouts[data.conversationId] = {};
      }

      typingTimeouts[data.conversationId][userId] = setTimeout(() => {
        clearTyping(chatNamespace, data.conversationId, userId);
      }, 5000);
    });

    /**
     * User stopped typing
     */
    socket.on('typing-stop', (data: { conversationId: string }) => {
      clearTyping(chatNamespace, data.conversationId, userId);
    });

    /**
     * Mark messages as read
     */
    socket.on('mark-as-read', async (data: { conversationId: string }) => {
      try {
        await MessageService.markAsRead(data.conversationId, userId);
        
        socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
          conversationId: data.conversationId,
          userId,
        });
        
        logSocketEvent('mark-as-read', userId, { conversationId: data.conversationId });
      } catch (error: any) {
        logSocketError('mark-as-read', userId, error);
        socket.emit('error', { error: error.message });
      }
    });

    /**
     * Chat request events
     */
    socket.on('chat-request-sent', (data: { receiverId: string; request: any }) => {
      logSocketEvent('chat-request-sent', userId, { receiverId: data.receiverId });
      emitToUser(chatNamespace, data.receiverId, 'new-chat-request', data.request);
    });

    socket.on('chat-request-accepted', (data: { senderId: string; conversation: any }) => {
      logSocketEvent('chat-request-accepted', userId, { senderId: data.senderId });
      emitToUser(chatNamespace, data.senderId, 'chat-request-accepted', data.conversation);
    });

    socket.on('chat-request-rejected', (data: { senderId: string }) => {
      logSocketEvent('chat-request-rejected', userId, { senderId: data.senderId });
      emitToUser(chatNamespace, data.senderId, 'chat-request-rejected', {});
    });

    /**
     * Get list of online users
     */
    socket.on('get-online-users', () => {
      logSocketEvent('get-online-users', userId, { count: Object.keys(onlineUsers).length });
      socket.emit('online-users', Object.keys(onlineUsers));
    });

    /**
     * Group invitation events
     */
    socket.on('invite-to-group', async (data: { conversationId: string; userIds: string[] }) => {
      try {
        const { ConversationService } = await import('../services/conversationService');
        const invitations = await ConversationService.inviteToGroup(
          data.conversationId,
          userId,
          data.userIds
        );

        // Notify invited users
        invitations.forEach((invitation: any) => {
          const targetUserId = invitation.invitedUser._id.toString();
          emitToUser(chatNamespace, targetUserId, 'group-invitation', invitation);
        });

        socket.emit('invitations-sent', { count: invitations.length });
        logSocketEvent('invite-to-group', userId, { conversationId: data.conversationId, count: invitations.length });
      } catch (error: any) {
        logSocketError('invite-to-group', userId, error);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('accept-invitation', async (data: { invitationId: string }) => {
      try {
        const { ConversationService } = await import('../services/conversationService');
        const result = await ConversationService.acceptInvitation(data.invitationId, userId);

        // Notify the inviter
        const inviterId = result.invitation.invitedBy._id.toString();
        emitToUser(chatNamespace, inviterId, 'invitation-accepted', {
          invitationId: data.invitationId,
          acceptedBy: result.invitation.invitedUser,
          conversation: result.conversation,
        });

        // Notify all participants of the updated conversation
        const participantIds = result.conversation.participants.map((p: any) => p._id.toString());
        participantIds.forEach((participantId: string) => {
          emitToUser(chatNamespace, participantId, 'conversation-updated', result.conversation);
        });

        socket.emit('invitation-accepted', result);
        logSocketEvent('accept-invitation', userId, { invitationId: data.invitationId });
      } catch (error: any) {
        logSocketError('accept-invitation', userId, error);
        socket.emit('error', { message: error.message });
      }
    });    socket.on('decline-invitation', async (data: { invitationId: string }) => {
      try {
        const { ConversationService } = await import('../services/conversationService');
        const invitation = await ConversationService.declineInvitation(data.invitationId, userId);

        // Notify the inviter
        const inviterId = invitation.invitedBy._id.toString();
        emitToUser(chatNamespace, inviterId, 'invitation-declined', {
          invitationId: data.invitationId,
          declinedBy: invitation.invitedUser,
        });

        socket.emit('invitation-declined', { invitationId: data.invitationId });
        logSocketEvent('decline-invitation', userId, { invitationId: data.invitationId });
      } catch (error: any) {
        logSocketError('decline-invitation', userId, error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async (reason: string) => {
      logSocketDisconnection(userId, socket.id, reason);

      // Clear all typing indicators for this user
      Object.keys(typingTimeouts).forEach((conversationId) => {
        if (typingTimeouts[conversationId][userId]) {
          clearTyping(chatNamespace, conversationId, userId);
        }
      });

      // Update online status
      delete onlineUsers[userId];
      await AuthService.updateOnlineStatus(userId, false);
      
      // Broadcast offline status
      chatNamespace.emit('user-offline', { userId });
    });
  });

  socketInstance = io;
  return io;
};

export const getOnlineUsers = () => onlineUsers;
export const getSocketInstance = () => socketInstance;
