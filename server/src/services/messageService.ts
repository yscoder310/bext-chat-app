import Message from '../models/Message';
import Conversation from '../models/Conversation';
import { AppError } from '../middleware/errorHandler';

// Helper to format message
const formatMessage = (message: any) => {
  const formatted: any = {
    _id: String(message._id),
    conversationId: String(message.conversationId),
    content: message.content,
    messageType: message.messageType,
    isRead: message.isRead,
    readBy: message.readBy,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  // Format senderId - could be string or populated object
  if (typeof message.senderId === 'string') {
    formatted.senderId = message.senderId;
  } else if (message.senderId && message.senderId._id) {
    formatted.senderId = {
      id: String(message.senderId._id),
      username: message.senderId.username,
      avatar: message.senderId.avatar,
      isOnline: message.senderId.isOnline,
    };
  }

  return formatted;
};

export class MessageService {
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' = 'text'
  ) {
    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.participants.includes(senderId)) {
      throw new AppError('You are not a participant of this conversation', 403);
    }

    // Create message
    const message = await Message.create({
      conversationId,
      senderId,
      content,
      messageType,
      isRead: false,
      readBy: [senderId],
    });

    // Update conversation
    conversation.lastMessage = String(message._id);
    conversation.lastMessageAt = new Date();
    
    // Increment unread count for other participants
    conversation.participants.forEach((participantId) => {
      if (participantId !== senderId) {
        const currentCount = conversation.unreadCount.get(participantId) || 0;
        conversation.unreadCount.set(participantId, currentCount + 1);
      }
    });
    
    await conversation.save();

    // Populate sender info
    const populatedMessage = await Message.findById(message._id).populate(
      'senderId',
      'username avatar isOnline'
    );

    return formatMessage(populatedMessage);
  }

  static async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Verify user is participant
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.participants.includes(userId)) {
      throw new AppError('You are not a participant of this conversation', 403);
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username avatar isOnline');

    const total = await Message.countDocuments({ conversationId });

    return {
      messages: messages.reverse().map(formatMessage),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async markAsRead(conversationId: string, userId: string) {
    // Update all unread messages
    await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
        $set: { isRead: true },
      }
    );

    // Reset unread count
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCount.set(userId, 0);
      await conversation.save();
    }

    return { success: true };
  }

  static async deleteMessage(messageId: string, userId: string) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId !== userId) {
      throw new AppError('You can only delete your own messages', 403);
    }

    await Message.findByIdAndDelete(messageId);

    return { success: true };
  }
}
