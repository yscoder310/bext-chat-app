import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();

  /**
   * Establish socket connection with authentication token
   * Automatically reconnects on disconnect and reattaches event handlers
   */
  connect(token: string) {
    // Prevent duplicate connections
    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = token;

    // Create socket connection to chat namespace
    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    // Handle successful connection
    this.socket.on('connect', () => {
      // Reattach all event handlers after reconnection
      this.reattachEventHandlers();
      
      // Request initial online users list
      this.getOnlineUsers();
    });

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Handle disconnection (log for debugging critical issues)
    this.socket.on('disconnect', (reason) => {
      // Only log unexpected disconnections, not intentional ones
      if (reason !== 'io client disconnect') {
        console.error('Socket disconnected:', reason);
      }
    });

    // Attach any previously registered handlers
    this.reattachEventHandlers();

    return this.socket;
  }

  /**
   * Reattach all registered event handlers
   * Called after reconnection to restore event listeners
   */
  private reattachEventHandlers() {
    if (!this.socket) return;
    
    // Iterate through stored handlers and reattach them to socket
    this.eventHandlers.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        this.socket?.on(eventName, handler);
      });
    });
  }

  /**
   * Register an event handler and store it for reconnection
   * Automatically attaches handler if socket is already connected
   */
  private registerHandler(eventName: string, handler: (...args: any[]) => void) {
    // Store handler for reconnection scenarios
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
    
    // Attach to socket immediately if connected
    if (this.socket) {
      this.socket.on(eventName, handler);
    }
  }

  /**
   * Disconnect from socket and cleanup all resources
   */
  disconnect() {
    if (this.socket) {
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

  // ===== Event Emitters =====

  /**
   * Join a conversation room to receive real-time updates
   */
  joinConversation(conversationId: string) {
    this.socket?.emit('join-conversation', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    this.socket?.emit('leave-conversation', conversationId);
  }

  /**
   * Send a message to a conversation
   */
  sendMessage(data: {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
  }) {
    this.socket?.emit('send-message', data);
  }

  /**
   * Notify other users that current user is typing
   */
  startTyping(conversationId: string) {
    this.socket?.emit('typing-start', { conversationId });
  }

  /**
   * Notify other users that current user stopped typing
   */
  stopTyping(conversationId: string) {
    this.socket?.emit('typing-stop', { conversationId });
  }

  /**
   * Mark messages as read in a conversation
   */
  markAsRead(conversationId: string) {
    this.socket?.emit('mark-as-read', { conversationId });
  }

  /**
   * Request list of currently online users
   */
  getOnlineUsers() {
    if (this.socket?.connected) {
      this.socket.emit('get-online-users');
    }
  }

  // ===== Invitation System =====

  /**
   * Invite users to join a group conversation
   */
  inviteToGroup(conversationId: string, userIds: string[]) {
    this.socket?.emit('invite-to-group', { conversationId, userIds });
  }

  /**
   * Accept a group invitation
   */
  acceptInvitation(invitationId: string) {
    this.socket?.emit('accept-invitation', { invitationId });
  }

  /**
   * Decline a group invitation
   */
  declineInvitation(invitationId: string) {
    this.socket?.emit('decline-invitation', { invitationId });
  }

  // ===== Event Listeners =====
  // These methods register callbacks for incoming socket events

  /** Listen for new messages */
  onNewMessage(callback: (message: any) => void) {
    this.registerHandler('new-message', callback);
  }

  /** Listen for message sent confirmation */
  onMessageSent(callback: (data: any) => void) {
    this.registerHandler('message-sent', callback);
  }

  /** Listen for message sending errors */
  onMessageError(callback: (error: any) => void) {
    const handler = (error: any) => {
      console.error('Message send error:', error);
      callback(error);
    };
    this.registerHandler('message-error', handler);
  }

  /** Listen for user typing events */
  onUserTyping(callback: (data: any) => void) {
    this.registerHandler('user-typing', callback);
  }

  /** Listen for user stopped typing events */
  onUserStoppedTyping(callback: (data: any) => void) {
    this.registerHandler('user-stopped-typing', callback);
  }

  /** Listen for messages read receipts */
  onMessagesRead(callback: (data: any) => void) {
    this.registerHandler('messages-read', callback);
  }

  /** Listen for user coming online */
  onUserOnline(callback: (data: any) => void) {
    this.registerHandler('user-online', callback);
  }

  /** Listen for user going offline */
  onUserOffline(callback: (data: any) => void) {
    this.registerHandler('user-offline', callback);
  }

  /** Listen for online users list */
  onOnlineUsers(callback: (users: string[]) => void) {
    this.registerHandler('online-users', callback);
  }

  /** Listen for new chat requests */
  onNewChatRequest(callback: (request: any) => void) {
    this.registerHandler('new-chat-request', callback);
  }

  /** Listen for accepted chat requests */
  onChatRequestAccepted(callback: (conversation: any) => void) {
    this.registerHandler('chat-request-accepted', callback);
  }

  /** Listen for rejected chat requests */
  onChatRequestRejected(callback: () => void) {
    this.registerHandler('chat-request-rejected', callback);
  }

  /** Listen for new group creation */
  onGroupCreated(callback: (conversation: any) => void) {
    this.registerHandler('group-created', callback);
  }

  /** Listen for group updates (name, members, admins, etc.) */
  onGroupUpdated(callback: (conversation: any) => void) {
    this.registerHandler('group-updated', callback);
  }

  /** Listen for conversation refresh signal */
  onConversationRefresh(callback: (data: { conversationId: string; action: string }) => void) {
    this.registerHandler('conversation-refresh', callback);
  }

  /** Listen for member leaving group */
  onMemberLeft(callback: (data: { conversationId: string; userId: string }) => void) {
    this.registerHandler('member-left', callback);
  }

  /** Listen for conversation removal (user left group) */
  onConversationRemoved(callback: (data: { conversationId: string }) => void) {
    this.registerHandler('conversation-removed', callback);
  }

  /** Listen for group invitations */
  onGroupInvitation(callback: (invitation: any) => void) {
    this.registerHandler('group-invitation', callback);
  }

  /** Listen for invitations sent confirmation */
  onInvitationsSent(callback: (data: { count: number }) => void) {
    this.registerHandler('invitations-sent', callback);
  }

  /** Listen for accepted invitation (user joined group) */
  onInvitationAccepted(callback: (conversation: any) => void) {
    this.registerHandler('invitation-accepted', callback);
  }

  /** Listen for declined invitation */
  onInvitationDeclined(callback: (data: { invitationId: string }) => void) {
    this.registerHandler('invitation-declined', callback);
  }

  /** Listen for member joining group */
  onMemberJoined(callback: (data: { conversationId: string; member: any }) => void) {
    this.registerHandler('member-joined', callback);
  }

  // ===== Remove Event Listeners =====

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
