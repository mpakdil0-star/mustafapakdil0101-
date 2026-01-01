import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadAvatar, uploadAvatarBase64, removeAvatar, getElectricianStats, changePassword, updateProfile, getVerificationStatus, submitVerification, updatePushToken, getElectricians, getElectricianById, getAllVerifications, processVerification, deleteAccount } from '../controllers/userController';
import { meController } from '../controllers/authController';
import { getJobHistory } from '../controllers/historyController';
import { getNotificationPreferences, updateNotificationPreferences } from '../controllers/notificationPreferencesController';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads/avatars');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const userId = (req as any).user ? (req as any).user.id : 'unknown';
        cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

// Routes
router.get('/me', authenticate, meController);
router.post('/avatar', authenticate, upload.single('image'), uploadAvatar);
router.post('/avatar/base64', authenticate, uploadAvatarBase64);
router.delete('/avatar', authenticate, removeAvatar);
router.get('/stats', authenticate, getElectricianStats);
router.put('/password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);
router.delete('/', authenticate, deleteAccount);
router.get('/history', authenticate, getJobHistory);

// Verification routes (MYK/Oda belgesi)
router.get('/verification', authenticate, getVerificationStatus);
router.post('/verification', authenticate, submitVerification);

// Notification routes
router.post('/push-token', authenticate, updatePushToken);
router.get('/notification-preferences', authenticate, getNotificationPreferences);
router.put('/notification-preferences', authenticate, updateNotificationPreferences);
router.get('/electricians', optionalAuthenticate, getElectricians);
router.get('/electricians/:id', optionalAuthenticate, getElectricianById);

// Admin verification management
router.get('/admin/verifications', authenticate, authorize('ADMIN'), getAllVerifications);
router.post('/admin/verifications/process', authenticate, authorize('ADMIN'), processVerification);

export default router;

// MYK Verification routes added - v2
