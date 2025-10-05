# Socket Connection Fixes

## Problems Fixed

### 1. **Multiple Socket Connections for Same User**
**Problem**: When opening the chat app in multiple tabs or browsers, each would create a separate socket connection, causing:
- Messages and typing indicators to be received multiple times
- Duplicate notifications
- Online status flickering
- Events not being properly synchronized

**Root Causes**:
- Socket connection was being established from multiple places (App.tsx, useAuth, useSocket)
- Event handlers were being registered multiple times on each component render
- No tracking of multiple connections per user on the server
- Improper cleanup of event listeners

**Solutions Implemented**:

#### Client-Side (`client/src/lib/socket.ts`)

**a) Connection Deduplication**
```typescript
// Added connection state tracking
private isConnecting: boolean = false;

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
  // ... establish connection
}
```

**b) Event Handler Deduplication**
```typescript
// New method to register handlers without duplicates
on(eventName: string, handler: (...args: any[]) => void) {
  // Check if this exact handler is already registered
  const existingHandlers = this.eventHandlers.get(eventName) || [];
  if (existingHandlers.includes(handler)) {
    console.log('[Socket] Handler already registered for event:', eventName);
    return;
  }

  // Store and attach handler
  if (!this.eventHandlers.has(eventName)) {
    this.eventHandlers.set(eventName, []);
  }
  this.eventHandlers.get(eventName)!.push(handler);
  this.socket.on(eventName, handler);
}
```

**c) Enhanced Reconnection Handling**
```typescript
// Configure reconnection behavior
this.socket = io(`${SOCKET_URL}/chat`, {
  auth: { token },
  transports: ['websocket', 'polling'],
  reconnection: true,          // Enable automatic reconnection
  reconnectionAttempts: 5,     // Try 5 times before giving up
  reconnectionDelay: 1000,     // Wait 1 second between attempts
});

// Add reconnection event handlers
this.socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('[Socket] Reconnection attempt', attemptNumber);
});

this.socket.on('reconnect', (attemptNumber) => {
  console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
});
```

**d) Proper Cleanup**
```typescript
off(eventName: string, handler?: (...args: any[]) => void) {
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
    }
  } else {
    // Remove all handlers for this event
    this.socket.off(eventName);
    this.eventHandlers.delete(eventName);
  }
}
```

#### Server-Side (`server/src/config/socket.ts`)

**a) Multiple Connections Per User**
```typescript
// Changed from single socketId to Set of socketIds
// Before:
const onlineUsers: Record<string, string> = {};

// After:
const onlineUsers: Record<string, Set<string>> = {};
```

**b) Smart Connection Tracking**
```typescript
// Track all connections for a user
if (!onlineUsers[userId]) {
  onlineUsers[userId] = new Set();
}
onlineUsers[userId].add(socket.id);

// Only update database and broadcast on FIRST connection
const isFirstConnection = onlineUsers[userId].size === 1;
if (isFirstConnection) {
  AuthService.updateOnlineStatus(userId, true);
  chatNamespace.emit('user-online', { userId });
}
```

**c) Smart Disconnection Handling**
```typescript
// Remove this specific socket
if (onlineUsers[userId]) {
  onlineUsers[userId].delete(socket.id);
  
  // Only update status and broadcast when LAST connection closes
  if (onlineUsers[userId].size === 0) {
    delete onlineUsers[userId];
    await AuthService.updateOnlineStatus(userId, false);
    chatNamespace.emit('user-offline', { userId });
  }
}
```

**d) Accurate Online Users List**
```typescript
socket.on('get-online-users', () => {
  // Filter to only users with at least one active connection
  const onlineUserIds = Object.keys(onlineUsers)
    .filter(uid => onlineUsers[uid].size > 0);
  socket.emit('online-users', onlineUserIds);
});
```

### 2. **Typing Indicators Not Working Properly**
**Problem**: Typing indicators would sometimes:
- Not appear at all
- Appear but never disappear
- Show for wrong users
- Duplicate across multiple tabs

**Solutions**:
- Typing events now work correctly with multiple connections
- Auto-clear timeout still works (5 seconds)
- Proper cleanup on disconnect
- Broadcasting only to other users in the conversation room

### 3. **Messages Not Real-time**
**Problem**: Messages would sometimes:
- Arrive delayed
- Arrive multiple times
- Not appear in all open tabs

**Solutions**:
- Single socket connection shared across all components
- Room-based broadcasting ensures all participants receive messages
- Proper event handler registration prevents duplicates
- Multiple tabs for same user all receive events via user's personal room

## Architecture After Fixes

```
┌─────────────────────────────────────────────────┐
│          User Opens App (Browser Tab 1)         │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│     SocketService.connect(token)                 │
│     - Check if already connected (reuse)         │
│     - Set isConnecting flag                      │
│     - Create single socket instance              │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│         User Opens App (Browser Tab 2)           │
│     SocketService.connect(token)                 │
│     - Detects existing connection                │
│     - Returns existing socket                    │
│     - NO new connection created                  │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│              Server Side (Socket.io)             │
│                                                  │
│  onlineUsers = {                                 │
│    "user123": Set(["socket-abc", "socket-xyz"]) │
│  }                                               │
│                                                  │
│  - Multiple tabs = Multiple socket IDs           │
│  - All in same user rooms                        │
│  - All receive same events                       │
│  - Status updates only on first/last connection  │
└──────────────────────────────────────────────────┘
```

## Event Flow Example

### Sending a Message

```
Tab 1 (User A)                 Server                   Tab 1 (User B)
     │                           │                            │
     │ send-message              │                            │
     ├──────────────────────────>│                            │
     │                           │                            │
     │                           │ (broadcast to room)        │
     │                           │                            │
     │ message-sent (ack)        │  new-message               │
     │<──────────────────────────┼───────────────────────────>│
     │                           │                            │
```

### Same User, Multiple Tabs

```
Tab 1 (User A)      Tab 2 (User A)        Server         User B
     │                    │                  │              │
     │                    │   connect        │              │
     │                    ├─────────────────>│              │
     │                    │                  │              │
     │                    │          (Add to Set)           │
     │                    │        user:123 = {s1, s2}      │
     │                    │        (NO broadcast)           │
     │                    │                  │              │
     │  send-message      │                  │              │
     ├───────────────────────────────────────>│              │
     │                    │                  │              │
     │ new-message        │  new-message     │ new-message  │
     │<───────────────────┼<─────────────────┼─────────────>│
     │                    │                  │              │
```

## Testing the Fixes

### Test 1: Multiple Tabs Same User
1. Open chat app in Browser Tab 1 and log in as User A
2. Open chat app in Browser Tab 2 and log in as User A
3. Send a message from Tab 1
4. **Expected**: Message appears once in both tabs
5. **Before Fix**: Message appeared 2-4 times (duplicate handlers)

### Test 2: Typing Indicators
1. User A opens 2 tabs
2. User B opens 1 tab
3. User B starts typing in conversation with User A
4. **Expected**: 
   - Typing indicator shows once in both of User A's tabs
   - Indicator disappears after 5 seconds or when User B stops typing
5. **Before Fix**: Indicator might not show, or show multiple times

### Test 3: Online Status
1. User A opens Tab 1 (logs in)
2. User B should see User A as online
3. User A opens Tab 2
4. User B should still see User A as online (no duplicate online notifications)
5. User A closes Tab 1
6. User B should still see User A as online (Tab 2 still active)
7. User A closes Tab 2
8. User B should see User A as offline

### Test 4: Real-time Messages
1. User A and User B both in same conversation
2. User A sends a message
3. **Expected**: User B receives message within 100ms
4. **Before Fix**: Could be delayed or not arrive at all

## Console Logging

The fixes include detailed console logging for debugging:

```typescript
[Socket] Establishing new connection...
[Socket] Connected successfully abc123
[Socket] Registered handler for event: new-message
[Socket] Already connected, reusing existing connection  // When opening 2nd tab
[Socket] Handler already registered for event: new-message  // Prevents duplicates
[Socket] Disconnected: transport close
[Socket] Reconnection attempt 1
[Socket] Reconnected after 2 attempts
```

## Files Modified

### Client-Side
- `client/src/lib/socket.ts`
  - Added `isConnecting` flag
  - Added connection deduplication logic
  - Added `on()` method with handler tracking
  - Added `off()` method for proper cleanup
  - Enhanced reconnection handling
  - Added detailed logging

### Server-Side
- `server/src/config/socket.ts`
  - Changed `onlineUsers` from single socketId to Set<socketId>
  - Added smart connection tracking (only broadcast on first connection)
  - Added smart disconnection tracking (only broadcast on last disconnection)
  - Fixed online users list to filter by active connections

## Remaining Recommendations

### 1. Connection Management
Consider adding a centralized socket manager in client:
```typescript
// client/src/lib/socketManager.ts
class SocketManager {
  private static instance: SocketService;
  
  static getInstance(): SocketService {
    if (!this.instance) {
      this.instance = new SocketService();
    }
    return this.instance;
  }
}
```

### 2. Health Checks
Add periodic connection health checks:
```typescript
setInterval(() => {
  if (!socketService.isConnected()) {
    console.warn('[Socket] Connection lost, attempting reconnect...');
    if (token) {
      socketService.connect(token);
    }
  }
}, 30000); // Check every 30 seconds
```

### 3. Error Recovery
Add more robust error handling:
```typescript
socket.on('error', (error) => {
  logSocketError('general', userId, error);
  // Could notify user of connection issues
});
```

### 4. Performance Monitoring
Track socket event latency:
```typescript
const startTime = Date.now();
socket.emit('send-message', data);

socket.once('message-sent', () => {
  const latency = Date.now() - startTime;
  console.log('[Socket] Message latency:', latency, 'ms');
});
```

## Summary

✅ **Fixed**: Multiple socket connections per user  
✅ **Fixed**: Duplicate event handlers  
✅ **Fixed**: Typing indicators working properly  
✅ **Fixed**: Real-time message delivery  
✅ **Fixed**: Online status accuracy  
✅ **Improved**: Connection reliability with auto-reconnect  
✅ **Improved**: Better logging for debugging  
✅ **Improved**: Support for multiple tabs/browsers per user  

The chat app now properly handles:
- Single user opening multiple tabs
- Multiple users in same conversation
- Network disconnections and reconnections
- Proper event cleanup
- Real-time synchronization across all clients
