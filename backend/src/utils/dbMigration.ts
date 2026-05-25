import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { config } from '../config/env';
import { logger } from './logger';

// Helper to save base64 image to local disk and return absolute URL
const saveBase64ImageToDisk = (base64Str: string, folderName: string): string | null => {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return null; // Return null if already a URL or not base64
  }

  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Create target directory inside uploads
    const uploadDir = path.join(process.cwd(), 'uploads', folderName);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${folderName}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file synchronously
    fs.writeFileSync(filePath, buffer);

    // Build absolute URL based on environment
    const productionHost = process.env.RENDER_EXTERNAL_URL || 'https://elektrikciler-backend.onrender.com';
    const baseUrl = config.nodeEnv === 'production' 
      ? productionHost 
      : `http://localhost:${config.port || 5000}`;

    return `${baseUrl}/uploads/${folderName}/${fileName}`;
  } catch (error) {
    logger.error(`[Migration] Failed to save base64 image in ${folderName}:`, error);
    return null;
  }
};

/**
 * Migration function to scan databases and convert heavy base64 strings to disk files
 */
export const runBase64ToFilesMigration = async () => {
  logger.info('[Migration] Starting Base64 to physical files migration check...');
  
  try {
    // 1. Migrate Showcase Items
    const showcases = await prisma.showcaseItem.findMany();
    let showcaseCount = 0;
    
    for (const item of showcases) {
      let needsUpdate = false;
      let newImage = item.image;
      let newImages = [...item.images];

      // Check primary image
      if (item.image && item.image.startsWith('data:image')) {
        const savedUrl = saveBase64ImageToDisk(item.image, 'showcase');
        if (savedUrl) {
          newImage = savedUrl;
          needsUpdate = true;
        }
      }

      // Check secondary images
      if (Array.isArray(item.images)) {
        for (let i = 0; i < item.images.length; i++) {
          const img = item.images[i];
          if (img && img.startsWith('data:image')) {
            const savedUrl = saveBase64ImageToDisk(img, 'showcase');
            if (savedUrl) {
              newImages[i] = savedUrl;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        await prisma.showcaseItem.update({
          where: { id: item.id },
          data: {
            image: newImage,
            images: newImages
          }
        });
        showcaseCount++;
      }
    }
    
    if (showcaseCount > 0) {
      logger.info(`[Migration] Successfully converted ${showcaseCount} showcase base64 items to static files.`);
    }

    // 2. Migrate Marketplace Products
    const products = await prisma.marketplaceProduct.findMany();
    let productCount = 0;

    for (const p of products) {
      let needsUpdate = false;
      let newImage = p.image;
      let newImages = [...p.images];

      // Check primary image
      if (p.image && p.image.startsWith('data:image')) {
        const savedUrl = saveBase64ImageToDisk(p.image, 'marketplace');
        if (savedUrl) {
          newImage = savedUrl;
          needsUpdate = true;
        }
      }

      // Check secondary images
      if (Array.isArray(p.images)) {
        for (let i = 0; i < p.images.length; i++) {
          const img = p.images[i];
          if (img && img.startsWith('data:image')) {
            const savedUrl = saveBase64ImageToDisk(img, 'marketplace');
            if (savedUrl) {
              newImages[i] = savedUrl;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        await prisma.marketplaceProduct.update({
          where: { id: p.id },
          data: {
            image: newImage,
            images: newImages
          }
        });
        productCount++;
      }
    }

    if (productCount > 0) {
      logger.info(`[Migration] Successfully converted ${productCount} marketplace base64 items to static files.`);
    }

    logger.info('[Migration] Base64 to physical files migration check finished successfully.');
  } catch (err: any) {
    logger.error('[Migration] Migration check failed:', err.message);
  }
};
