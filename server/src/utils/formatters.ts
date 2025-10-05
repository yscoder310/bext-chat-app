/**
 * Utility functions for formatting database models to API responses
 * Reduces code duplication across services
 */

/**
 * Format a conversation document for API response
 */
export const formatConversation = (conv: any, userId: string) => {
  const unreadCount = conv.unreadCount?.get(userId) || 0;

  // Handle legacy groupAdmin field (migrate to groupAdmins array)
  let groupAdmins = conv.groupAdmins || [];
  if (conv.type === 'group' && conv.groupAdmin && groupAdmins.length === 0) {
    groupAdmins = [conv.groupAdmin];
  }

  return {
    id: String(conv._id),
    type: conv.type,
    participants: conv.participants?.map((p: any) => formatUser(p)) || [],
    groupName: conv.groupName,
    groupDescription: conv.groupDescription,
    groupAvatar: conv.groupAvatar,
    isPublic: conv.isPublic,
    groupAdmin: conv.groupAdmin ? formatUser(conv.groupAdmin) : undefined,
    groupAdmins: groupAdmins.map((admin: any) => formatUser(admin)),
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
};

/**
 * Format a user document for API response
 */
export const formatUser = (user: any) => {
  if (!user) return null;
  
  return {
    id: String(user._id || user.id),
    username: user.username,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
  };
};

/**
 * Format a message document for API response
 */
export const formatMessage = (message: any) => {
  return {
    _id: String(message._id),
    conversationId: String(message.conversationId),
    senderId: message.senderId ? (typeof message.senderId === 'string' ? message.senderId : formatUser(message.senderId)) : undefined,
    messageType: message.messageType,
    systemMessageType: message.systemMessageType,
    content: message.content,
    metadata: message.metadata,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileSize: message.fileSize,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    isRead: message.isRead,
    readBy: message.readBy || [],
  };
};

/**
 * Format an invitation document for API response
 */
export const formatInvitation = (invitation: any) => {
  return {
    id: String(invitation._id),
    conversation: invitation.conversation ? formatConversation(invitation.conversation, invitation.invitedUser?._id?.toString()) : undefined,
    invitedBy: formatUser(invitation.invitedBy),
    invitedUser: formatUser(invitation.invitedUser),
    status: invitation.status,
    createdAt: invitation.createdAt,
  };
};

/**
 * Check if user is admin of a group conversation
 */
export const isUserAdmin = (conversation: any, userId: string): boolean => {
  if (conversation.type !== 'group') return false;

  const userIdStr = userId.toString();

  // Check groupAdmins array
  if (conversation.groupAdmins?.some((admin: any) => 
    admin._id?.toString() === userIdStr || admin.toString() === userIdStr
  )) {
    return true;
  }

  // Check legacy groupAdmin field
  if (conversation.groupAdmin) {
    const adminId = typeof conversation.groupAdmin === 'object' 
      ? conversation.groupAdmin._id?.toString()
      : conversation.groupAdmin.toString();
    return adminId === userIdStr;
  }

  return false;
};

/**
 * Check if user is participant in conversation
 */
export const isUserParticipant = (conversation: any, userId: string): boolean => {
  return conversation.participants.some((p: any) => 
    (p._id?.toString() || p.toString()) === userId.toString()
  );
};

/**
 * Get populated conversation query
 * Reusable query builder for consistent population
 */
export const getPopulatedConversationQuery = (query: any) => {
  return query
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
};
