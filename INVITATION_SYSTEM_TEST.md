# Invitation System Testing Guide

## Overview
The invitation system has been fully integrated into the existing Conversation model. Groups and rooms are now unified - every group can have invitations, be public/private, and support enhanced member management.

## Backend Completed ✅

### Enhanced Models
1. **Conversation Model** - Enhanced with:
   - `groupDescription`: String (max 500 chars)
   - `groupType`: 'private' | 'public' (default: 'private')
   - `groupSettings`: 
     - `maxMembers`: Number (default: 500)
     - `allowMemberInvites`: Boolean (default: false)
     - `isArchived`: Boolean (default: false)

2. **Invitation Model** - New model:
   - `conversationId`: References Conversation
   - `invitedBy`: User who sent invitation
   - `invitedUser`: User being invited
   - `status`: 'pending' | 'accepted' | 'declined'
   - `expiresAt`: Date (7 days from creation)

### New REST API Endpoints

#### 1. Get Pending Invitations
```
GET /api/conversations/invitations/pending
Authorization: Bearer <token>

Response:
[
  {
    "_id": "invitation_id",
    "conversationId": {
      "groupName": "My Group",
      "groupDescription": "Group description",
      ...
    },
    "invitedBy": {
      "username": "john_doe",
      "avatar": "url"
    },
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
]
```

#### 2. Discover Public Groups
```
GET /api/conversations/public/discover?search=gaming&page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "groups": [
    {
      "id": "group_id",
      "groupName": "Gaming Squad",
      "groupDescription": "For all gaming enthusiasts",
      "groupType": "public",
      "memberCount": 45,
      "lastMessageAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

#### 3. Join Public Group
```
POST /api/conversations/:conversationId/join
Authorization: Bearer <token>

Response:
{
  "id": "conversation_id",
  "groupName": "Gaming Squad",
  "groupType": "public",
  "participants": [...],
  ...
}
```

#### 4. Create Enhanced Group
```
POST /api/conversations/group
Authorization: Bearer <token>
Content-Type: application/json

{
  "groupName": "My New Group",
  "groupDescription": "This is a great group for team collaboration",
  "groupType": "public",
  "userIds": ["user1_id", "user2_id"],
  "settings": {
    "maxMembers": 100,
    "allowMemberInvites": true,
    "isArchived": false
  }
}
```

### New Socket Events

#### Client → Server

1. **invite-to-group**
```javascript
socket.emit('invite-to-group', {
  conversationId: 'group_id',
  userIds: ['user1_id', 'user2_id']
});
```

2. **accept-invitation**
```javascript
socket.emit('accept-invitation', {
  invitationId: 'invitation_id'
});
```

3. **decline-invitation**
```javascript
socket.emit('decline-invitation', {
  invitationId: 'invitation_id'
});
```

#### Server → Client

1. **group-invitation** - Received when someone invites you
```javascript
socket.on('group-invitation', (invitation) => {
  // invitation object with full details
});
```

2. **invitations-sent** - Confirmation that invitations were sent
```javascript
socket.on('invitations-sent', ({ count }) => {
  // count: number of invitations sent
});
```

3. **invitation-accepted** - When you accept an invitation
```javascript
socket.on('invitation-accepted', (conversation) => {
  // Full conversation object
});
```

4. **invitation-declined** - When you decline an invitation
```javascript
socket.on('invitation-declined', ({ invitationId }) => {
  // invitationId: ID of declined invitation
});
```

5. **member-joined** - Notifies group members when someone joins
```javascript
socket.on('member-joined', ({ conversationId, member }) => {
  // conversationId: ID of the group
  // member: User object of who joined
});
```

## Testing with Postman

### Test 1: Create a Public Group

```
POST http://localhost:5000/api/conversations/group
Authorization: Bearer <user1_token>
Content-Type: application/json

{
  "groupName": "Public Gaming Group",
  "groupDescription": "Join us for epic gaming sessions",
  "groupType": "public",
  "userIds": [],
  "settings": {
    "maxMembers": 50,
    "allowMemberInvites": false
  }
}
```

### Test 2: Discover Public Groups

```
GET http://localhost:5000/api/conversations/public/discover?search=gaming&page=1&limit=10
Authorization: Bearer <user2_token>
```

### Test 3: Join Public Group

```
POST http://localhost:5000/api/conversations/<group_id>/join
Authorization: Bearer <user2_token>
```

### Test 4: Create Private Group with Invitations

```
POST http://localhost:5000/api/conversations/group
Authorization: Bearer <user1_token>
Content-Type: application/json

{
  "groupName": "Private Team",
  "groupDescription": "Our private team workspace",
  "groupType": "private",
  "userIds": [],
  "settings": {
    "maxMembers": 10,
    "allowMemberInvites": true
  }
}
```

Then invite users via socket events (needs socket.io client testing).

### Test 5: Get Pending Invitations

```
GET http://localhost:5000/api/conversations/invitations/pending
Authorization: Bearer <user2_token>
```

## Socket.io Testing (Browser Console)

### Setup
```javascript
// Connect to socket
const socket = io('http://localhost:5000/chat', {
  auth: { token: 'your_jwt_token_here' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Listen for invitation
socket.on('group-invitation', (invitation) => {
  console.log('Received invitation:', invitation);
});

socket.on('member-joined', ({ conversationId, member }) => {
  console.log(`${member.username} joined conversation ${conversationId}`);
});
```

### Test Invitation Flow
```javascript
// User 1: Send invitation
socket.emit('invite-to-group', {
  conversationId: 'your_group_id',
  userIds: ['user2_id']
});

// User 2: Accept invitation (in another browser/tab)
socket.emit('accept-invitation', {
  invitationId: 'invitation_id_from_notification'
});
```

## Backward Compatibility Testing

### Test 1: Existing Groups Still Work
1. Log in with a user who has existing group conversations
2. Verify all existing groups load properly
3. Check that you can still send/receive messages
4. Verify leave group still works

### Test 2: Existing One-to-One Conversations
1. Open existing one-to-one chats
2. Send messages
3. Verify everything works as before

### Test 3: Old Group Features
1. Add members to existing groups (traditional way)
2. Remove members
3. Update group name/avatar
4. All should work as before

## What's Different Now?

### For Existing Groups
- They automatically have `groupType: 'private'` (default)
- No `groupDescription` until you add one
- Default settings apply (maxMembers: 500, allowMemberInvites: false)
- All existing functionality preserved

### For New Groups
- Can choose public or private
- Can add description
- Can customize settings
- Can use invitation system
- Can be discovered if public

## Frontend TODO (Not Yet Implemented)

### API Client Updates Needed
File: `client/src/api/conversations.ts`

```typescript
// Add these methods
export const getPendingInvitations = async () => {
  const { data } = await api.get('/conversations/invitations/pending');
  return data;
};

export const getPublicGroups = async (search?: string, page = 1, limit = 20) => {
  const { data } = await api.get('/conversations/public/discover', {
    params: { search, page, limit }
  });
  return data;
};

export const joinPublicGroup = async (conversationId: string) => {
  const { data } = await api.post(`/conversations/${conversationId}/join`);
  return data;
};
```

### Socket Methods Needed
File: `client/src/lib/socket.ts`

```typescript
// Add these methods to socket service
inviteToGroup: (conversationId: string, userIds: string[]) => {
  socket.emit('invite-to-group', { conversationId, userIds });
},

acceptInvitation: (invitationId: string) => {
  socket.emit('accept-invitation', { invitationId });
},

declineInvitation: (invitationId: string) => {
  socket.emit('decline-invitation', { invitationId });
},

// Add these listeners
onGroupInvitation: (callback: (invitation: any) => void) => {
  socket.on('group-invitation', callback);
},

onInvitationAccepted: (callback: (conversation: any) => void) => {
  socket.on('invitation-accepted', callback);
},

onMemberJoined: (callback: (data: any) => void) => {
  socket.on('member-joined', callback);
}
```

### UI Components Needed

1. **Enhanced CreateGroupModal**
   - Add description textarea
   - Add public/private toggle
   - Add settings section (maxMembers, allowMemberInvites)

2. **InviteMembersModal**
   - Search/select users to invite
   - Show invitation status
   - Only show for groups with allowMemberInvites or if admin

3. **InvitationNotification**
   - Show pending invitations badge
   - List of pending invitations
   - Accept/Decline buttons

4. **PublicGroupsDiscovery**
   - Search bar for groups
   - List of public groups with details
   - Join button
   - Member count display

5. **GroupInfoPanel Updates**
   - Show group description
   - Show group type (public/private)
   - Show settings
   - Add "Invite Members" button

## Success Criteria

✅ Backend complete:
- Models enhanced
- Services implemented
- Controllers added
- Routes registered
- Socket events working
- Server running successfully

⏳ Frontend pending:
- API client methods
- Socket event handlers
- UI components
- State management

## Notes

1. **Backward Compatible**: All existing conversations work unchanged
2. **Gradual Migration**: Optional fields mean no breaking changes
3. **Unified System**: Groups and rooms are the same - no separate models
4. **Scalable**: Settings allow customization per group
5. **Secure**: Proper permission checks for invitations and joining

## Next Steps

1. ✅ Backend fully implemented
2. ⏳ Test backend with Postman
3. ⏳ Implement frontend API client
4. ⏳ Implement frontend socket handlers
5. ⏳ Build UI components
6. ⏳ Test complete flow end-to-end
