# Chat Application - Backend

Real-time chat application backend built with Node.js, Express, TypeScript, MongoDB, and Socket.io.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Real-time Messaging**: WebSocket-based instant messaging using Socket.io
- **One-to-One Chat**: Private conversations between users
- **Group Chat**: Create and manage group conversations
- **Chat Requests**: Accept/reject mechanism before starting conversations
- **Online Status**: Real-time online/offline user status
- **Typing Indicators**: See when other users are typing
- **Message Read Receipts**: Track message read status
- **Secure**: Password hashing with bcrypt, input validation, and error handling

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.ts      # MongoDB connection
│   │   └── socket.ts        # Socket.io configuration
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── chatRequestController.ts
│   │   ├── conversationController.ts
│   │   └── messageController.ts
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication
│   │   ├── errorHandler.ts  # Global error handling
│   │   └── validators.ts    # Input validation
│   ├── models/
│   │   ├── User.ts
│   │   ├── Message.ts
│   │   ├── Conversation.ts
│   │   └── ChatRequest.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── chatRequestRoutes.ts
│   │   ├── conversationRoutes.ts
│   │   ├── messageRoutes.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── chatRequestService.ts
│   │   ├── conversationService.ts
│   │   └── messageService.ts
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   └── server.ts            # Entry point
├── .env.example
├── .gitignore
├── nodemon.json
├── package.json
└── tsconfig.json
```

## 🛠️ Installation

1. **Navigate to the server directory:**
   ```bash
   cd server
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
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/chat-app
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   ```

5. **Make sure MongoDB is running:**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas connection string in .env
   ```

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Build
npm run build

# Start
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `GET /api/auth/users` - Get all users (protected)
- `POST /api/auth/logout` - Logout user (protected)

### Chat Requests
- `POST /api/chat-requests` - Send chat request
- `GET /api/chat-requests/pending` - Get pending requests
- `GET /api/chat-requests/sent` - Get sent requests
- `PUT /api/chat-requests/:requestId/accept` - Accept request
- `PUT /api/chat-requests/:requestId/reject` - Reject request
- `DELETE /api/chat-requests/:requestId` - Cancel request

### Conversations
- `POST /api/conversations/one-to-one` - Create one-to-one conversation
- `POST /api/conversations/group` - Create group conversation
- `GET /api/conversations` - Get user's conversations
- `GET /api/conversations/:conversationId` - Get conversation details
- `POST /api/conversations/:conversationId/participants` - Add participant to group
- `DELETE /api/conversations/:conversationId/participants/:participantId` - Remove participant
- `DELETE /api/conversations/:conversationId` - Delete conversation

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages (with pagination)
- `PUT /api/messages/:conversationId/read` - Mark messages as read
- `DELETE /api/messages/:messageId` - Delete message

### Health Check
- `GET /api/health` - Server health check

## 🔌 Socket.io Events

### Client → Server

- `join-conversation` - Join a conversation room
- `leave-conversation` - Leave a conversation room
- `send-message` - Send a new message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `mark-as-read` - Mark messages as read
- `chat-request-sent` - Notify about sent chat request
- `chat-request-accepted` - Notify about accepted request
- `chat-request-rejected` - Notify about rejected request
- `get-online-users` - Get list of online users

### Server → Client

- `new-message` - New message received
- `message-sent` - Message sent confirmation
- `message-error` - Message sending error
- `user-typing` - User started typing
- `user-stopped-typing` - User stopped typing
- `messages-read` - Messages marked as read
- `new-chat-request` - New chat request received
- `chat-request-accepted` - Chat request accepted
- `chat-request-rejected` - Chat request rejected
- `user-online` - User came online
- `user-offline` - User went offline
- `online-users` - List of online users

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database Models

### User
- username, email, password
- role (user/admin)
- avatar, isOnline, lastSeen
- Indexes on email, username, isOnline

### Message
- conversationId, senderId, content
- messageType (text/image/file)
- isRead, readBy[]
- Indexes on conversationId, senderId

### Conversation
- type (one-to-one/group)
- participants[], groupName, groupAdmin
- lastMessage, lastMessageAt
- unreadCount (Map)
- Indexes on participants, type, lastMessageAt

### ChatRequest
- senderId, receiverId
- status (pending/accepted/rejected)
- message (optional)
- Unique index on [senderId, receiverId, status=pending]

## 🏗️ Architecture

### Clean Architecture Layers:

1. **Routes**: Handle HTTP requests and route to controllers
2. **Controllers**: Handle request/response, validate input
3. **Services**: Business logic layer
4. **Models**: Database schemas and validation
5. **Middleware**: Authentication, validation, error handling

### Best Practices:

- ✅ TypeScript for type safety
- ✅ Async/await for asynchronous operations
- ✅ Error handling with custom error classes
- ✅ Input validation with express-validator
- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ MongoDB indexing for performance
- ✅ Socket.io namespaces for organization
- ✅ Environment variables for configuration
- ✅ CORS and Helmet for security

## 📝 License

MIT
