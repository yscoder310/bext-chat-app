import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();
  private isConnecting: boolean = false;

  /**
   * Establish socket connection with authentication token
   * Automatically reconnects on disconnect and reattaches event handlers
   */
  connect(token: string) {
    // Prevent duplicate connections
    if (this.socket?.connected) {
      console.log('[Socket] Already connected, reusing existing connection');
      return this.socket;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('[Socket] Connection attempt already in progress');
      return this.socket;
    }

    this.isConnecting = true;

    console.log('[Socket] Establishing new connection...');

    // Create socket connection to chat namespace
    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle successful connection
    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully', this.socket?.id);
      this.isConnecting = false;
      
      // Request initial online users list
      this.getOnlineUsers();
    });

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.isConnecting = false;
    });

    // Handle disconnection (log for debugging critical issues)
    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnecting = false;
      
      // Only log unexpected disconnections, not intentional ones
      if (reason !== 'io client disconnect') {
        console.warn('[Socket] Unexpected disconnection:', reason);
      }
    });

    // Handle reconnection attempts
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt', attemptNumber);
    });

    // Handle successful reconnection
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    return this.socket;
  }

  /**
   * Register an event handler
   * Prevents duplicate handlers by checking if already registered
   */
  on(eventName: string, handler: (...args: any[]) => void) {
    if (!this.socket) {
      console.warn('[Socket] Cannot register handler, socket not initialized');
      return;
    }

    // Check if this exact handler is already registered
    const existingHandlers = this.eventHandlers.get(eventName) || [];
    if (existingHandlers.includes(handler)) {
      console.log('[Socket] Handler already registered for event:', eventName);
      return;
    }

    // Store handler reference
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
    
    // Attach to socket
    this.socket.on(eventName, handler);
    console.log('[Socket] Registered handler for event:', eventName);
  }

  /**
   * Remove a specific event handler
   */
  off(eventName: string, handler?: (...args: any[]) => void) {
    if (!this.socket) return;

    if (handler) {
      // Remove specific handler
      this.socket.off(eventName, handler);
      
      // Remove from our tracking
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.eventHandlers.delete(eventName);
        }
      }
    } else {
      // Remove all handlers for this event
      this.socket.off(eventName);
      this.eventHandlers.delete(eventName);
    }
    
    console.log('[Socket] Removed handler(s) for event:', eventName);
  }

  /**
   * Disconnect from socket and cleanup all resources
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      
      // Remove all event listeners
      this.socket.removeAllListeners();
      
      // Disconnect the socket
      this.socket.disconnect();
      
      // Clear references
      this.socket = null;
      this.eventHandlers.clear();
      this.isConnecting = false;
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
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot join conversation, not connected');
      return;
    }
    console.log('[Socket] Joining conversation:', conversationId);
    this.socket.emit('join-conversation', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot leave conversation, not connected');
      return;
    }
    console.log('[Socket] Leaving conversation:', conversationId);
    this.socket.emit('leave-conversation', conversationId);
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
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot send typing event, not connected');
      return;
    }
    console.log('[Socket] Start typing in conversation:', conversationId);
    this.socket.emit('typing-start', { conversationId });
  }

  /**
   * Notify other users that current user stopped typing
   */
  stopTyping(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot send stop typing event, not connected');
      return;
    }
    console.log('[Socket] Stop typing in conversation:', conversationId);
    this.socket.emit('typing-stop', { conversationId });
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
    this.on('new-message', callback);
  }

  /** Listen for message sent confirmation */
  onMessageSent(callback: (data: any) => void) {
    this.on('message-sent', callback);
  }

  /** Listen for message sending errors */
  onMessageError(callback: (error: any) => void) {
    const handler = (error: any) => {
      console.error('Message send error:', error);
      callback(error);
    };
    this.on('message-error', handler);
  }

  /** Listen for user typing events */
  onUserTyping(callback: (data: any) => void) {
    this.on('user-typing', callback);
  }

  /** Listen for user stopped typing events */
  onUserStoppedTyping(callback: (data: any) => void) {
    this.on('user-stopped-typing', callback);
  }

  /** Listen for messages read receipts */
  onMessagesRead(callback: (data: any) => void) {
    this.on('messages-read', callback);
  }

  /** Listen for user coming online */
  onUserOnline(callback: (data: any) => void) {
    this.on('user-online', callback);
  }

  /** Listen for user going offline */
  onUserOffline(callback: (data: any) => void) {
    this.on('user-offline', callback);
  }

  /** Listen for online users list */
  onOnlineUsers(callback: (users: string[]) => void) {
    this.on('online-users', callback);
  }

  /** Listen for new chat requests */
  onNewChatRequest(callback: (request: any) => void) {
    this.on('new-chat-request', callback);
  }

  /** Listen for accepted chat requests */
  onChatRequestAccepted(callback: (conversation: any) => void) {
    this.on('chat-request-accepted', callback);
  }

  /** Listen for rejected chat requests */
  onChatRequestRejected(callback: () => void) {
    this.on('chat-request-rejected', callback);
  }

  /** Listen for new group creation */
  onGroupCreated(callback: (conversation: any) => void) {
    this.on('group-created', callback);
  }

  /** Listen for group updates (name, members, admins, etc.) */
  onGroupUpdated(callback: (conversation: any) => void) {
    this.on('group-updated', callback);
  }

  /** Listen for conversation refresh signal */
  onConversationRefresh(callback: (data: { conversationId: string; action: string }) => void) {
    this.on('conversation-refresh', callback);
  }

  /** Listen for member leaving group */
  onMemberLeft(callback: (data: { conversationId: string; userId: string }) => void) {
    this.on('member-left', callback);
  }

  /** Listen for conversation removal (user left group) */
  onConversationRemoved(callback: (data: { conversationId: string }) => void) {
    this.on('conversation-removed', callback);
  }

  /** Listen for group invitations */
  onGroupInvitation(callback: (invitation: any) => void) {
    this.on('group-invitation', callback);
  }

  /** Listen for invitations sent confirmation */
  onInvitationsSent(callback: (data: { count: number }) => void) {
    this.on('invitations-sent', callback);
  }

  /** Listen for accepted invitation (user joined group) */
  onInvitationAccepted(callback: (conversation: any) => void) {
    this.on('invitation-accepted', callback);
  }

  /** Listen for declined invitation */
  onInvitationDeclined(callback: (data: { invitationId: string }) => void) {
    this.on('invitation-declined', callback);
  }

  /** Listen for member joining group */
  onMemberJoined(callback: (data: { conversationId: string; member: any }) => void) {
    this.on('member-joined', callback);
  }

  // ===== Remove Event Listeners =====

  offNewMessage(handler?: (...args: any[]) => void) {
    this.off('new-message', handler);
  }

  offUserTyping(handler?: (...args: any[]) => void) {
    this.off('user-typing', handler);
  }

  offUserStoppedTyping(handler?: (...args: any[]) => void) {
    this.off('user-stopped-typing', handler);
  }

  offMessagesRead(handler?: (...args: any[]) => void) {
    this.off('messages-read', handler);
  }

  offUserOnline(handler?: (...args: any[]) => void) {
    this.off('user-online', handler);
  }

  offUserOffline(handler?: (...args: any[]) => void) {
    this.off('user-offline', handler);
  }
}

export const socketService = new SocketService();
