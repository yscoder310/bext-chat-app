import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Conversation, Message, TypingIndicator } from '../../types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: { [conversationId: string]: Message[] };
  typingUsers: { [conversationId: string]: TypingIndicator[] };
  onlineUsers: string[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  scrollPositions: { [conversationId: string]: number };
  messagePagination: { 
    [conversationId: string]: { 
      page: number; 
      hasMore: boolean;
      isLoadingMore: boolean;
    } 
  };
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  scrollPositions: {},
  messagePagination: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /**
     * Set conversations list
     * - Sorts by last message timestamp (recent first)
     * - Updates online status for all participants
     */
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      // Sort conversations by last message time
      const sortedConversations = [...action.payload].sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });
      
      // Update participant online status based on onlineUsers list
      state.conversations = sortedConversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.map((participant: any) => ({
          ...participant,
          isOnline: state.onlineUsers.includes(participant.id),
        })),
      }));
      
      state.isLoadingConversations = false;
    },
    
    /**
     * Add a new conversation to the list
     * Only adds if it doesn't already exist
     */
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find((c) => c.id === action.payload.id);
      if (!exists) {
        // Set online status for participants before adding
        const conversationWithOnlineStatus = {
          ...action.payload,
          participants: action.payload.participants.map((participant: any) => ({
            ...participant,
            isOnline: state.onlineUsers.includes(participant.id),
          })),
        };
        state.conversations.unshift(conversationWithOnlineStatus);
      }
    },
    
    /**
     * Update an existing conversation
     * - Merges new data with existing conversation
     * - Recalculates participant online status if participants changed
     */
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { id: string }>) => {
      const index = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        // Merge updated fields into existing conversation
        state.conversations[index] = { ...state.conversations[index], ...action.payload };
        
        // Recalculate online status for updated participants
        if (action.payload.participants) {
          state.conversations[index].participants = action.payload.participants.map((participant: any) => ({
            ...participant,
            isOnline: state.onlineUsers.includes(participant.id),
          }));
        }
      }
    },
    
    /**
     * Remove a conversation from the list
     * Also clears it as active conversation if it's currently selected
     */
    removeConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter((c) => c.id !== action.payload);
      
      // Clear active conversation if it's the one being removed
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null;
      }
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
      state.isLoadingMessages = false;
    },
    prependMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      const { conversationId, messages } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      // Prepend older messages to the beginning
      const existingIds = new Set(state.messages[conversationId].map(m => m._id));
      const newMessages = messages.filter(m => !existingIds.has(m._id));
      state.messages[conversationId] = [...newMessages, ...state.messages[conversationId]];
      
      // Note: isLoadingMore is now set to false via setLoadingMoreMessages action
      // Don't set it here to avoid race conditions with scroll behavior
    },
    setScrollPosition: (state, action: PayloadAction<{ conversationId: string; position: number }>) => {
      const { conversationId, position } = action.payload;
      state.scrollPositions[conversationId] = position;
    },
    setPagination: (state, action: PayloadAction<{ 
      conversationId: string; 
      page: number; 
      hasMore: boolean;
    }>) => {
      const { conversationId, page, hasMore } = action.payload;
      state.messagePagination[conversationId] = {
        page,
        hasMore,
        isLoadingMore: false,
      };
    },
    setLoadingMoreMessages: (state, action: PayloadAction<{ conversationId: string; isLoading: boolean }>) => {
      const { conversationId, isLoading } = action.payload;
      if (!state.messagePagination[conversationId]) {
        state.messagePagination[conversationId] = { page: 1, hasMore: true, isLoadingMore: isLoading };
      } else {
        state.messagePagination[conversationId].isLoadingMore = isLoading;
      }
    },
    addMessage: {
      reducer: (state, action: PayloadAction<{ message: Message; currentUserId?: string }>) => {
        const { message, currentUserId } = action.payload;
        const conversationId = message.conversationId;
        
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        
        // Check if message already exists
        const exists = state.messages[conversationId].find((m) => m._id === message._id);
        if (!exists) {
          state.messages[conversationId].push(message);
          
          // Update the conversation's lastMessage and lastMessageAt
          const conversationIndex = state.conversations.findIndex((c) => c.id === conversationId);
          if (conversationIndex !== -1) {
            state.conversations[conversationIndex].lastMessage = message;
            state.conversations[conversationIndex].lastMessageAt = message.createdAt;
            
            // Increment unreadCount if message is from another user and conversation is not active
            if (currentUserId) {
              const senderId = typeof message.senderId === 'string' 
                ? message.senderId 
                : message.senderId?.id;
              
              const isFromOtherUser = senderId !== currentUserId;
              const isNotActiveConversation = state.activeConversationId !== conversationId;
              
              if (isFromOtherUser && isNotActiveConversation) {
                state.conversations[conversationIndex].unreadCount += 1;
              }
            }
            
            // Move this conversation to the top of the list
            const [conversation] = state.conversations.splice(conversationIndex, 1);
            state.conversations.unshift(conversation);
          }
        }
      },
      prepare: (message: Message, currentUserId?: string) => {
        return { payload: { message, currentUserId } };
      },
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const conversationId = action.payload.conversationId;
      if (state.messages[conversationId]) {
        const index = state.messages[conversationId].findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.messages[conversationId][index] = action.payload;
        }
      }
    },
    removeMessage: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      const { conversationId, messageId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(
          (m) => m._id !== messageId
        );
      }
    },
    addTypingUser: (state, action: PayloadAction<TypingIndicator>) => {
      const { conversationId, userId } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      
      const exists = state.typingUsers[conversationId].find((u) => u.userId === userId);
      if (!exists) {
        state.typingUsers[conversationId].push(action.payload);
      }
    },
    removeTypingUser: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (u) => u.userId !== userId
        );
      }
    },
    clearTypingUsers: (state, action: PayloadAction<string>) => {
      // Clear all typing users for a specific conversation
      const conversationId = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
      
      // Update all conversation participants with online status
      state.conversations = state.conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.map((participant: any) => ({
          ...participant,
          isOnline: action.payload.includes(participant.id),
        })),
      }));
    },
    addOnlineUser: (state, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
      
      // Update participant status in all conversations
      state.conversations = state.conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.map((participant: any) => 
          participant.id === action.payload
            ? { ...participant, isOnline: true }
            : participant
        ),
      }));
    },
    removeOnlineUser: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter((id) => id !== action.payload);
      
      // Update participant status in all conversations
      state.conversations = state.conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.map((participant: any) =>
          participant.id === action.payload
            ? { ...participant, isOnline: false, lastSeen: new Date() }
            : participant
        ),
      }));
    },
    markMessagesAsRead: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].map((message) => {
          if (!message.readBy.includes(userId)) {
            return {
              ...message,
              readBy: [...message.readBy, userId],
              isRead: true,
            };
          }
          return message;
        });
      }
      
      // Update conversation unread count
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
    setLoadingConversations: (state, action: PayloadAction<boolean>) => {
      state.isLoadingConversations = action.payload;
    },
    setLoadingMessages: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMessages = action.payload;
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload];
    },
    resetChatState: () => initialState,
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  removeConversation,
  setActiveConversation,
  setMessages,
  prependMessages,
  setScrollPosition,
  setPagination,
  setLoadingMoreMessages,
  addMessage,
  updateMessage,
  removeMessage,
  addTypingUser,
  removeTypingUser,
  clearTypingUsers,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  markMessagesAsRead,
  setLoadingConversations,
  setLoadingMessages,
  clearMessages,
  resetChatState,
} = chatSlice.actions;

export default chatSlice.reducer;
