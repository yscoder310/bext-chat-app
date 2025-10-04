import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { messageValidation } from '../middleware/validators';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.post('/', messageValidation, MessageController.sendMessage);
router.get('/:conversationId', MessageController.getMessages);
router.put('/:conversationId/read', MessageController.markAsRead);
router.delete('/:messageId', MessageController.deleteMessage);

export default router;
