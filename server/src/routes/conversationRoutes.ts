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
router.post('/:conversationId/participants', ConversationController.addParticipant);
router.delete('/:conversationId/participants/:participantId', ConversationController.removeParticipant);
router.delete('/:conversationId', ConversationController.deleteConversation);

export default router;
