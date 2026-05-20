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

// ==================== SHARED MARKETPLACE ROUTES ====================
import fs from 'fs';
import path from 'path';

const MARKETPLACE_FILE = path.join(process.cwd(), 'data', 'marketplace.json');

// Get marketplace products
router.get(`${apiPrefix}/marketplace`, (req, res) => {
  try {
    if (fs.existsSync(MARKETPLACE_FILE)) {
      const data = fs.readFileSync(MARKETPLACE_FILE, 'utf8');
      return res.json({ success: true, data: JSON.parse(data) });
    }
  } catch (error) {
    console.error('Failed to read marketplace file:', error);
  }
  return res.json({ success: true, data: [] });
});

// Add new marketplace product
router.post(`${apiPrefix}/marketplace`, (req, res) => {
  try {
    let products: any[] = [];
    
    // Ensure the data directory exists
    const dataDir = path.dirname(MARKETPLACE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(MARKETPLACE_FILE)) {
      try {
        products = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, 'utf8'));
      } catch (e) {
        console.error('Failed to parse existing marketplace products:', e);
      }
    }

    const newProduct = req.body;
    // Add product to the beginning
    products.unshift(newProduct);

    fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(products, null, 2), 'utf8');
    return res.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Failed to save marketplace product:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
});

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

