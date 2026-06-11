import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// DATABASE URL parametrelerini düzenle (Timeout eklemek için)
const databaseUrl = process.env.DATABASE_URL;
let finalUrl = databaseUrl;

if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
  finalUrl = databaseUrl.includes('?')
    ? `${databaseUrl}&connect_timeout=10`
    : `${databaseUrl}?connect_timeout=10`;
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
// In production, always assume true to let Prisma handle auto-reconnection and queries
export let isDatabaseAvailable = process.env.NODE_ENV === 'production' ? true : false;

// Test database connection at startup (async, non-blocking)
// Server başlatılmasını engellemez
const initDatabase = async () => {
  try {
    await prisma.$connect();
    isDatabaseAvailable = true;
    logger.info('✅ Database connected successfully');

    // Data Cleanup: Clean up empty phone strings to null to prevent P2002 unique constraint conflicts
    try {
      const updateResult = await prisma.user.updateMany({
        where: { phone: '' },
        data: { phone: null }
      });
      if (updateResult.count > 0) {
        logger.info(`🧹 Cleaned up ${updateResult.count} user(s) with empty phone strings to NULL`);
      }
    } catch (cleanupErr: any) {
      logger.error('Failed to clean up empty phone strings: ' + cleanupErr.message);
    }

    // Run Base64 to physical files migration asynchronously
    import('../utils/dbMigration').then((m) => {
      m.runBase64ToFilesMigration();
    }).catch((err) => {
      logger.error('Failed to import database migration:', err);
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      isDatabaseAvailable = false;
      logger.info('⚠️  Database URL not found or connection failed.');
      logger.info('✅ Switching to MOCK STORAGE MODE (In-Memory). This is normal for local dev.');
    } else {
      isDatabaseAvailable = true;
      logger.error('❌ Database connection failed at startup: ' + error.message);
    }
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
