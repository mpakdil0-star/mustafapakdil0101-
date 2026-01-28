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
import {
  validate,
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from '../validators';

const router = Router();

router.post('/register', registerLimiter, validate(registerValidation), registerController);
router.post('/login', authLimiter, validate(loginValidation), loginController);
router.post('/refresh-token', validate(refreshTokenValidation), refreshTokenController);
router.get('/me', authenticate, meController);
router.post('/forgot-password', authLimiter, validate(forgotPasswordValidation), forgotPasswordController);
router.post('/reset-password', authLimiter, validate(resetPasswordValidation), resetPasswordController);

export default router;

