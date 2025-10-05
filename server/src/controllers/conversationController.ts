import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ConversationService } from '../services/conversationService';
import { AuthRequest } from '../types';
import { getSocketInstance, getOnlineUsers } from '../config/socket';

export class ConversationController {
  static async createOneToOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { otherUserId } = req.body;
      const conversation = await ConversationService.createOneToOneConversation(
        req.user.userId,
        otherUserId
      );

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { groupName, participants, groupDescription, groupType, settings } = req.body;
      const result = await ConversationService.createGroupConversation(
        req.user.userId,
        groupName,
        participants,
        groupDescription,
        groupType || 'private',
        settings
      );

      // Notify all participants via socket about the new group
      const io = getSocketInstance();
      const onlineUsers = getOnlineUsers();
      const currentUserId = req.user.userId;
      
      if (io) {
        const chatNamespace = io.of('/chat');
        
        // Emit system message to all members (including creator)
        if (result.systemMessage) {
          chatNamespace.to(`conversation:${result.conversation.id}`).emit('new-message', result.systemMessage);
          console.log(`📨 Emitted system message for group creation to conversation: ${result.conversation.id}`);
        }
        
        // Notify each participant (except the creator) about the new group
        result.conversation.participants.forEach((participant: any) => {
          const participantId = String(participant.id);
          if (participantId !== currentUserId) {
            const socketId = onlineUsers[participantId];
            if (socketId) {
              chatNamespace.to(socketId).emit('group-created', result.conversation);
            }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: result.conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const conversations = await ConversationService.getUserConversations(req.user.userId);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getConversationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const conversation = await ConversationService.getConversationById(
        conversationId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addParticipant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const { participantId } = req.body;

      const conversation = await ConversationService.addParticipantToGroup(
        conversationId,
        req.user.userId,
        participantId
      );

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeParticipant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId, participantId } = req.params;

      const conversation = await ConversationService.removeParticipantFromGroup(
        conversationId,
        req.user.userId,
        participantId
      );

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async leaveGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const userId = req.user.userId;

      // Remove user from database and get system message
      const result = await ConversationService.leaveGroup(conversationId, userId);

      console.log(`📡 User ${userId} left group ${conversationId}, broadcasting to others`);
      console.log(`📨 System message created:`, result.systemMessage);

      const io = getSocketInstance();
      if (io) {
        const chatNamespace = io.of('/chat');
        const roomName = `conversation:${conversationId}`;
        
        // Check how many sockets are in the room BEFORE removing the leaving user
        const roomSockets = await chatNamespace.in(roomName).fetchSockets();
        console.log(`👥 Room ${roomName} has ${roomSockets.length} socket(s) BEFORE removal`);
        
        // IMPORTANT: First, make ALL of the leaving user's sockets leave the room
        // (they might have multiple tabs/devices open)
        let removedSocketsCount = 0;
        chatNamespace.sockets.forEach((socket: any) => {
          if (socket.user?.userId === userId) {
            socket.leave(roomName);
            removedSocketsCount++;
            console.log(`🚪 User ${userId} socket ${socket.id} removed from room ${roomName}`);
          }
        });
        
        console.log(`🚪 Removed ${removedSocketsCount} socket(s) for user ${userId} from room ${roomName}`);
        
        // Check how many sockets remain AFTER removal
        const remainingSockets = await chatNamespace.in(roomName).fetchSockets();
        console.log(`👥 Room ${roomName} has ${remainingSockets.length} socket(s) AFTER removal`);
        
        // Emit the system message to remaining members in real-time
        if (result.systemMessage) {
          chatNamespace.to(roomName).emit('new-message', result.systemMessage);
          console.log(`📨 Emitted system message to remaining members in room: ${roomName}`);
          console.log(`📨 Message content:`, JSON.stringify(result.systemMessage, null, 2));
        } else {
          console.log(`⚠️ WARNING: No system message to emit!`);
        }
        
        // Now emit refresh signal to remaining members ONLY
        chatNamespace.to(roomName).emit('conversation-refresh', { 
          conversationId,
          action: 'member-left',
          userId // Include who left for logging
        });
        
        console.log(`✅ Emitted conversation-refresh to remaining members in room: ${roomName}`);
        
        // Separately notify the leaving user to remove the conversation on ALL their sockets
        chatNamespace.to(`user:${userId}`).emit('conversation-removed', {
          conversationId
        });
        console.log(`📤 Sent conversation-removed to leaving user: ${userId} (to their personal room)`);
      }

      res.status(200).json({
        success: true,
        message: 'Left group successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      await ConversationService.deleteConversation(conversationId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateGroupName(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const { groupName } = req.body;

      if (!groupName || !groupName.trim()) {
        res.status(400).json({ error: 'Group name is required' });
        return;
      }

      const conversation = await ConversationService.updateGroupName(
        conversationId,
        req.user.userId,
        groupName.trim()
      );

      // Notify all participants via socket
      const io = getSocketInstance();
      const onlineUsers = getOnlineUsers();
      
      if (io) {
        const chatNamespace = io.of('/chat');
        
        conversation.participants.forEach((participant: any) => {
          const participantId = String(participant.id);
          const socketId = onlineUsers[participantId];
          if (socketId) {
            chatNamespace.to(socketId).emit('group-updated', conversation);
          }
        });
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateGroupDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const { groupName, groupDescription } = req.body;

      // Validate that at least one field is provided
      if (groupName === undefined && groupDescription === undefined) {
        res.status(400).json({ error: 'At least one field (groupName or groupDescription) must be provided' });
        return;
      }

      const updates: { groupName?: string; groupDescription?: string } = {};
      if (groupName !== undefined) updates.groupName = groupName;
      if (groupDescription !== undefined) updates.groupDescription = groupDescription;

      const conversation = await ConversationService.updateGroupDetails(
        conversationId,
        req.user.userId,
        updates
      );

      // Notify all participants via socket
      const io = getSocketInstance();
      const onlineUsers = getOnlineUsers();
      
      if (io) {
        const chatNamespace = io.of('/chat');
        
        conversation.participants.forEach((participant: any) => {
          const participantId = String(participant.id);
          const socketId = onlineUsers[participantId];
          if (socketId) {
            chatNamespace.to(socketId).emit('group-updated', conversation);
          }
        });
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async promoteToAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const { newAdminId } = req.body;

      if (!newAdminId) {
        res.status(400).json({ error: 'New admin ID is required' });
        return;
      }

      const result = await ConversationService.promoteToAdmin(
        conversationId,
        req.user.userId,
        newAdminId
      );

      // Notify all participants via socket
      const io = getSocketInstance();
      const onlineUsers = getOnlineUsers();
      
      if (io) {
        const chatNamespace = io.of('/chat');
        
        // Emit system message to all members
        if (result.systemMessage) {
          chatNamespace.to(`conversation:${conversationId}`).emit('new-message', result.systemMessage);
          console.log(`📨 Emitted system message for admin promotion to conversation: ${conversationId}`);
        }
        
        // Also emit group-updated for UI updates
        result.conversation.participants.forEach((participant: any) => {
          const participantId = String(participant.id);
          const socketId = onlineUsers[participantId];
          if (socketId) {
            chatNamespace.to(socketId).emit('group-updated', result.conversation);
          }
        });
      }

      res.status(200).json({
        success: true,
        data: result.conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW METHODS FOR INVITATION SYSTEM

  static async getPendingInvitations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const invitations = await ConversationService.getPendingInvitations(req.user.userId);

      res.status(200).json({
        success: true,
        data: invitations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicGroups(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { search, page, limit } = req.query;
      const groups = await ConversationService.getPublicGroups(
        req.user.userId,
        search as string,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 20
      );

      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }

  static async joinPublicGroup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId } = req.params;
      const result = await ConversationService.joinPublicGroup(
        conversationId,
        req.user.userId
      );

      // Notify existing members with system message in real-time
      const io = getSocketInstance();
      if (io) {
        const chatNamespace = io.of('/chat');
        
        // Emit system message to all members (including the new member)
        if (result.systemMessage) {
          chatNamespace.to(`conversation:${conversationId}`).emit('new-message', result.systemMessage);
          console.log(`📨 Emitted system message for member join to conversation: ${conversationId}`);
        }
        
        // Also emit member-joined event for additional UI updates
        chatNamespace.to(`conversation:${conversationId}`).emit('member-joined', {
          conversationId,
          member: result.conversation.participants.find((p: any) => p.id === req.user!.userId),
        });
      }

      res.status(200).json({
        success: true,
        data: result.conversation,
      });
    } catch (error) {
      next(error);
    }
  }
}
