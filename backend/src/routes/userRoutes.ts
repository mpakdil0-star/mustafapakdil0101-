import express from 'express';
import { Request, Response } from 'express';
import { changePassword, updateProfile, getVerificationStatus, submitVerification, updatePushToken, getElectricians, getElectricianById, deleteAccount } from '../controllers/userController';
import { getJobHistory } from '../controllers/historyController';
import { getNotificationPreferences, updateNotificationPreferences } from '../controllers/notificationPreferencesController';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';
import { validate, updateProfileValidation, changePasswordValidation, updatePushTokenValidation, updateNotificationPreferencesValidation } from '../validators';

const router = express.Router();

const deprecatedRoute = (endpoint: string) => (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: `Legacy endpoint '${endpoint}' has been retired. Use Supabase Auth/session data instead.`,
  });
};

// Routes
router.get('/me', deprecatedRoute('GET /users/me'));
router.post('/avatar', deprecatedRoute('POST /users/avatar'));
router.post('/avatar/base64', deprecatedRoute('POST /users/avatar/base64'));
router.delete('/avatar', deprecatedRoute('DELETE /users/avatar'));
router.get('/stats', deprecatedRoute('GET /users/stats'));
router.put('/password', authenticate, validate(changePasswordValidation), changePassword);
router.put('/profile', authenticate, validate(updateProfileValidation), updateProfile);
router.delete('/', authenticate, deleteAccount);
router.get('/history', authenticate, getJobHistory);

// Verification routes (MYK/Oda belgesi)
router.get('/verification', authenticate, getVerificationStatus);
router.post('/verification', authenticate, submitVerification);

// Notification routes
router.post('/push-token', authenticate, validate(updatePushTokenValidation), updatePushToken);
router.get('/notification-preferences', authenticate, getNotificationPreferences);
router.put('/notification-preferences', authenticate, validate(updateNotificationPreferencesValidation), updateNotificationPreferences);
router.get('/electricians', optionalAuthenticate, getElectricians);
router.get('/electricians/:id', optionalAuthenticate, getElectricianById);

// Admin verification management


export default router;

// MYK Verification routes added - v2
