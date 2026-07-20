import { Router, Request, Response } from 'express';

const router = Router();

const deprecatedAuth = (endpoint: string) => (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: `Legacy auth endpoint '${endpoint}' has been retired. Use Supabase Auth from the mobile app instead.`,
  });
};

router.post('/register', deprecatedAuth('POST /auth/register'));
router.post('/login', deprecatedAuth('POST /auth/login'));
router.post('/logout', deprecatedAuth('POST /auth/logout'));
router.post('/refresh-token', deprecatedAuth('POST /auth/refresh-token'));
router.get('/me', deprecatedAuth('GET /auth/me'));
router.post('/forgot-password', deprecatedAuth('POST /auth/forgot-password'));
router.post('/reset-password', deprecatedAuth('POST /auth/reset-password'));
router.post('/google', deprecatedAuth('POST /auth/google'));
router.post('/apple', deprecatedAuth('POST /auth/apple'));
router.post('/send-verification', deprecatedAuth('POST /auth/send-verification'));
router.post('/verify-email', deprecatedAuth('POST /auth/verify-email'));
router.post('/debug-activate', deprecatedAuth('POST /auth/debug-activate'));

export default router;

