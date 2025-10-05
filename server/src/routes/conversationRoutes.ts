import { Router } from 'express';
import { ConversationController } from '../controllers/conversationController';
import { authenticateToken } from '../middleware/auth';
import { createGroupValidation } from '../middleware/validators';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.post('/one-to-one', ConversationController.createOneToOne);
router.post('/group', createGroupValidation, ConversationController.createGroup);
router.get('/', ConversationController.getUserConversations);
router.get('/:conversationId', ConversationController.getConversationById);
router.put('/:conversationId/name', ConversationController.updateGroupName);
router.put('/:conversationId/details', ConversationController.updateGroupDetails);
router.put('/:conversationId/admin', ConversationController.promoteToAdmin);
router.post('/:conversationId/participants', ConversationController.addParticipant);
router.post('/:conversationId/leave', ConversationController.leaveGroup);
router.delete('/:conversationId/participants/:participantId', ConversationController.removeParticipant);
router.delete('/:conversationId', ConversationController.deleteConversation);

// NEW ROUTES FOR INVITATION SYSTEM
router.get('/invitations/pending', ConversationController.getPendingInvitations);
router.get('/public/discover', ConversationController.getPublicGroups);
router.post('/:conversationId/join', ConversationController.joinPublicGroup);

export default router;
