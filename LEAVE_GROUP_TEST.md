# Leave Group Feature - Testing Guide

## 🔧 Setup

1. **Backend is already running** ✅
   - Server running on port 4000
   - MongoDB connected
   
2. **Start Frontend:**
   ```bash
   cd client && npm run dev
   ```

## 📝 Test Scenario

### Users:
- **User A** (68e0e9230b33868cc90c91b8) - Will leave the group
- **User B** (68e0ffccd7d1d133fa62f5cd) - Will stay in the group
- **User C** (Optional: another user) - Will stay in the group

### Steps:

1. **Open 3 browser windows:**
   - Window 1: User A (Incognito/Private)
   - Window 2: User B (Regular)
   - Window 3: User C (Another Incognito) - Optional

2. **Create a group:**
   - User A creates a group and adds Users B (and C)
   - All users should see the group in their chat list

3. **User A leaves the group:**
   - User A clicks "Leave Group" option
   - **OPEN BROWSER CONSOLE** for all windows (F12 or Cmd+Option+I)

## ✅ Expected Results

### For User A (Leaving User):
- ✅ Group **DISAPPEARS** from chat list immediately
- ✅ Success notification: "You have left the group"
- ✅ If viewing that group, redirected away

### For User B & C (Remaining Members):
- ✅ Group **STAYS VISIBLE** in their chat list
- ✅ Group shows one less member
- ✅ Can still send/receive messages in the group

## 🔍 What to Check in Console Logs

### Backend Console (Terminal):
Look for these logs when User A leaves:
```
📡 User 68e0e9230b33868cc90c91b8 left group <conversationId>, broadcasting to others
🚪 User 68e0e9230b33868cc90c91b8 socket <socketId> removed from room conversation:<conversationId>
🚪 Removed 1 socket(s) for user 68e0e9230b33868cc90c91b8 from room conversation:<conversationId>
✅ Emitted conversation-refresh to remaining members in room: conversation:<conversationId>
📤 Sent conversation-removed to leaving user: 68e0e9230b33868cc90c91b8 (to their personal room)
```

### User A Console (Browser - Leaving):
```
============================================================
🗑️ [SOCKET] CONVERSATION-REMOVED EVENT RECEIVED
🗑️ [SOCKET] Conversation ID: <conversationId>
🗑️ [SOCKET] Current user: <User A username> <User A ID>
============================================================
```

### User B & C Consoles (Browser - Staying):
```
============================================================
🔄 [SOCKET] CONVERSATION-REFRESH EVENT RECEIVED
🔄 [SOCKET] Data: {conversationId: "...", action: "member-left", userId: "..."}
🔄 [SOCKET] Current user: <User B username> <User B ID>
🔄 [SOCKET] This user should STAY in the group
============================================================
```

## ❌ If It's NOT Working

### Problem: Group disappears for ALL users
**Check:**
1. Are you seeing `conversation-removed` events on Users B & C? (SHOULD NOT)
2. Are you seeing `conversation-refresh` events on User A? (SHOULD NOT)
3. Backend logs: Did User A's socket actually leave the room?

### Problem: Group stays visible for User A
**Check:**
1. Did User A receive the `conversation-removed` event?
2. Is the `onConversationRemoved` handler registered?
3. Check Redux state - is the conversation still there?

### Problem: No events received at all
**Check:**
1. Are sockets connected? Look for "✅ Socket connected" in browser console
2. Did users join the conversation room? Look for "Joining conversation" logs
3. Is the backend emitting to the correct room name?

## 🐛 Debug Commands

### Check socket rooms on backend:
Add this temporarily to your code:
```typescript
console.log('All rooms:', Array.from(chatNamespace.adapter.rooms.keys()));
console.log('Sockets in conversation room:', chatNamespace.adapter.rooms.get(roomName));
```

### Check Redux state in browser:
```javascript
// In browser console
window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__.get()
```

## 🔄 How It Works (Technical)

1. **User A clicks "Leave Group"**
   - Frontend calls API: `POST /api/conversations/:id/leave`

2. **Backend processes leave:**
   - Removes User A from database participants array
   - Finds all of User A's connected sockets
   - Calls `socket.leave('conversation:xyz')` on each socket
   - Emits `conversation-refresh` to room (User A not in room anymore)
   - Emits `conversation-removed` to User A's personal room `user:userId`

3. **User A (leaving) receives:**
   - `conversation-removed` event
   - Removes conversation from Redux immediately
   - Refetches conversations (server won't return it)
   - Group disappears ✅

4. **Users B & C (staying) receive:**
   - `conversation-refresh` event
   - Refetch conversations from server
   - Server returns group (with updated participants)
   - Group stays visible ✅

## 📊 Key Differences from Previous Implementation

| Aspect | Old (Broken) | New (Fixed) |
|--------|-------------|-------------|
| Socket room management | User stayed in room | User leaves room BEFORE emit |
| Event for leaving user | Same as others | Separate `conversation-removed` event |
| Event for staying users | `conversation-refresh` | Same, but they won't see leaving user's event |
| Multiple tabs/sockets | Only removed one socket | Removes ALL user's sockets from room |
| Personal room usage | Not used | Uses `user:userId` for direct communication |

## ✨ Success Criteria

- [ ] User A's group disappears immediately
- [ ] Users B & C's group stays visible
- [ ] No errors in any console
- [ ] Backend logs show correct socket removal
- [ ] All expected events received by correct users
- [ ] Works with multiple tabs open per user

---

**If everything works:** Congrats! The Socket.io room management is working correctly! 🎉

**If issues persist:** Share the console logs (both backend and browser) and describe exactly what you're seeing.
