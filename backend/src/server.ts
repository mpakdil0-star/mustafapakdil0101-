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

// Global Socket.io instance
let io: SocketServer;

// Helper to notify users via socket
export const notifyUser = (target: string, event: string, data: any) => {
  if (io) {
    if (target === 'all_electricians') {
      io.to('all_electricians').emit(event, data);
    } else {
      io.to(`user:${target}`).emit(event, data);
    }
    logger.info(`🔔 Socket Notification sent to ${target}: ${event}`);
  } else {
    logger.warn('⚠️ Cannot send socket notification: io not initialized');
  }
};

// Initialize Socket Server
io = initializeSocketServer(httpServer);

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

// Routes
app.use('/api/v1', routes);

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = 3002; // FORCE PORT to 3002 to resolve EADDRINUSE

async function startServer() {
  try {
    // Note: Database connection is handled in database.ts with a timeout
    // We just ensure we listen here
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`);
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
