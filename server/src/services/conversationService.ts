import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { AppError } from '../middleware/errorHandler';

export class ConversationService {
  // Helper to create system messages - PUBLIC so controllers can emit socket events
  static async createSystemMessage(
    conversationId: string,
    systemMessageType: 'member-added' | 'member-removed' | 'admin-promoted' | 'member-left' | 'group-created',
    content: string,
    metadata?: Record<string, string>
  ) {
    const message = await Message.create({
      conversationId,
      messageType: 'system',
      systemMessageType,
      content,
      metadata: metadata ? new Map(Object.entries(metadata)) : undefined,
      isRead: false,
      readBy: [],
    });

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    // Format message for socket emission (like regular messages)
    return {
      _id: String(message._id),
      conversationId: String(message.conversationId),
      messageType: message.messageType,
      systemMessageType: message.systemMessageType,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt,
      isRead: message.isRead,
      readBy: message.readBy,
    };
  }

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
    participants: string[],
    groupDescription?: string,
    groupType: 'private' | 'public' = 'private',
    settings?: {
      maxMembers?: number;
      allowMemberInvites?: boolean;
    }
  ) {
    // Ensure admin is in participants
    if (!participants.includes(adminId)) {
      participants.push(adminId);
    }

    // Initialize join dates for all initial members
    const now = new Date();
    const memberJoinDates = new Map<string, Date>();
    participants.forEach(userId => {
      memberJoinDates.set(userId, now);
    });

    // Create group conversation
    const conversation = await Conversation.create({
      type: 'group',
      groupName,
      groupDescription,
      groupType,
      groupAdmin: adminId, // Keep for backward compatibility
      groupAdmins: [adminId],
      participants,
      memberJoinDates, // Set join dates for initial members
      groupSettings: {
        maxMembers: settings?.maxMembers || 500,
        allowMemberInvites: settings?.allowMemberInvites || false,
        isArchived: false,
      },
    });

    // Populate and format the response
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    if (!populatedConversation) {
      throw new AppError('Failed to create group conversation', 500);
    }

    // Create system message for group creation
    const adminUser = populatedConversation.participants.find((p: any) => String(p._id) === adminId);
    const systemMessage = await this.createSystemMessage(
      String(conversation._id),
      'group-created',
      `${(adminUser as any)?.username || 'A member'} created the group`,
      { userId: adminId }
    );

    // Format the response
    const unreadCount = populatedConversation.unreadCount.get(adminId) || 0;
    return {
      conversation: {
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
        groupDescription: populatedConversation.groupDescription,
        groupType: populatedConversation.groupType,
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
        groupSettings: populatedConversation.groupSettings,
        lastMessage: populatedConversation.lastMessage,
        lastMessageAt: populatedConversation.lastMessageAt,
        unreadCount,
        createdAt: populatedConversation.createdAt,
        updatedAt: populatedConversation.updatedAt,
      },
      systemMessage,
    };
  }

  static async getUserConversations(userId: string) {
    console.log(`📋 Getting conversations for user: ${userId}`);
    
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

    console.log(`📋 Found ${conversations.length} conversations for user ${userId}`);
    conversations.forEach(conv => {
      console.log(`  - ${conv.type === 'group' ? conv.groupName : 'DM'} (${conv._id}) - ${conv.participants.length} participants`);
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
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username');

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations can add participants', 400);
    }

    // Check if current user is an admin
    const isAdmin = conversation.groupAdmins?.includes(adminId) || 
                    String(conversation.groupAdmin) === adminId;
    
    if (!isAdmin) {
      throw new AppError('Only admins can add participants', 403);
    }

    if (conversation.participants.includes(newParticipantId)) {
      throw new AppError('User is already a participant', 400);
    }

    conversation.participants.push(newParticipantId);
    conversation.memberJoinDates.set(newParticipantId, new Date()); // Set join date for privacy
    conversation.unreadCount.set(newParticipantId, 0);
    await conversation.save();

    // Get the new participant's name for system message
    const populatedConv = await Conversation.findById(conversationId)
      .populate('participants', 'username');
    const newMember = (populatedConv?.participants as any[]).find((p: any) => p._id.toString() === newParticipantId);
    
    // Create system message
    await this.createSystemMessage(
      conversationId,
      'member-added',
      `${newMember?.username || 'A new member'} was added to the group`,
      { userId: newParticipantId }
    );

    return conversation;
  }

  static async removeParticipantFromGroup(
    conversationId: string,
    adminId: string,
    participantId: string
  ) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username');

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations can remove participants', 400);
    }

    // Check if current user is an admin
    const isAdmin = conversation.groupAdmins?.includes(adminId) || 
                    String(conversation.groupAdmin) === adminId;
    
    if (!isAdmin) {
      throw new AppError('Only admins can remove participants', 403);
    }

    if (participantId === adminId) {
      throw new AppError('Admin cannot remove themselves. Use leave group instead.', 400);
    }

    const removedMember = (conversation.participants as any[]).find((p: any) => 
      (p._id || p).toString() === participantId
    );

    conversation.participants = conversation.participants.filter(
      (p) => p !== participantId && (p as any)._id?.toString() !== participantId
    );
    conversation.unreadCount.delete(participantId);
    await conversation.save();

    // Create system message
    await this.createSystemMessage(
      conversationId,
      'member-removed',
      `${removedMember?.username || 'A member'} was removed from the group`,
      { userId: participantId }
    );

    return conversation;
  }

  static async leaveGroup(conversationId: string, userId: string) {
    // First, get conversation with populated participants for system message
    const conversationWithUsers = await Conversation.findById(conversationId)
      .populate('participants', 'username');

    if (!conversationWithUsers) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversationWithUsers.type !== 'group') {
      throw new AppError('Only group conversations can be left', 400);
    }

    // Check if user is a member
    const isMember = (conversationWithUsers.participants as any[]).some((p: any) => 
      (p._id || p).toString() === userId
    );

    if (!isMember) {
      throw new AppError('You are not a member of this group', 400);
    }

    // Get username for system message
    const leavingMember = (conversationWithUsers.participants as any[]).find((p: any) => 
      (p._id || p).toString() === userId
    );

    // Use findByIdAndUpdate with $pull to properly remove user from arrays
    // This is atomic and avoids the validation issue with populated documents
    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $pull: {
          participants: userId,
          groupAdmins: userId,
        },
        $unset: {
          [`unreadCount.${userId}`]: 1
        },
        $set: {
          lastMessageAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedConversation) {
      throw new AppError('Failed to update conversation', 500);
    }

    console.log(`✅ User ${userId} removed from conversation ${conversationId}`);
    console.log(`✅ Remaining participants: ${updatedConversation.participants.length}`);

    // Create system message
    const systemMessage = await this.createSystemMessage(
      conversationId,
      'member-left',
      `${leavingMember?.username || 'A member'} left the group`,
      { userId }
    );

    return { success: true, systemMessage };
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

  // Update group details (name and description)
  static async updateGroupDetails(
    conversationId: string,
    adminId: string,
    updates: { groupName?: string; groupDescription?: string }
  ) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Only group conversations can have their details updated', 400);
    }

    // Check if current user is an admin
    const isAdmin = conversation.groupAdmins?.includes(adminId) || 
                    String(conversation.groupAdmin) === adminId;
    
    if (!isAdmin) {
      throw new AppError('Only admins can update the group details', 403);
    }

    // Update fields if provided
    if (updates.groupName !== undefined) {
      if (!updates.groupName.trim()) {
        throw new AppError('Group name cannot be empty', 400);
      }
      conversation.groupName = updates.groupName.trim();
    }

    if (updates.groupDescription !== undefined) {
      conversation.groupDescription = updates.groupDescription.trim();
    }

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
      groupDescription: populatedConversation.groupDescription,
      groupType: populatedConversation.groupType,
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
      groupSettings: populatedConversation.groupSettings,
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

    // Create system message
    const newAdmin = conversation.participants.find((p: any) => p === newAdminId || p._id === newAdminId);
    const newAdminName = typeof newAdmin === 'string' ? 'A member' : newAdmin;
    
    const systemMessage = await this.createSystemMessage(
      conversationId,
      'admin-promoted',
      `${typeof newAdminName === 'string' ? newAdminName : 'A member'} was promoted to admin`,
      { userId: newAdminId }
    );

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
      conversation: {
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
      },
      systemMessage,
    };
  }

  // NEW METHODS FOR INVITATION SYSTEM

  // Invite users to group
  static async inviteToGroup(
    conversationId: string,
    inviterId: string,
    userIds: string[]
  ) {
    const Invitation = (await import('../models/Invitation')).default;
    
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Group not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('Can only invite to group conversations', 400);
    }

    // Check if inviter is authorized
    const isInviterMember = conversation.participants.includes(inviterId);
    if (!isInviterMember) {
      throw new AppError('You are not a member of this group', 403);
    }

    const isInviterAdmin = conversation.groupAdmins?.includes(inviterId) || conversation.groupAdmin === inviterId;
    const allowMemberInvites = conversation.groupSettings?.allowMemberInvites || false;

    if (!isInviterAdmin && !allowMemberInvites) {
      throw new AppError('You are not authorized to invite members', 403);
    }

    // Filter out already invited/member users
    const validUserIds = userIds.filter((userId) => {
      return !conversation.participants.includes(userId);
    });

    if (validUserIds.length === 0) {
      throw new AppError('All users are already members', 400);
    }

    // Check group capacity
    const maxMembers = conversation.groupSettings?.maxMembers || 500;
    const newMemberCount = conversation.participants.length + validUserIds.length;
    if (newMemberCount > maxMembers) {
      throw new AppError(`Group capacity exceeded. Max members: ${maxMembers}`, 400);
    }

    // Create invitations
    const invitations = await Promise.all(
      validUserIds.map(async (userId) => {
        // Check for existing pending invitation
        const existingInvitation = await Invitation.findOne({
          conversationId,
          invitedUser: userId,
          status: 'pending',
        });

        if (existingInvitation) {
          return existingInvitation;
        }

        const invitation = await Invitation.create({
          conversationId,
          invitedBy: inviterId,
          invitedUser: userId,
          status: 'pending',
        });

        return invitation;
      })
    );

    // Populate invitation data
    await Invitation.populate(invitations, [
      { path: 'conversationId', select: 'groupName groupDescription groupType type' },
      { path: 'invitedBy', select: 'username avatar' },
      { path: 'invitedUser', select: 'username avatar' },
    ]);

    return invitations;
  }

  // Accept invitation
  static async acceptInvitation(invitationId: string, userId: string) {
    const Invitation = (await import('../models/Invitation')).default;
    
    const invitation = await Invitation.findById(invitationId)
      .populate('conversationId')
      .populate('invitedBy', 'username avatar');

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.invitedUser.toString() !== userId) {
      throw new AppError('This invitation is not for you', 403);
    }

    if (invitation.status !== 'pending') {
      throw new AppError('This invitation is no longer valid', 400);
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      throw new AppError('This invitation has expired', 400);
    }

    const conversation = await Conversation.findById(invitation.conversationId);

    if (!conversation) {
      throw new AppError('Group not found', 404);
    }

    // Check if already a member
    if (conversation.participants.includes(userId)) {
      throw new AppError('You are already a member of this group', 400);
    }

    // Check capacity
    const maxMembers = conversation.groupSettings?.maxMembers || 500;
    if (conversation.participants.length >= maxMembers) {
      throw new AppError('Group is at maximum capacity', 400);
    }

    // Add user to conversation
    conversation.participants.push(userId);
    conversation.memberJoinDates.set(userId, new Date()); // Set join date for privacy
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Create system message
    const systemMessage = await this.createSystemMessage(
      (conversation._id as any).toString(),
      'member-added',
      `A member joined the group`,
      { userId }
    );

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    // Populate conversation data
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    return {
      conversation: this.formatConversation(populatedConversation!, userId),
      invitation,
      systemMessage,
    };
  }

  // Decline invitation
  static async declineInvitation(invitationId: string, userId: string) {
    const Invitation = (await import('../models/Invitation')).default;
    
    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.invitedUser.toString() !== userId) {
      throw new AppError('This invitation is not for you', 403);
    }

    if (invitation.status !== 'pending') {
      throw new AppError('This invitation is no longer valid', 400);
    }

    invitation.status = 'rejected';
    await invitation.save();

    return invitation;
  }

  // Get user's pending invitations
  static async getPendingInvitations(userId: string) {
    const Invitation = (await import('../models/Invitation')).default;
    
    const invitations = await Invitation.find({
      invitedUser: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('conversationId', 'groupName groupDescription groupType type')
      .populate('invitedBy', 'username avatar');

    return invitations;
  }

  // Get public groups for discovery
  static async getPublicGroups(
    userId: string,
    search?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const query: any = {
      type: 'group',
      groupType: 'public',
      participants: { $ne: userId }, // Exclude groups user is already in
      'groupSettings.isArchived': { $ne: true },
    };

    if (search) {
      query.$or = [
        { groupName: { $regex: search, $options: 'i' } },
        { groupDescription: { $regex: search, $options: 'i' } },
      ];
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('groupAdmin', 'username avatar')
      .select('groupName groupDescription groupType participants lastMessageAt createdAt');

    const total = await Conversation.countDocuments(query);

    return {
      groups: conversations.map((conv) => ({
        id: (conv._id as any).toString(),
        groupName: conv.groupName,
        groupDescription: conv.groupDescription,
        groupType: conv.groupType,
        memberCount: conv.participants.length,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Join public group
  static async joinPublicGroup(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Group not found', 404);
    }

    if (conversation.type !== 'group') {
      throw new AppError('This is not a group conversation', 400);
    }

    if (conversation.groupType !== 'public') {
      throw new AppError('This group is private. You need an invitation to join', 403);
    }

    if (conversation.groupSettings?.isArchived) {
      throw new AppError('This group is archived', 400);
    }

    // Check if already a member
    if (conversation.participants.includes(userId)) {
      throw new AppError('You are already a member of this group', 400);
    }

    // Check capacity
    const maxMembers = conversation.groupSettings?.maxMembers || 500;
    if (conversation.participants.length >= maxMembers) {
      throw new AppError('Group is at maximum capacity', 400);
    }

    // Add user
    conversation.participants.push(userId);
    conversation.memberJoinDates.set(userId, new Date()); // Set join date for privacy
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Create system message
    const systemMessage = await this.createSystemMessage(
      conversationId,
      'member-added',
      `A member joined the group`,
      { userId }
    );

    // Populate and return
    const populatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('groupAdmin', 'username avatar')
      .populate('groupAdmins', 'username avatar');

    return {
      conversation: this.formatConversation(populatedConversation!, userId),
      systemMessage,
    };
  }

  // Helper to format conversation consistently
  private static formatConversation(conv: any, userId: string) {
    const unreadCount = conv.unreadCount.get(userId) || 0;
    
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
      groupDescription: conv.groupDescription,
      groupType: conv.groupType,
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
      groupSettings: conv.groupSettings,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }
}
