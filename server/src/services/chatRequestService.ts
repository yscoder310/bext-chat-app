import ChatRequest from '../models/ChatRequest';
import { ConversationService } from './conversationService';
import { AppError } from '../middleware/errorHandler';

// Helper to format user object
const formatUser = (user: any) => {
  if (!user) return user;
  return {
    id: String(user._id || user.id),
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    isOnline: user.isOnline,
  };
};

export class ChatRequestService {
  static async sendChatRequest(senderId: string, receiverId: string, message?: string) {
    if (senderId === receiverId) {
      throw new AppError('Cannot send chat request to yourself', 400);
    }

    // Check if there's already a pending request
    const existingRequest = await ChatRequest.findOne({
      senderId,
      receiverId,
      status: 'pending',
    });

    if (existingRequest) {
      throw new AppError('Chat request already sent', 400);
    }

    // Check if there's a reverse pending request
    const reverseRequest = await ChatRequest.findOne({
      senderId: receiverId,
      receiverId: senderId,
      status: 'pending',
    });

    if (reverseRequest) {
      throw new AppError('This user has already sent you a chat request', 400);
    }

    // Create chat request
    const chatRequest = await ChatRequest.create({
      senderId,
      receiverId,
      message,
      status: 'pending',
    });

    // Populate sender info
    const populatedRequest = await ChatRequest.findById(chatRequest._id)
      .populate('senderId', 'username avatar email isOnline')
      .populate('receiverId', 'username avatar email isOnline');

    // Format with id instead of _id
    const formatted = {
      _id: populatedRequest!._id,
      senderId: formatUser(populatedRequest!.senderId),
      receiverId: formatUser(populatedRequest!.receiverId),
      status: populatedRequest!.status,
      message: populatedRequest!.message,
      createdAt: populatedRequest!.createdAt,
      updatedAt: populatedRequest!.updatedAt,
    };

    return formatted;
  }

  static async acceptChatRequest(requestId: string, userId: string) {
    const chatRequest = await ChatRequest.findById(requestId);

    if (!chatRequest) {
      throw new AppError('Chat request not found', 404);
    }

    if (chatRequest.receiverId !== userId) {
      throw new AppError('You can only accept requests sent to you', 403);
    }

    if (chatRequest.status !== 'pending') {
      throw new AppError('Chat request is no longer pending', 400);
    }

    // Update request status
    chatRequest.status = 'accepted';
    await chatRequest.save();

    // Create conversation
    const conversation = await ConversationService.createOneToOneConversation(
      chatRequest.senderId,
      chatRequest.receiverId
    );

    return {
      chatRequest,
      conversation,
    };
  }

  static async rejectChatRequest(requestId: string, userId: string) {
    const chatRequest = await ChatRequest.findById(requestId);

    if (!chatRequest) {
      throw new AppError('Chat request not found', 404);
    }

    if (chatRequest.receiverId !== userId) {
      throw new AppError('You can only reject requests sent to you', 403);
    }

    if (chatRequest.status !== 'pending') {
      throw new AppError('Chat request is no longer pending', 400);
    }

    // Update request status
    chatRequest.status = 'rejected';
    await chatRequest.save();

    return chatRequest;
  }

  static async getPendingRequests(userId: string) {
    const requests = await ChatRequest.find({
      receiverId: userId,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username avatar email isOnline')
      .populate('receiverId', 'username avatar email isOnline');

    return requests.map(req => ({
      _id: req._id,
      senderId: formatUser(req.senderId),
      receiverId: formatUser(req.receiverId),
      status: req.status,
      message: req.message,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
    }));
  }

  static async getSentRequests(userId: string) {
    const requests = await ChatRequest.find({
      senderId: userId,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username avatar email isOnline')
      .populate('receiverId', 'username avatar email isOnline');

    return requests.map(req => ({
      _id: req._id,
      senderId: formatUser(req.senderId),
      receiverId: formatUser(req.receiverId),
      status: req.status,
      message: req.message,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
    }));
  }

  static async cancelChatRequest(requestId: string, userId: string) {
    const chatRequest = await ChatRequest.findById(requestId);

    if (!chatRequest) {
      throw new AppError('Chat request not found', 404);
    }

    if (chatRequest.senderId !== userId) {
      throw new AppError('You can only cancel your own requests', 403);
    }

    if (chatRequest.status !== 'pending') {
      throw new AppError('Can only cancel pending requests', 400);
    }

    await ChatRequest.findByIdAndDelete(requestId);

    return { success: true };
  }
}
