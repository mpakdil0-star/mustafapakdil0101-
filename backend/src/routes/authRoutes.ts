import { Router } from 'express';
import {
  registerController,
  loginController,
  logoutController,
  refreshTokenController,
  meController,
  forgotPasswordController,
  resetPasswordController,
  sendEmailVerificationController,
  verifyEmailController,
} from '../controllers/authController';
import { googleLoginController } from '../controllers/googleAuthController';
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
router.post('/logout', authenticate, logoutController);
router.post('/refresh-token', validate(refreshTokenValidation), refreshTokenController);
router.get('/me', authenticate, meController);
router.post('/forgot-password', authLimiter, validate(forgotPasswordValidation), forgotPasswordController);
router.post('/reset-password', authLimiter, validate(resetPasswordValidation), resetPasswordController);
router.post('/google', authLimiter, googleLoginController);
router.post('/send-verification', authLimiter, sendEmailVerificationController);
router.post('/verify-email', authLimiter, verifyEmailController);

export default router;

