# Chat Application - Frontend

Real-time chat application frontend built with React, TypeScript, Vite, Mantine UI, Redux Toolkit, TanStack Query, and Socket.io-client.

## 🚀 Features

- **Modern UI**: Built with Mantine UI components
- **Real-time Updates**: WebSocket integration with Socket.io-client
- **State Management**: Redux Toolkit for global state
- **Server State**: TanStack Query for data fetching and caching
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach
- **Optimistic Updates**: Instant UI feedback
- **Authentication**: JWT-based authentication flow
- **Chat Requests**: Send, accept, or reject chat invitations
- **Group Chats**: Create and manage group conversations
- **Typing Indicators**: Real-time typing status
- **Online Status**: See who's online
- **Read Receipts**: Track message read status

## 📁 Project Structure

```
client/
├── src/
│   ├── api/                  # API service layer
│   │   ├── auth.ts
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   └── chatRequests.ts
│   ├── components/           # Reusable components
│   │   ├── ChatArea.tsx
│   │   ├── ConversationList.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── UserListModal.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useSocket.ts
│   │   └── useChatRequests.ts
│   ├── lib/                  # Third-party configurations
│   │   ├── axios.ts          # Axios instance with interceptors
│   │   ├── socket.ts         # Socket.io client service
│   │   └── queryClient.ts    # TanStack Query configuration
│   ├── pages/                # Page components
│   │   ├── ChatPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── store/                # Redux store
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── chatSlice.ts
│   │   │   └── uiSlice.ts
│   │   ├── hooks.ts          # Typed Redux hooks
│   │   └── index.ts
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx               # Main App component
│   ├── main.tsx              # Entry point
│   └── vite-env.d.ts         # Vite environment types
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── postcss.config.cjs
├── .env.example
└── .gitignore
```

## 🛠️ Installation

1. **Navigate to the client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Production Build
```bash
# Build
npm run build

# Preview production build
npm run preview
```

## 🏗️ Architecture

### State Management

**Redux Toolkit Slices:**
- **authSlice**: User authentication state, token management
- **chatSlice**: Conversations, messages, typing indicators, online users
- **uiSlice**: UI state (sidebar, theme, notifications)

### Data Fetching

**TanStack Query:**
- Server state management
- Automatic caching and refetching
- Optimistic updates
- Background data synchronization

### Real-time Communication

**Socket.io Client:**
- WebSocket connection management
- Real-time message delivery
- Typing indicators
- Online/offline status
- Chat request notifications

### HTTP Client

**Axios:**
- Configured with interceptors
- Automatic JWT token attachment
- Error handling
- Request/response transformation

## 🎨 UI Components

### Mantine UI
- Pre-built, accessible components
- Responsive by default
- Customizable theming
- Dark mode support

### Key Components:
- **ChatArea**: Message display and input
- **ConversationList**: List of conversations with search
- **UserListModal**: User search and chat request sending
- **ProtectedRoute**: Route guard for authentication

## 🔐 Authentication Flow

1. User registers/logs in
2. JWT token stored in Redux state (in-memory)
3. Axios interceptor adds token to requests
4. Socket connects with token authentication
5. On logout, state cleared and socket disconnected

## 📡 API Integration

All API calls go through the service layer:
- `authApi`: Authentication endpoints
- `conversationApi`: Conversation management
- `messageApi`: Message operations
- `chatRequestApi`: Chat request handling

## 🪝 Custom Hooks

- **useAuth**: Authentication operations and state
- **useChat**: Chat operations and conversation management
- **useSocket**: WebSocket connection and events
- **useChatRequests**: Chat request operations

## 🎯 Best Practices Implemented

✅ TypeScript for type safety
✅ Component composition
✅ Custom hooks for reusability
✅ Redux Toolkit for predictable state
✅ TanStack Query for server state
✅ Axios interceptors for global behavior
✅ Socket.io service class for encapsulation
✅ Environment variables for configuration
✅ In-memory state (no localStorage)
✅ Protected routes
✅ Error boundaries
✅ Loading states
✅ Optimistic updates
✅ Toast notifications

## 🔄 Real-time Events

**Listening to:**
- `new-message`: New message received
- `user-typing`: User started typing
- `user-stopped-typing`: User stopped typing
- `messages-read`: Messages marked as read
- `user-online`: User came online
- `user-offline`: User went offline
- `new-chat-request`: New chat request received
- `chat-request-accepted`: Chat request accepted

**Emitting:**
- `join-conversation`: Join conversation room
- `leave-conversation`: Leave conversation room
- `send-message`: Send a message
- `typing-start`: Start typing
- `typing-stop`: Stop typing
- `mark-as-read`: Mark messages as read

## 📦 Dependencies

**Core:**
- React 18.2
- TypeScript 5.2
- Vite 5.0

**UI:**
- Mantine UI 7.4
- Tabler Icons 2.44

**State Management:**
- Redux Toolkit 2.0
- React Redux 9.0

**Data Fetching:**
- TanStack Query 5.14
- Axios 1.6

**Real-time:**
- Socket.io Client 4.6

**Routing:**
- React Router DOM 6.21

## 📝 License

MIT
