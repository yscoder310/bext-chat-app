# Testing Privacy Feature - Quick Guide

## Setup

1. Start your backend server:
```bash
cd server
npm run dev
```

2. Start your frontend (in another terminal):
```bash
cd client
npm run dev
```

---

## Test 1: Basic Privacy Protection

### Steps:
1. **Login as User A**
   - Create a new group chat (e.g., "Test Group")
   - Send 5-10 messages in the group

2. **Login as User B** (different browser or incognito)
   - Have User A invite User B to the group
   - Accept the invitation

3. **Verify**
   - ✅ User B should see **0 old messages** (only messages sent after they joined)
   - ✅ User A should still see **all 10 messages**

4. **Continue Testing**
   - User A sends a new message
   - User B sends a new message
   - ✅ Both users should see these new messages

---

## Test 2: Multiple Members at Different Times

### Steps:
1. **User A** creates group, sends 3 messages
2. **User B** joins, sends 2 messages
3. **User C** joins, sends 1 message

### Expected Results:
- **User A sees:** 6 messages (all)
- **User B sees:** 3 messages (their 2 + User C's 1)
- **User C sees:** 1 message (only theirs)

---

## Test 3: Public Group Join

### Steps:
1. **User A** creates a public/open group
2. User A sends 5 messages
3. **User B** discovers and joins via public groups list
4. ✅ User B should see **0 old messages**

---

## Test 4: Admin Adds Member

### Steps:
1. **User A** (admin) creates group, sends 5 messages
2. User A uses "Add Member" feature to add User B
3. ✅ User B should see **0 old messages**

---

## Test 5: Direct Messages (Should NOT Be Filtered)

### Steps:
1. **User A** sends direct message to User B
2. ✅ Both should see all messages (no join date filtering in DMs)

---

## Test 6: Leave and Re-join

### Steps:
1. User A creates group, sends 5 messages
2. User B joins (sees 0 messages)
3. User A sends 3 more messages
4. User B now sees 3 messages
5. User B **leaves** the group
6. User A sends 2 more messages
7. User B **re-joins** the group
8. ✅ User B should see **0 messages** (join date reset to re-join time)
9. User A sends 1 more message
10. ✅ User B should see **1 message** (sent after re-join)

---

## Quick Debugging

### Check Backend Console
When a member joins, you should see the join date being set:
```
User [userId] joined at [timestamp]
```

### Check Database (MongoDB Compass or CLI)
```javascript
db.conversations.findOne({ _id: ObjectId("...") })
```

Look for the `memberJoinDates` field:
```javascript
{
  memberJoinDates: {
    "user1_id": ISODate("2024-01-15T10:00:00Z"),
    "user2_id": ISODate("2024-01-15T11:30:00Z")
  }
}
```

### Check API Response
In browser DevTools Network tab, check the messages API response:
```
GET /api/conversations/{conversationId}/messages
```

Count the messages returned - should match user's visibility rules.

---

## Common Issues

### Issue: Existing groups showing all messages to new members
**Cause:** Existing groups don't have `memberJoinDates` populated
**Solution:** Run migration script or wait for new member joins (they'll be filtered correctly)

### Issue: Messages not being filtered
**Check:**
1. Is the conversation type `'group'`? (Filtering doesn't apply to DMs)
2. Does the user have a join date in `memberJoinDates`?
3. Check backend logs for any errors

### Issue: User can't see their own messages
**This shouldn't happen!** Check:
1. Is message `createdAt` correctly set?
2. Is user's join date correct? (Should be before their message timestamp)

---

## Success Criteria

✅ New members see only messages sent after they joined
✅ Original members see all messages
✅ Direct messages show all history (unaffected)
✅ Multiple members joining at different times see correct subsets
✅ Leave and re-join resets the join date

---

## Database Inspection Queries

### View all conversations with join dates:
```javascript
db.conversations.find(
  { type: 'group' },
  { name: 1, memberJoinDates: 1, participants: 1 }
)
```

### View messages for a conversation:
```javascript
db.messages.find(
  { conversationId: ObjectId("...") },
  { content: 1, createdAt: 1, senderId: 1 }
).sort({ createdAt: 1 })
```

### Check if filtering is working (manual query):
```javascript
// Get user's join date
const conv = db.conversations.findOne({ _id: ObjectId("...") });
const userJoinDate = conv.memberJoinDates.get("userId");

// Count messages they should see
db.messages.countDocuments({
  conversationId: ObjectId("..."),
  createdAt: { $gte: userJoinDate }
})
```

---

## Next Steps After Testing

1. If tests pass → Feature is ready! ✅
2. If tests fail → Check error logs and verify implementation
3. Document any edge cases discovered during testing
4. Consider adding automated tests (Jest/Mocha)

---

## Need Help?

Check these files:
- `PRIVACY_FEATURE_IMPLEMENTATION.md` - Full technical documentation
- Backend logs - Check for errors or warnings
- Browser console - Check for frontend errors
