import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { AppError } from '../middleware/errorHandler';

export class ConversationService {
  static async createOneToOneConversation(userId: string, otherUserId: string) {
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      type: 'one-to-one',
      participants: { $all: [userId, otherUserId] },
    })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt messageType',
        populate: {
          path: 'senderId',
          select: 'username',
        },
      });

    if (existingConversation) {
      // Format and return existing conversation
      const unreadCount = existingConversation.unreadCount.get(userId) || 0;
      return {
        id: String(existingConversation._id),
        type: existingConversation.type,
        participants: existingConversation.participants.map((p: any) => ({
          id: String(p._id),
          username: p.username,
          avatar: p.avatar,
          isOnline: p.isOnline,
          lastSeen: p.lastSeen,
        })),
        lastMessage: existingConversation.lastMessage,
        lastMessageAt: existingConversation.lastMessageAt,
        unreadCount,
        createdAt: existingConversation.createdAt,
        updatedAt: existingConversation.updatedAt,
      };
    }

    // Create new conversation
    const conversation = await Conversation.create({
      type: 'one-to-one',
      participants: [userId, otherUserId],
    });

    // Populate the new conversation
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar isOnline lastSeen');

    const unreadCount = populatedConversation!.unreadCount.get(userId) || 0;
    
    return {
      id: String(populatedConversation!._id),
      type: populatedConversation!.type,
      participants: populatedConversation!.participants.map((p: any) => ({
        id: String(p._id),
        username: p.username,
        avatar: p.avatar,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen,
      })),
      lastMessage: undefined,
      lastMessageAt: populatedConversation!.lastMessageAt,
      unreadCount,
      createdAt: populatedConversation!.createdAt,
      updatedAt: populatedConversation!.updatedAt,
    };
  }

  static async createGroupConversation(
    adminId: string,
    groupName: string,
    participants: string[]
  ) {
    // Ensure admin is in participants
    if (!participants.includes(adminId)) {
      participants.push(adminId);
    }

    // Create group conversation
    const conversation = await Conversation.create({
      type: 'group',
      groupName,
      groupAdmin: adminId, // Keep for backward compatibility
      groupAdmins: [adminId],
      participants,
    });

    // Populate and format the response
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    if (!populatedConversation) {
      throw new AppError('Failed to create group conversation', 500);
    }

    // Format the response
    const unreadCount = populatedConversation.unreadCount.get(adminId) || 0;
    return {
      id: String(populatedConversation._id),
      type: populatedConversation.type,
      participants: populatedConversation.participants.map((p: any) => ({
        id: String(p._id),
        username: p.username,
        avatar: p.avatar,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen,
      })),
      groupName: populatedConversation.groupName,
      groupAdmin: populatedConversation.groupAdmin ? {
        id: String((populatedConversation.groupAdmin as any)._id),
        username: (populatedConversation.groupAdmin as any).username,
        avatar: (populatedConversation.groupAdmin as any).avatar,
      } : undefined,
      groupAdmins: populatedConversation.groupAdmins?.map((admin: any) => ({
        id: String(admin._id),
        username: admin.username,
        avatar: admin.avatar,
      })) || [],
      lastMessage: populatedConversation.lastMessage,
      lastMessageAt: populatedConversation.lastMessageAt,
      unreadCount,
      createdAt: populatedConversation.createdAt,
      updatedAt: populatedConversation.updatedAt,
    };
  }

  static async getUserConversations(userId: string) {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar')
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt messageType',
        populate: {
          path: 'senderId',
          select: 'username',
        },
      });

    // Format conversations with unread count
    const formattedConversations = conversations.map((conv) => {
      const unreadCount = conv.unreadCount.get(userId) || 0;
      
      // Migrate old groups: if groupAdmins is empty but groupAdmin exists, initialize groupAdmins
      let groupAdmins = conv.groupAdmins || [];
      if (conv.type === 'group' && conv.groupAdmin && groupAdmins.length === 0) {
        groupAdmins = [conv.groupAdmin];
      }
      
      return {
        id: String(conv._id),
        type: conv.type,
        participants: conv.participants.map((p: any) => ({
          id: String(p._id),
          username: p.username,
          avatar: p.avatar,
          isOnline: p.isOnline,
          lastSeen: p.lastSeen,
        })),
        groupName: conv.groupName,
        groupAdmin: conv.groupAdmin ? {
          id: String((conv.groupAdmin as any)._id),
          username: (conv.groupAdmin as any).username,
          avatar: (conv.groupAdmin as any).avatar,
        } : undefined,
        groupAdmins: groupAdmins.map((admin: any) => ({
          id: String(admin._id || admin),
          username: admin.username,
          avatar: admin.avatar,
        })),
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });

    return formattedConversations;
  }

  static async getConversationById(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.participants.some((p: any) => p._id.toString() === userId)) {
      throw new AppError('You are not a participant of this conversation', 403);
    }

    return conversation;
  }

  static async addParticipantToGroup(
    conversationId: string,
    adminId: string,
    newParticipantId: string
  ) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations can add participants', 400);
    }

    if (conversation.groupAdmin !== adminId) {
      throw new AppError('Only group admin can add participants', 403);
    }

    if (conversation.participants.includes(newParticipantId)) {
      throw new AppError('User is already a participant', 400);
    }

    conversation.participants.push(newParticipantId);
    conversation.unreadCount.set(newParticipantId, 0);
    await conversation.save();

    return conversation;
  }

  static async removeParticipantFromGroup(
    conversationId: string,
    adminId: string,
    participantId: string
  ) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations can remove participants', 400);
    }

    if (conversation.groupAdmin !== adminId) {
      throw new AppError('Only group admin can remove participants', 403);
    }

    if (participantId === adminId) {
      throw new AppError('Admin cannot remove themselves', 400);
    }

    conversation.participants = conversation.participants.filter(
      (p) => p !== participantId
    );
    conversation.unreadCount.delete(participantId);
    await conversation.save();

    return conversation;
  }

  static async deleteConversation(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Only group admin or one-to-one participants can delete
    if (conversation.type === 'group' && conversation.groupAdmin !== userId) {
      throw new AppError('Only group admin can delete the group', 403);
    }

    if (!conversation.participants.includes(userId)) {
      throw new AppError('You are not a participant of this conversation', 403);
    }

    // Delete all messages
    await Message.deleteMany({ conversationId });

    // Delete conversation
    await Conversation.findByIdAndDelete(conversationId);

    return { success: true };
  }

  static async updateGroupName(
    conversationId: string,
    adminId: string,
    newGroupName: string
  ) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations can have their name updated', 400);
    }

    // Check if current user is an admin
    const isAdmin = conversation.groupAdmins?.includes(adminId) || 
                    String(conversation.groupAdmin) === adminId;
    
    if (!isAdmin) {
      throw new AppError('Only admins can update the group name', 403);
    }

    conversation.groupName = newGroupName;
    await conversation.save();

    // Return formatted conversation
    const populatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    if (!populatedConversation) {
      throw new AppError('Failed to retrieve updated conversation', 500);
    }

    const unreadCount = populatedConversation.unreadCount.get(adminId) || 0;
    return {
      id: String(populatedConversation._id),
      type: populatedConversation.type,
      participants: populatedConversation.participants.map((p: any) => ({
        id: String(p._id),
        username: p.username,
        avatar: p.avatar,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen,
      })),
      groupName: populatedConversation.groupName,
      groupAdmin: populatedConversation.groupAdmin ? {
        id: String((populatedConversation.groupAdmin as any)._id),
        username: (populatedConversation.groupAdmin as any).username,
        avatar: (populatedConversation.groupAdmin as any).avatar,
      } : undefined,
      groupAdmins: populatedConversation.groupAdmins?.map((admin: any) => ({
        id: String(admin._id),
        username: admin.username,
        avatar: admin.avatar,
      })) || [],
      lastMessage: populatedConversation.lastMessage,
      lastMessageAt: populatedConversation.lastMessageAt,
      unreadCount,
      createdAt: populatedConversation.createdAt,
      updatedAt: populatedConversation.updatedAt,
    };
  }

  static async promoteToAdmin(
    conversationId: string,
    currentAdminId: string,
    newAdminId: string
  ) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations have admins', 400);
    }

    // Check if current user is an admin
    const isAdmin = conversation.groupAdmins?.includes(currentAdminId) || 
                    String(conversation.groupAdmin) === currentAdminId;
    
    if (!isAdmin) {
      throw new AppError('Only admins can promote others', 403);
    }

    if (!conversation.participants.includes(newAdminId)) {
      throw new AppError('New admin must be a participant of the group', 400);
    }

    // Check if user is already an admin
    if (conversation.groupAdmins?.includes(newAdminId)) {
      throw new AppError('User is already an admin', 400);
    }

    // Add to groupAdmins array
    if (!conversation.groupAdmins) {
      conversation.groupAdmins = [];
    }
    conversation.groupAdmins.push(newAdminId);
    
    await conversation.save();

    // Return formatted conversation
    const populatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    if (!populatedConversation) {
      throw new AppError('Failed to retrieve updated conversation', 500);
    }

    const unreadCount = populatedConversation.unreadCount.get(currentAdminId) || 0;
    return {
      id: String(populatedConversation._id),
      type: populatedConversation.type,
      participants: populatedConversation.participants.map((p: any) => ({
        id: String(p._id),
        username: p.username,
        avatar: p.avatar,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen,
      })),
      groupName: populatedConversation.groupName,
      groupAdmin: populatedConversation.groupAdmin ? {
        id: String((populatedConversation.groupAdmin as any)._id),
        username: (populatedConversation.groupAdmin as any).username,
        avatar: (populatedConversation.groupAdmin as any).avatar,
      } : undefined,
      groupAdmins: populatedConversation.groupAdmins?.map((admin: any) => ({
        id: String(admin._id),
        username: admin.username,
        avatar: admin.avatar,
      })) || [],
      lastMessage: populatedConversation.lastMessage,
      lastMessageAt: populatedConversation.lastMessageAt,
      unreadCount,
      createdAt: populatedConversation.createdAt,
      updatedAt: populatedConversation.updatedAt,
    };
  }
}
