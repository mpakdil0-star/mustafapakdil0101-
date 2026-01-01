import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import jobRoutes from './jobRoutes';
import bidRoutes from './bidRoutes';
import conversationRoutes from './conversationRoutes';
import messageRoutes from './messageRoutes';
import notificationRoutes from './notificationRoutes';
import favoriteRoutes from './favoriteRoutes';
import locationRoutes from './locationRoutes';
import paymentRoutes from './paymentRoutes';
import { config } from '../config/env';

const router = Router();

const apiPrefix = `/api/${config.apiVersion}`;
console.log('API Prefix:', apiPrefix);
console.log('Mounting routes...');

// Health check (root level)
router.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const prisma = (await import('../config/database')).default;
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Auth routes (no authentication required)
router.use(`${apiPrefix}/auth`, authRoutes);

// User routes
router.use(`${apiPrefix}/users`, userRoutes);

// Job routes (includes job-specific bid routes)
router.use(`${apiPrefix}/jobs`, jobRoutes);

// Bid routes
router.use(`${apiPrefix}/bids`, bidRoutes);

// Conversation routes
router.use(`${apiPrefix}/conversations`, conversationRoutes);

// Message routes
router.use(`${apiPrefix}/messages`, messageRoutes);

// Notification routes
router.use(`${apiPrefix}/notifications`, notificationRoutes);

// Favorite routes
router.use(`${apiPrefix}/favorites`, favoriteRoutes);

// Location routes
router.use(`${apiPrefix}/locations`, locationRoutes);

// Payment routes
router.use(`${apiPrefix}/payments`, paymentRoutes);

// Health check (API level)
router.get(`${apiPrefix}/health`, async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const prisma = (await import('../config/database')).default;
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

export default router;

