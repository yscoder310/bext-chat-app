import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { MessageService } from '../services/messageService';
import { AuthService } from '../services/authService';
import { JWTPayload } from '../types';

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

interface OnlineUsers {
  [userId: string]: string; // userId -> socketId
}

interface TypingTracker {
  [conversationId: string]: {
    [userId: string]: NodeJS.Timeout;
  };
}

const onlineUsers: OnlineUsers = {};
const typingTimeouts: TypingTracker = {};

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.io authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as JWTPayload;

      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Chat namespace
  const chatNamespace = io.of('/chat');

  chatNamespace.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as JWTPayload;
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  chatNamespace.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.userId;
    console.log(`✅ User connected: ${userId}, Socket ID: ${socket.id}`);

    // Store online user
    onlineUsers[userId] = socket.id;

    // Update user online status in database
    AuthService.updateOnlineStatus(userId, true);

    // Notify ALL users in the chat namespace that this user is online
    chatNamespace.emit('user-online', { userId });
    console.log(`📢 Broadcasting user-online event for user: ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join conversation rooms
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Send message
    socket.on('send-message', async (data: {
      conversationId: string;
      content: string;
      messageType?: 'text' | 'image' | 'file';
    }) => {
      try {
        console.log(`User ${userId} sending message to conversation ${data.conversationId}`);
        
        const message = await MessageService.sendMessage(
          data.conversationId,
          userId,
          data.content,
          data.messageType || 'text'
        );

        console.log('Message created:', message);

        // Get conversation to find all participants
        const conversation = await require('../models/Conversation').default.findById(data.conversationId);
        
        if (conversation) {
          // Emit to all participants (both in room and not in room)
          conversation.participants.forEach((participantId: any) => {
            const participantIdStr = String(participantId);
            const socketId = onlineUsers[participantIdStr];
            if (socketId) {
              chatNamespace.to(socketId).emit('new-message', message);
            }
          });
          
          // Also emit to conversation room (for users actively in the chat)
          chatNamespace.to(`conversation:${data.conversationId}`).emit('new-message', message);
        } else {
          // Fallback to room-only if conversation not found
          socket.emit('new-message', message);
          chatNamespace.to(`conversation:${data.conversationId}`).emit('new-message', message);
        }

        // Send acknowledgment to sender
        socket.emit('message-sent', { success: true, message });
        
        console.log('Message emitted to all participants');
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('message-error', { error: error.message });
      }
    });

    // Typing indicator with automatic timeout
    socket.on('typing-start', async (data: { conversationId: string }) => {
      console.log(`⌨️ User ${userId} started typing in conversation ${data.conversationId}`);
      
      // Clear any existing timeout for this user in this conversation
      if (typingTimeouts[data.conversationId]?.[userId]) {
        clearTimeout(typingTimeouts[data.conversationId][userId]);
      }
      
      // Get conversation to find all participants
      const conversation = await require('../models/Conversation').default.findById(data.conversationId);
      
      if (conversation) {
        // Emit to all participants
        conversation.participants.forEach((participantId: any) => {
          const participantIdStr = String(participantId);
          if (participantIdStr !== userId) { // Don't send to self
            const socketId = onlineUsers[participantIdStr];
            if (socketId) {
              chatNamespace.to(socketId).emit('user-typing', {
                userId,
                conversationId: data.conversationId,
              });
            }
          }
        });
      }
      
      // Also broadcast to conversation room
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId,
        conversationId: data.conversationId,
      });
      
      // Set automatic timeout to clear typing after 5 seconds (safety mechanism)
      if (!typingTimeouts[data.conversationId]) {
        typingTimeouts[data.conversationId] = {};
      }
      
      typingTimeouts[data.conversationId][userId] = setTimeout(async () => {
        console.log(`⏱️ Auto-clearing typing indicator for user ${userId} in conversation ${data.conversationId}`);
        
        // Get conversation again for auto-clear
        const conv = await require('../models/Conversation').default.findById(data.conversationId);
        if (conv) {
          conv.participants.forEach((participantId: any) => {
            const participantIdStr = String(participantId);
            if (participantIdStr !== userId) {
              const socketId = onlineUsers[participantIdStr];
              if (socketId) {
                chatNamespace.to(socketId).emit('user-stopped-typing', {
                  userId,
                  conversationId: data.conversationId,
                });
              }
            }
          });
        }
        
        socket.to(`conversation:${data.conversationId}`).emit('user-stopped-typing', {
          userId,
          conversationId: data.conversationId,
        });
        delete typingTimeouts[data.conversationId][userId];
      }, 5000);
    });

    socket.on('typing-stop', async (data: { conversationId: string }) => {
      console.log(`🛑 User ${userId} stopped typing in conversation ${data.conversationId}`);
      
      // Clear the timeout
      if (typingTimeouts[data.conversationId]?.[userId]) {
        clearTimeout(typingTimeouts[data.conversationId][userId]);
        delete typingTimeouts[data.conversationId][userId];
      }
      
      // Get conversation to find all participants
      const conversation = await require('../models/Conversation').default.findById(data.conversationId);
      
      if (conversation) {
        // Emit to all participants
        conversation.participants.forEach((participantId: any) => {
          const participantIdStr = String(participantId);
          if (participantIdStr !== userId) {
            const socketId = onlineUsers[participantIdStr];
            if (socketId) {
              chatNamespace.to(socketId).emit('user-stopped-typing', {
                userId,
                conversationId: data.conversationId,
              });
            }
          }
        });
      }
      
      // Also broadcast to conversation room
      socket.to(`conversation:${data.conversationId}`).emit('user-stopped-typing', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Mark messages as read
    socket.on('mark-as-read', async (data: { conversationId: string }) => {
      try {
        await MessageService.markAsRead(data.conversationId, userId);

        // Notify other participants
        socket.to(`conversation:${data.conversationId}`).emit('messages-read', {
          conversationId: data.conversationId,
          userId,
        });
      } catch (error: any) {
        socket.emit('error', { error: error.message });
      }
    });

    // Chat request events
    socket.on('chat-request-sent', (data: { receiverId: string; request: any }) => {
      const receiverSocketId = onlineUsers[data.receiverId];
      if (receiverSocketId) {
        chatNamespace.to(receiverSocketId).emit('new-chat-request', data.request);
      }
    });

    socket.on('chat-request-accepted', (data: { senderId: string; conversation: any }) => {
      const senderSocketId = onlineUsers[data.senderId];
      if (senderSocketId) {
        chatNamespace.to(senderSocketId).emit('chat-request-accepted', data.conversation);
      }
    });

    socket.on('chat-request-rejected', (data: { senderId: string }) => {
      const senderSocketId = onlineUsers[data.senderId];
      if (senderSocketId) {
        chatNamespace.to(senderSocketId).emit('chat-request-rejected');
      }
    });

    // Get online users
    socket.on('get-online-users', () => {
      const onlineUserIds = Object.keys(onlineUsers);
      console.log(`📋 Sending online users list: ${onlineUserIds.length} users online`);
      socket.emit('online-users', onlineUserIds);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${userId}`);

      // Clear all typing timeouts for this user and notify all participants
      const conversationIds = Object.keys(typingTimeouts);
      for (const conversationId of conversationIds) {
        if (typingTimeouts[conversationId][userId]) {
          clearTimeout(typingTimeouts[conversationId][userId]);
          delete typingTimeouts[conversationId][userId];
          
          // Get conversation to notify all participants
          const conversation = await require('../models/Conversation').default.findById(conversationId);
          if (conversation) {
            conversation.participants.forEach((participantId: any) => {
              const participantIdStr = String(participantId);
              if (participantIdStr !== userId) {
                const socketId = onlineUsers[participantIdStr];
                if (socketId) {
                  chatNamespace.to(socketId).emit('user-stopped-typing', {
                    userId,
                    conversationId,
                  });
                }
              }
            });
          }
          
          // Also emit to conversation room
          chatNamespace.to(`conversation:${conversationId}`).emit('user-stopped-typing', {
            userId,
            conversationId,
          });
        }
      }

      // Remove from online users
      delete onlineUsers[userId];

      // Update user status in database
      await AuthService.updateOnlineStatus(userId, false);

      // Notify ALL users in the chat namespace that this user is offline
      chatNamespace.emit('user-offline', { userId });
      console.log(`📢 Broadcasting user-offline event for user: ${userId}`);
    });
  });

  return io;
};

export const getOnlineUsers = () => onlineUsers;
