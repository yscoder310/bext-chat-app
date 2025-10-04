import { Router } from 'express';
import { ChatRequestController } from '../controllers/chatRequestController';
import { authenticateToken } from '../middleware/auth';
import { chatRequestValidation } from '../middleware/validators';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.post('/', chatRequestValidation, ChatRequestController.sendRequest);
router.get('/pending', ChatRequestController.getPendingRequests);
router.get('/sent', ChatRequestController.getSentRequests);
router.put('/:requestId/accept', ChatRequestController.acceptRequest);
router.put('/:requestId/reject', ChatRequestController.rejectRequest);
router.delete('/:requestId', ChatRequestController.cancelRequest);

export default router;
