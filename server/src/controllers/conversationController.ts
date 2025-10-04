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

      const { groupName, participants } = req.body;
      const conversation = await ConversationService.createGroupConversation(
        req.user.userId,
        groupName,
        participants
      );

      // Notify all participants via socket about the new group
      const io = getSocketInstance();
      const onlineUsers = getOnlineUsers();
      const currentUserId = req.user.userId;
      
      if (io) {
        const chatNamespace = io.of('/chat');
        
        // Notify each participant (except the creator) about the new group
        conversation.participants.forEach((participant: any) => {
          const participantId = String(participant.id);
          if (participantId !== currentUserId) {
            const socketId = onlineUsers[participantId];
            if (socketId) {
              chatNamespace.to(socketId).emit('group-created', conversation);
            }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: conversation,
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

      const conversation = await ConversationService.promoteToAdmin(
        conversationId,
        req.user.userId,
        newAdminId
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
}
