import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { config } from './config/env';
import routes from './routes';
import { initializeSocketServer } from './services/socketHandler';
import { logger } from './utils/logger';
import prisma from './config/database';

const app = express();
const httpServer = createServer(app);

// Use trust proxy for Render/Proxies to allow rate limiting and correct IP detection
app.set('trust proxy', 1);

// Global Socket.io instance
let io: SocketServer;

// Helper to notify users via socket
export const notifyUser = (target: string | string[], event: string, data: any) => {
  if (io) {
    const targets = Array.isArray(target) ? target : [target];
    const targetRooms: string[] = [];

    targets.forEach(t => {
      if (t === 'all_electricians' || t.startsWith('area:')) {
        targetRooms.push(t);
      } else {
        // Individual user ID - use their private room
        targetRooms.push(`user:${t}`);
      }
    });

    if (targetRooms.length > 0) {
      io.to(targetRooms).emit(event, data);
    }

    logger.info(`🔔 Socket Notification sent to ${Array.isArray(target) ? target.join(', ') : target}: ${event}`);
  } else {
    logger.warn('⚠️ Cannot send socket notification: io not initialized');
  }
};

// Initialize Socket Server
io = initializeSocketServer(httpServer);
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disallowed for local testing over HTTP
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// URL normalization - fix double slashes from mobile client
app.use((req, res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/\//g, '/');
  }
  next();
});

// Routes
app.use('/api/v1', routes);

// Public Legal HTML routes (Top level for easier Google Play submission)
import legalRoutes from './routes/legalRoutes';
app.use('/legal', legalRoutes); // For /legal/kvkk etc.
app.get('/kvkk', (req, res) => res.redirect('/legal/kvkk'));
app.get('/terms', (req, res) => res.redirect('/legal/terms'));

app.get('/api/update-ratings', async (req, res) => {
  try {
    const updates = [
      { name: 'Ufuk soydan', rating: 4.9, reviews: 12 },
      { name: 'Hasan Yıldırım', rating: 4.8, reviews: 10 },
      { name: 'Said Ugan', rating: 4.8, reviews: 8 },
      { name: 'Mehmet Cebiş', rating: 4.8, reviews: 9 },
    ];

    const results = [];
    for (const item of updates) {
      const user = await prisma.user.findFirst({
        where: { fullName: { equals: item.name, mode: 'insensitive' } }
      });

      if (user) {
        await prisma.electricianProfile.update({
          where: { userId: user.id },
          data: {
            ratingAverage: item.rating,
            totalReviews: item.reviews,
          }
        });
        results.push(`✅ ${item.name} updated`);
      } else {
        results.push(`❌ ${item.name} not found`);
      }
    }
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug-ahmet', async (req, res) => {
  try {
    const ahmet = await prisma.user.findFirst({
      where: { email: 'ahmet@gmail.com' },
      include: { electricianProfile: true }
    });
    res.json(ahmet);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.warn(`❌ [404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
});

// Error handling middleware (must be last)
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);


const PORT = config.port || 3001;

async function startServer() {
  try {
    // Note: Database connection is handled in database.ts with a timeout
    // We just ensure we listen here
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 SERVER RESTARTED SUCCESFULLY - Build: 24.02.26 23:58 on port ${PORT}`);
      logger.info(`🏠 Local: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

startServer();

export default app;
