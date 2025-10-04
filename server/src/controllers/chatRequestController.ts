import { Response, NextFunction } from 'express';
import { ChatRequestService } from '../services/chatRequestService';
import { AuthRequest } from '../types';

export class ChatRequestController {
  static async sendRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { receiverId, message } = req.body;
      const chatRequest = await ChatRequestService.sendChatRequest(
        req.user.userId,
        receiverId,
        message
      );

      res.status(201).json({
        success: true,
        data: chatRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  static async acceptRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { requestId } = req.params;
      const result = await ChatRequestService.acceptChatRequest(requestId, req.user.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { requestId } = req.params;
      const chatRequest = await ChatRequestService.rejectChatRequest(
        requestId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: chatRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPendingRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const requests = await ChatRequestService.getPendingRequests(req.user.userId);

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSentRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const requests = await ChatRequestService.getSentRequests(req.user.userId);

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { requestId } = req.params;
      await ChatRequestService.cancelChatRequest(requestId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Chat request cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
