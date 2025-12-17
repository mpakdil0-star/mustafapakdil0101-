import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadAvatar, uploadAvatarBase64, removeAvatar, getElectricianStats, changePassword, updateProfile } from '../controllers/userController';
import { getJobHistory } from '../controllers/historyController';
import { authenticate } from '../middleware/auth';

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
router.post('/avatar', authenticate, upload.single('image'), uploadAvatar);
router.post('/avatar-base64', authenticate, uploadAvatarBase64);
router.delete('/avatar', authenticate, removeAvatar);
router.get('/stats', authenticate, getElectricianStats);
router.put('/password', authenticate, changePassword);
router.put('/profile', authenticate, updateProfile);
router.get('/history', authenticate, getJobHistory);

export default router;


