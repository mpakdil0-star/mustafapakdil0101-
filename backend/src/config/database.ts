import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// DATABASE URL parametrelerini düzenle (Timeout eklemek için)
const databaseUrl = process.env.DATABASE_URL;
let finalUrl = databaseUrl;

if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
  finalUrl = databaseUrl.includes('?')
    ? `${databaseUrl}&connect_timeout=2`
    : `${databaseUrl}?connect_timeout=2`;
}

const prisma = new PrismaClient({
  ...(finalUrl ? {
    datasources: {
      db: {
        url: finalUrl,
      },
    },
  } : {}),
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Global flag to track database availability
// Starts as false, becomes true only after successful connection
export let isDatabaseAvailable = false;

// Test database connection at startup (async, non-blocking)
// Server başlatılmasını engellemez
const initDatabase = async () => {
  try {
    await prisma.$connect();
    isDatabaseAvailable = true;
    logger.info('✅ Database connected successfully');
  } catch (error: any) {
    isDatabaseAvailable = false;
    logger.warn('⚠️  Database connection failed - API will work in mock mode');
    logger.warn('   Please configure DATABASE_URL in .env file');
    logger.warn('   See DATABASE_KURULUM.md for setup instructions');
    // Server başlamaya devam edecek
  }
};

// Start connection test after 500ms (non-blocking)
setTimeout(initDatabase, 500);

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore
  }
});

export default prisma;
