import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.token = token;

    console.log('Creating socket connection to:', `${SOCKET_URL}/chat`);

    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully! Socket ID:', this.socket?.id);
      // Re-attach all event handlers after reconnection
      this.reattachEventHandlers();
      
      // Request online users list immediately after connecting
      console.log('🔄 Requesting online users list...');
      this.getOnlineUsers();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Attach any previously registered handlers
    this.reattachEventHandlers();

    return this.socket;
  }

  private reattachEventHandlers() {
    if (!this.socket) return;
    
    console.log('Reattaching event handlers...');
    this.eventHandlers.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        this.socket?.on(eventName, handler);
      });
    });
  }

  private registerHandler(eventName: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
    
    console.log(`📝 Registering handler for event: ${eventName}, socket connected: ${!!this.socket}`);
    
    // Attach to socket if already connected
    if (this.socket) {
      console.log(`✅ Attaching ${eventName} handler to socket`);
      this.socket.on(eventName, handler);
    } else {
      console.warn(`⚠️ Socket not connected yet, ${eventName} handler will be attached on connect`);
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      
      // Remove all event listeners
      this.socket.removeAllListeners();
      
      // Disconnect the socket
      this.socket.disconnect();
      
      // Clear references
      this.socket = null;
      this.token = null;
      this.eventHandlers.clear();
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Event emitters
  joinConversation(conversationId: string) {
    console.log('Joining conversation:', conversationId);
    this.socket?.emit('join-conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    console.log('Leaving conversation:', conversationId);
    this.socket?.emit('leave-conversation', conversationId);
  }

  sendMessage(data: {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
  }) {
    console.log('Sending message:', data);
    this.socket?.emit('send-message', data);
  }

  startTyping(conversationId: string) {
    console.log('Start typing:', conversationId);
    this.socket?.emit('typing-start', { conversationId });
  }

  stopTyping(conversationId: string) {
    console.log('Stop typing:', conversationId);
    this.socket?.emit('typing-stop', { conversationId });
  }

  markAsRead(conversationId: string) {
    this.socket?.emit('mark-as-read', { conversationId });
  }

  getOnlineUsers() {
    if (this.socket?.connected) {
      console.log('📤 Emitting get-online-users request');
      this.socket.emit('get-online-users');
    } else {
      console.warn('⚠️ Cannot get online users - socket not connected');
    }
  }

  // Invitation System
  inviteToGroup(conversationId: string, userIds: string[]) {
    console.log('Inviting users to group:', { conversationId, userIds });
    this.socket?.emit('invite-to-group', { conversationId, userIds });
  }

  acceptInvitation(invitationId: string) {
    console.log('Accepting invitation:', invitationId);
    this.socket?.emit('accept-invitation', { invitationId });
  }

  declineInvitation(invitationId: string) {
    console.log('Declining invitation:', invitationId);
    this.socket?.emit('decline-invitation', { invitationId });
  }

  // Event listeners
  onNewMessage(callback: (message: any) => void) {
    const handler = (message: any) => {
      console.log('📨 Received new-message event:', message);
      callback(message);
    };
    this.registerHandler('new-message', handler);
  }

  onMessageSent(callback: (data: any) => void) {
    const handler = (data: any) => {
      console.log('✅ Received message-sent event:', data);
      callback(data);
    };
    this.registerHandler('message-sent', handler);
  }

  onMessageError(callback: (error: any) => void) {
    const handler = (error: any) => {
      console.error('❌ Received message-error event:', error);
      callback(error);
    };
    this.registerHandler('message-error', handler);
  }

  onUserTyping(callback: (data: any) => void) {
    const handler = (data: any) => {
      console.log('⌨️ Received user-typing event:', data);
      callback(data);
    };
    this.registerHandler('user-typing', handler);
  }

  onUserStoppedTyping(callback: (data: any) => void) {
    const handler = (data: any) => {
      console.log('🛑 Received user-stopped-typing event:', data);
      callback(data);
    };
    this.registerHandler('user-stopped-typing', handler);
  }

  onMessagesRead(callback: (data: any) => void) {
    this.registerHandler('messages-read', callback);
  }

  onUserOnline(callback: (data: any) => void) {
    const handler = (data: any) => {
      console.log('🟢 User online:', data);
      callback(data);
    };
    this.registerHandler('user-online', handler);
  }

  onUserOffline(callback: (data: any) => void) {
    const handler = (data: any) => {
      console.log('⚫ User offline:', data);
      callback(data);
    };
    this.registerHandler('user-offline', handler);
  }

  onOnlineUsers(callback: (users: string[]) => void) {
    const handler = (users: string[]) => {
      console.log('👥 Online users:', users);
      callback(users);
    };
    this.registerHandler('online-users', handler);
  }

  onNewChatRequest(callback: (request: any) => void) {
    this.registerHandler('new-chat-request', callback);
  }

  onChatRequestAccepted(callback: (conversation: any) => void) {
    this.registerHandler('chat-request-accepted', callback);
  }

  onChatRequestRejected(callback: () => void) {
    this.registerHandler('chat-request-rejected', callback);
  }

  onGroupCreated(callback: (conversation: any) => void) {
    const handler = (conversation: any) => {
      console.log('👥 Group created:', conversation);
      callback(conversation);
    };
    this.registerHandler('group-created', handler);
  }

  onGroupUpdated(callback: (conversation: any) => void) {
    const handler = (conversation: any) => {
      console.log('✏️ Group updated:', conversation);
      callback(conversation);
    };
    console.log('📝 Registering handler for group-updated event');
    this.registerHandler('group-updated', handler);
  }

  onConversationRefresh(callback: (data: { conversationId: string; action: string }) => void) {
    const handler = (data: { conversationId: string; action: string }) => {
      console.log('🔄 Conversation refresh signal received:', data);
      callback(data);
    };
    console.log('📝 Registering handler for conversation-refresh event');
    this.registerHandler('conversation-refresh', handler);
  }

  onMemberLeft(callback: (data: { conversationId: string; userId: string }) => void) {
    const handler = (data: { conversationId: string; userId: string }) => {
      console.log('👋 Member left group:', data);
      callback(data);
    };
    this.registerHandler('member-left', handler);
  }

  onConversationRemoved(callback: (data: { conversationId: string }) => void) {
    const handler = (data: { conversationId: string }) => {
      console.log('🗑️ Conversation removed (you left):', data);
      callback(data);
    };
    console.log('📝 Registering handler for conversation-removed event');
    this.registerHandler('conversation-removed', handler);
  }

  onGroupInvitation(callback: (invitation: any) => void) {
    const handler = (invitation: any) => {
      console.log('📬 Received group invitation:', invitation);
      callback(invitation);
    };
    this.registerHandler('group-invitation', handler);
  }

  onInvitationsSent(callback: (data: { count: number }) => void) {
    const handler = (data: { count: number }) => {
      console.log('✅ Invitations sent:', data);
      callback(data);
    };
    this.registerHandler('invitations-sent', handler);
  }

  onInvitationAccepted(callback: (conversation: any) => void) {
    const handler = (conversation: any) => {
      console.log('✅ Invitation accepted, joined group:', conversation);
      callback(conversation);
    };
    this.registerHandler('invitation-accepted', handler);
  }

  onInvitationDeclined(callback: (data: { invitationId: string }) => void) {
    const handler = (data: { invitationId: string }) => {
      console.log('❌ Invitation declined:', data);
      callback(data);
    };
    this.registerHandler('invitation-declined', handler);
  }

  onMemberJoined(callback: (data: { conversationId: string; member: any }) => void) {
    const handler = (data: { conversationId: string; member: any }) => {
      console.log('👤 Member joined group:', data);
      callback(data);
    };
    this.registerHandler('member-joined', handler);
  }

  // Remove event listeners
  offNewMessage() {
    this.socket?.off('new-message');
  }

  offUserTyping() {
    this.socket?.off('user-typing');
  }

  offUserStoppedTyping() {
    this.socket?.off('user-stopped-typing');
  }

  offMessagesRead() {
    this.socket?.off('messages-read');
  }

  offUserOnline() {
    this.socket?.off('user-online');
  }

  offUserOffline() {
    this.socket?.off('user-offline');
  }
}

export const socketService = new SocketService();
