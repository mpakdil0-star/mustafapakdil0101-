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

app.get('/api/create-dummy-reviews', async (req, res) => {
  try {
    const electricians = [
      { name: 'Ufuk soydan', reviews: [
        { comment: 'Ufuk bey çok ilgiliydi, sigorta arızamızı hemen çözdü. Teşekkürler.', rating: 5 },
        { comment: 'Zamanında geldi ve temiz çalıştı. Tavsiye ederim.', rating: 5 },
        { comment: 'İşinin ehli bir usta. Makul fiyat.', rating: 4 }
      ]},
      { name: 'Hasan Yıldırım', reviews: [
        { comment: 'Avize montajı için çağırdık, çok pratik bir şekilde halletti.', rating: 5 },
        { comment: 'Kibar ve yardımsever bir usta.', rating: 5 }
      ]},
      { name: 'Said Ugan', reviews: [
        { comment: 'Priz değişikliği ve kablo çekimi yapıldı. Gayet memnun kaldık.', rating: 5 },
        { comment: 'Hızlı müdahale için teşekkürler.', rating: 4 }
      ]},
      { name: 'Mehmet Cebiş', reviews: [
        { comment: 'Klima bakımını titizlikle yaptı. Artık çok daha iyi soğutuyor.', rating: 5 },
        { comment: 'Beyaz eşya tamiri konusunda uzman bir usta.', rating: 5 }
      ]}
    ];

    // Find a random citizen to be the reviewer
    const citizen = await prisma.user.findFirst({
      where: { userType: 'CITIZEN' }
    });

    if (!citizen) return res.status(404).json({ error: 'No citizen user found for reviews' });

    const results = [];
    for (const item of electricians) {
      const user = await prisma.user.findFirst({
        where: { fullName: { equals: item.name, mode: 'insensitive' } }
      });

      if (!user) {
        results.push(`❌ ${item.name} not found`);
        continue;
      }

      for (const rev of item.reviews) {
        // 1. Create a dummy job post
        const job = await prisma.jobPost.create({
          data: {
            citizenId: citizen.id,
            title: `Tamamlanan İş - ${user.fullName}`,
            description: 'Bu iş otomatik olarak tamamlanmış ve puanlanmıştır.',
            category: 'Elektrik',
            location: { city: 'Adana', district: 'Çukurova' },
            status: 'COMPLETED',
            assignedElectricianId: user.id,
            completedAt: new Date()
          }
        });

        // 2. Create the review
        await prisma.review.create({
          data: {
            jobPostId: job.id,
            reviewerId: citizen.id,
            reviewedId: user.id,
            rating: rev.rating,
            comment: rev.comment,
            isVisible: true
          }
        });
      }

      // 3. Update electrician profile counts
      const avgRating = item.reviews.reduce((acc, r) => acc + r.rating, 0) / item.reviews.length;
      await prisma.electricianProfile.update({
        where: { userId: user.id },
        data: {
          ratingAverage: avgRating,
          totalReviews: item.reviews.length,
          completedJobsCount: item.reviews.length
        }
      });

      results.push(`✅ ${item.name} reviews created (${item.reviews.length})`);
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
