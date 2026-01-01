import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import os from 'os';
import path from 'path';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { initializeSocketServer } from './services/socketHandler';

const app = express();
const httpServer = createServer(app);

// EN BAŞA: Gelen tüm istekleri yakala
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`\n🔔 [INCOMING] ${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`✅ [OUTGOING] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Socket.io başlat
let io: any = null;
try {
  io = initializeSocketServer(httpServer);
  logger.info('🔌 Socket.io initialized');
} catch (error: any) {
  logger.warn('⚠️ Socket.io initialization failed:', error.message);
}

// Socket.IO instance'ına erişim için helper fonksiyon
export const getIO = () => io;

// Belirli bir kullanıcıya bildirim gönder (Socket + Push)
export const notifyUser = async (userId: string, event: string, data: any) => {
  // 1. Socket.io üzerinden anlık gönder (Uygulama açıksa)
  if (io) {
    const targetRoom = userId === 'all_electricians' ? 'all_electricians' : `user:${userId}`;
    io.to(targetRoom).emit(event, data);
    logger.info(`📢 Socket Notification sent to ${targetRoom}: ${event}`);
  }

  // 2. Push Notification gönder (Özel kanal değilse ve Uygulama kapalıysa)
  if (userId === 'all_electricians') return; // Toplu push şimdilik devre dışı

  try {
    const prisma = (await import('./config/database')).default;
    const pushNotificationService = (await import('./services/pushNotificationService')).default;

    // Database'den kullanıcının push token'ını al (Mock ID değilse)
    if (!userId.startsWith('mock-')) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true }
      });

      if (user?.pushToken) {
        await pushNotificationService.sendNotification({
          to: user.pushToken,
          title: data.title || 'Yeni Bildirim',
          body: data.message || 'Uygulamadan yeni bir bildiriminiz var.',
          data: { ...data, event }
        });
        logger.info(`📲 Push Notification sent to user ${userId}`);
      }
    } else {
      logger.info(`💡 Skipping push for mock user ${userId}`);
    }
  } catch (error) {
    logger.warn(`⚠️ Push-notification background process failed for ${userId}:`, error);
  }
};

// Security middleware - Expo Go için esnek ayarlar
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// CORS - Expo Go için development'ta tüm origin'lere izin ver
app.use(
  cors({
    origin: config.nodeEnv === 'development'
      ? true  // Development'ta tüm origin'lere izin ver (Expo Go için)
      : config.frontendUrl,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(apiLimiter);

// Favicon handler - tarayıcıların otomatik favicon.ico isteğini handle et
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // 204 No Content - favicon yok ama hata da değil
});

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use(routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
    },
  });
});

// Error handler
app.use(errorHandler);

// Start server - 0.0.0.0 ile tüm network interface'lerde dinle (Expo Go için)
const PORT = config.port;

// Database bağlantısı olmasa bile server başlat
httpServer.listen(PORT, '0.0.0.0', () => {
  // Increase timeout for large image uploads
  httpServer.timeout = 90000; // 90 seconds

  // Get current IP address
  const networkInterfaces = os.networkInterfaces();
  let currentIP = '192.168.1.62'; // Default

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
            currentIP = iface.address;
            break;
          }
        }
      }
    }
  }

  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📱 Server accessible at http://0.0.0.0:${PORT}`);
  logger.info(`💻 Local access: http://localhost:${PORT}`);
  logger.info(`🌐 Network access: http://${currentIP}:${PORT}`);
  logger.info(`📊 Environment: ${config.nodeEnv}`);
  logger.info(`🔢 API Version: ${config.apiVersion}`);
  if (io) {
    logger.info(`💬 WebSocket: ws://${currentIP}:${PORT}/socket.io`);
  }
  logger.info(`\n✅ Backend hazır! Mobil uygulamadan bağlanabilirsiniz.\n`);

  // Database bağlantısını test et (async, blocking yapmaz)
  import('./config/database').then(async (dbModule) => {
    try {
      await dbModule.default.$connect();
      logger.info('✅ Database connected');
    } catch (error) {
      logger.warn('⚠️ Database connection failed - API will work in limited mode with mock data');
      logger.warn('   See DATABASE_KURULUM.md for setup instructions');
    }
  }).catch(() => {
    // Ignore
  });
}).on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use!`);
    logger.error('   Please stop the process using this port or change PORT in .env file');
  } else {
    logger.error(`❌ Failed to start server: ${error.message}`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  try {
    const prisma = (await import('./config/database')).default;
    await prisma.$disconnect();
  } catch (error) {
    // Ignore
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  try {
    const prisma = (await import('./config/database')).default;
    await prisma.$disconnect();
  } catch (error) {
    // Ignore
  }
  process.exit(0);
});

export default app;
