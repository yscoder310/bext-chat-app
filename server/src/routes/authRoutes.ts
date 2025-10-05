import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { registerValidation, loginValidation, updateProfileValidation, updatePasswordValidation } from '../middleware/validators';

const router = Router();

// Public routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.get('/users', authenticateToken, AuthController.getAllUsers);
router.post('/logout', authenticateToken, AuthController.logout);
router.put('/profile', authenticateToken, updateProfileValidation, AuthController.updateProfile);
router.put('/password', authenticateToken, updatePasswordValidation, AuthController.updatePassword);

export default router;
