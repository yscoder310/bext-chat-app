# Real-Time Chat Application

A full-stack, production-ready real-time chat application built with modern technologies.

## 🚀 Tech Stack

### Backend
- **Node.js** & **Express** - Server framework
- **TypeScript** - Type safety
- **MongoDB** & **Mongoose** - Database
- **Socket.io** - Real-time WebSocket communication
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Mantine UI** - Component library
- **Redux Toolkit** - Global state management
- **TanStack Query** - Server state & caching
- **Axios** - HTTP client
- **Socket.io-client** - WebSocket client

## ✨ Features

### Core Features
- ✅ **JWT-based Authentication** with secure password hashing
- ✅ **Role-Based Access Control** (Admin/User roles)
- ✅ **One-to-One Chat** - Private messaging between users
- ✅ **Group Chats** - Create and manage group conversations
- ✅ **Chat Request Flow** - Accept/reject chat invitations before starting conversations
- ✅ **Real-time Updates** - Instant message delivery via WebSockets

### Additional Features
- ✅ **Online/Offline Status** - Real-time user presence
- ✅ **Typing Indicators** - See when users are typing
- ✅ **Read Receipts** - Track message read status
- ✅ **Unread Message Badges** - Visual indicators for unread messages
- ✅ **Message Pagination** - Efficient loading of chat history
- ✅ **User Search** - Find and connect with other users
- ✅ **Responsive Design** - Mobile-first UI
- ✅ **Toast Notifications** - User-friendly alerts
- ✅ **Error Boundaries** - Graceful error handling
- ✅ **Loading States** - Better UX with loading indicators

## 📁 Project Structure

```
bext-chat-app/
├── server/                 # Backend (Node.js, Express, TypeScript)
│   ├── src/
│   │   ├── config/        # Database, Socket.io configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   └── server.ts      # Entry point
│   ├── .env.example       # Environment variables template
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── client/                # Frontend (React, Vite, TypeScript)
    ├── src/
    │   ├── api/          # API service layer
    │   ├── components/   # React components
    │   ├── hooks/        # Custom hooks
    │   ├── lib/          # Third-party configs
    │   ├── pages/        # Page components
    │   ├── store/        # Redux store & slices
    │   ├── types/        # TypeScript types
    │   ├── App.tsx       # Root component
    │   └── main.tsx      # Entry point
    ├── .env.example      # Environment variables template
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── README.md
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd bext-chat-app
```

### 2. Backend Setup

```bash
cd server
npm install

# Copy environment variables
cp .env.example .env

# Configure .env file
# Update MongoDB URI, JWT secret, etc.

# Run in development mode
npm run dev
```

**Backend runs on:** `http://localhost:5000`

### 3. Frontend Setup

```bash
cd client
npm install

# Copy environment variables
cp .env.example .env

# Configure .env file
# Update API URL and Socket URL

# Run in development mode
npm run dev
```

**Frontend runs on:** `http://localhost:5173`

## 🚀 Running the Application

### Development Mode

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

### Production Build

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd client
npm run build
npm run preview
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/users` - Get all users
- `POST /api/auth/logout` - Logout user

### Chat Requests
- `POST /api/chat-requests` - Send chat request
- `GET /api/chat-requests/pending` - Get pending requests
- `GET /api/chat-requests/sent` - Get sent requests
- `PUT /api/chat-requests/:id/accept` - Accept request
- `PUT /api/chat-requests/:id/reject` - Reject request
- `DELETE /api/chat-requests/:id` - Cancel request

### Conversations
- `POST /api/conversations/one-to-one` - Create one-to-one chat
- `POST /api/conversations/group` - Create group chat
- `GET /api/conversations` - Get user's conversations
- `GET /api/conversations/:id` - Get conversation details
- `POST /api/conversations/:id/participants` - Add participant
- `DELETE /api/conversations/:id/participants/:userId` - Remove participant
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages
- `PUT /api/messages/:conversationId/read` - Mark as read
- `DELETE /api/messages/:messageId` - Delete message

## 🔌 WebSocket Events

### Client → Server
- `join-conversation` - Join a chat room
- `leave-conversation` - Leave a chat room
- `send-message` - Send a message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `mark-as-read` - Mark messages as read
- `get-online-users` - Get online users list

### Server → Client
- `new-message` - New message received
- `user-typing` - User started typing
- `user-stopped-typing` - User stopped typing
- `messages-read` - Messages marked as read
- `user-online` - User came online
- `user-offline` - User went offline
- `new-chat-request` - New chat request
- `chat-request-accepted` - Request accepted
- `chat-request-rejected` - Request rejected

## 🏗️ Architecture Highlights

### Backend Best Practices
- ✅ Clean architecture (Controllers → Services → Models)
- ✅ Input validation with express-validator
- ✅ Global error handling middleware
- ✅ JWT authentication middleware
- ✅ Role-based authorization
- ✅ MongoDB indexing for performance
- ✅ Socket.io namespaces for organization
- ✅ Environment-based configuration

### Frontend Best Practices
- ✅ Redux Toolkit for predictable state management
- ✅ TanStack Query for server state & caching
- ✅ Custom hooks for reusable logic
- ✅ Axios interceptors for global behavior
- ✅ Socket.io service class for encapsulation
- ✅ Component composition
- ✅ TypeScript for type safety
- ✅ Mantine UI for consistent design
- ✅ In-memory state (no localStorage)
- ✅ Protected routes
- ✅ Optimistic updates
- ✅ Error boundaries

## 🔐 Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication
- HTTP-only token storage (in-memory, not localStorage)
- CORS configuration
- Helmet.js for security headers
- Input validation and sanitization
- Protected API routes
- Socket.io authentication middleware

## 📝 Environment Variables

### Server (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🧪 Testing

To test the application:

1. Register multiple user accounts
2. Send chat requests between users
3. Accept/reject requests
4. Start one-to-one conversations
5. Create group chats
6. Test real-time messaging
7. Test typing indicators
8. Test online/offline status
9. Test read receipts
10. Test on mobile devices

## 📚 Documentation

- [Server README](./server/README.md) - Detailed backend documentation
- [Client README](./client/README.md) - Detailed frontend documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

Built with ❤️ by your development team

## 🙏 Acknowledgments

- Mantine UI for the beautiful components
- TanStack Query for excellent data fetching
- Redux Toolkit for simplified state management
- Socket.io for real-time communication
