# Privacy Feature Implementation

## Overview
Implemented privacy protection to prevent new group members from seeing chat history from before they joined the group.

## Problem
Previously, when a user joined a group chat, they could see all historical messages from the beginning of the group, even messages sent before they were a member. This is a privacy breach.

## Solution
Track when each member joined a group and filter messages to only show those sent after their join date.

---

## Implementation Details

### 1. Database Schema Changes

#### `/server/src/types/index.ts`
Added `memberJoinDates` field to `IConversation` interface:
```typescript
memberJoinDates: Map<string, Date>; // Maps userId -> join date
```

#### `/server/src/models/Conversation.ts`
Added `memberJoinDates` field to Mongoose schema:
```typescript
memberJoinDates: {
  type: Map,
  of: Date,
  default: new Map(),
  // Maps userId -> Date when they joined
}
```

---

### 2. Service Method Updates

Updated all methods that add members to groups to record the join date:

#### `/server/src/services/conversationService.ts`

**createGroupConversation** (line ~130)
- Sets join date for all initial members when group is created
```typescript
participants.forEach(participantId => {
  joinDatesMap.set(participantId, now);
});
conversation.memberJoinDates = joinDatesMap;
```

**addParticipantToGroup** (line ~317)
- Sets join date when admin adds a new participant
```typescript
conversation.memberJoinDates.set(newParticipantId, new Date());
```

**acceptInvitation** (line ~844)
- Sets join date when user accepts group invitation
```typescript
conversation.memberJoinDates.set(userId, new Date());
```

**joinPublicGroup** (line ~992)
- Sets join date when user joins a public/open group
```typescript
conversation.memberJoinDates.set(userId, new Date());
```

---

### 3. Message Filtering

#### `/server/src/services/messageService.ts`

Updated `getMessages` method to filter messages based on join date:

```typescript
// Get user's join date for privacy filtering
const userJoinDate = conversation.memberJoinDates?.get(userId);

// Build query - only show messages sent after user joined (for groups)
const messageQuery: any = { conversationId };
if (conversation.type === 'group' && userJoinDate) {
  messageQuery.createdAt = { $gte: userJoinDate };
}

const messages = await Message.find(messageQuery)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('senderId', 'username avatar isOnline');

const total = await Message.countDocuments(messageQuery);
```

**Key Points:**
- Filtering only applies to group conversations (`type === 'group'`)
- Direct messages (1-on-1 chats) are not affected
- Uses MongoDB `$gte` operator to filter messages where `createdAt >= userJoinDate`
- Also applies to pagination total count for accurate page numbers

---

## Behavior

### Before Implementation
- User A creates group, sends 50 messages
- User B joins group
- **User B can see all 50 old messages** ❌ Privacy breach

### After Implementation
- User A creates group, sends 50 messages
- User B joins group at timestamp `T`
- **User B can only see messages sent after `T`** ✅ Privacy protected
- User B sends a message
- User A can see all messages (they were there from the start)
- User B can only see their own message and future messages

---

## Testing Scenarios

### Test Case 1: New Member Joins Existing Group
1. User A creates a group
2. User A sends 10 messages
3. User B joins the group
4. **Expected:** User B sees 0 messages from before they joined
5. **Expected:** User A still sees all 10 messages

### Test Case 2: Messages After Join
1. (Continuing from Test Case 1)
2. User A sends message 11
3. User B sends message 12
4. **Expected:** User B sees messages 11 and 12
5. **Expected:** User A sees all messages (1-12)

### Test Case 3: Multiple Members Join at Different Times
1. User A creates group at time T0, sends 5 messages
2. User B joins at time T1, sends 3 messages
3. User C joins at time T2, sends 2 messages
4. **Expected:** User A sees all 10 messages
5. **Expected:** User B sees 5 messages (3 theirs + 2 from C)
6. **Expected:** User C sees 2 messages (only theirs)

### Test Case 4: Direct Messages Unaffected
1. User A sends direct message to User B
2. **Expected:** Both see all messages (no filtering for 1-on-1 chats)

### Test Case 5: Leave and Re-join
1. User A creates group, sends 5 messages
2. User B joins, sees 0 old messages
3. User A sends 3 more messages
4. User B leaves the group
5. User B re-joins the group
6. **Expected:** User B's join date updates to re-join time
7. **Expected:** User B can see messages from their original join to re-join, plus new messages

---

## Database Migration

**Note:** Existing groups in the database will not have `memberJoinDates` populated. Two approaches:

### Option 1: Automatic Backfill (Recommended for Development)
- Let the feature work naturally
- New members get join dates
- Existing members without join dates see all messages (graceful degradation)

### Option 2: Manual Migration (Recommended for Production)
Create a migration script to backfill join dates for existing members:
```typescript
// Migration script
const conversations = await Conversation.find({ type: 'group' });

for (const conv of conversations) {
  const joinDatesMap = new Map();
  
  // Set all existing participants' join date to conversation creation date
  // This assumes they were original members
  conv.participants.forEach(participantId => {
    joinDatesMap.set(participantId, conv.createdAt);
  });
  
  conv.memberJoinDates = joinDatesMap;
  await conv.save();
}
```

---

## Edge Cases Handled

1. **User without join date**: If `memberJoinDates.get(userId)` returns undefined, no filtering is applied (shows all messages)
2. **Non-group conversations**: Filtering only applies to groups, not direct messages
3. **Optional chaining**: Uses `?.` operator to safely access Map methods
4. **Pagination**: Total count also respects the join date filter for accurate page numbers

---

## Frontend Impact

**No changes needed!** The frontend already:
- Fetches messages via `/api/conversations/:id/messages` endpoint
- Receives filtered messages from backend
- Displays whatever messages the API returns

The privacy filtering is transparent to the frontend.

---

## Performance Considerations

- **Index on createdAt**: Ensure MongoDB index exists on `Message.createdAt` for efficient filtering
- **Map storage**: Mongoose Maps are efficient for storing userId->Date mappings
- **Query optimization**: The `$gte` operator with indexed field is performant

---

## Future Enhancements

1. **UI Indicator**: Show "Joined on [date]" indicator in chat to clarify why older messages aren't visible
2. **Admin Override**: Allow admins to see full history for moderation purposes
3. **Archive Access**: Provide controlled way for members to request access to historical context
4. **Analytics**: Track how many messages are filtered per request for monitoring

---

## Related Files

- `/server/src/types/index.ts` - IConversation interface
- `/server/src/models/Conversation.ts` - Mongoose schema
- `/server/src/services/conversationService.ts` - Member management methods
- `/server/src/services/messageService.ts` - Message retrieval with filtering

---

## Status

✅ **Implementation Complete**

All code changes have been made. Ready for testing in development environment.
