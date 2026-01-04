import { Router } from 'express';
import {
  registerController,
  loginController,
  refreshTokenController,
  meController,
  forgotPasswordController,
  resetPasswordController,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', registerLimiter, registerController);
router.post('/login', authLimiter, loginController);
router.post('/refresh-token', refreshTokenController);
router.get('/me', authenticate, meController);
router.post('/forgot-password', authLimiter, forgotPasswordController);
router.post('/reset-password', authLimiter, resetPasswordController);

export default router;

