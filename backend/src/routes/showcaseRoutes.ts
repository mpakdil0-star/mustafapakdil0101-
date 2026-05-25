import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma, { isDatabaseAvailable } from '../config/database';

const router = Router();
const SHOWCASE_FILE = path.join(process.cwd(), 'data', 'showcase.json');

// Helper to save a base64 image to local uploads disk and return its static URL
const saveBase64Image = (base64Str: string, req: any): string => {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str; // Return as-is if already a URL
  }

  try {
    // Extract base64 content
    const matches = base64Str.match(/^data:image\/([A-Za-z+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Create showcase upload directory if not exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'showcase');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `showcase-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, buffer);

    // Build absolute URL using host headers dynamically
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/showcase/${fileName}`;
  } catch (error) {
    console.error('Failed to save base64 image to disk:', error);
    return base64Str;
  }
};

// Helper to save data
const saveShowcase = (data: any[]) => {
  const dataDir = path.dirname(SHOWCASE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(SHOWCASE_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// Helper to load data
const loadShowcase = (): any[] => {
  if (fs.existsSync(SHOWCASE_FILE)) {
    try {
      const content = fs.readFileSync(SHOWCASE_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse showcase products:', e);
    }
  }
  return [];
};

// GET /api/v1/showcase - Get all showcase items
router.get('/', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const items = await prisma.showcaseItem.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: items });
    }
    
    const items = loadShowcase();
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Error fetching showcase items:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// POST /api/v1/showcase - Add new showcase item
router.post('/', async (req, res) => {
  try {
    let { title, description, image, images, ustaId, ustaName, ustaCity, ustaAvatar } = req.body;

    // Convert base64 images to file-based URLs
    if (image) {
      image = saveBase64Image(image, req);
    }
    if (Array.isArray(images)) {
      images = images.map(img => saveBase64Image(img, req));
    }

    if (isDatabaseAvailable) {
      await prisma.showcaseItem.create({
        data: {
          title: title || '',
          description: description || '',
          image: image || '',
          images: images || [],
          ustaId: ustaId || '',
          ustaName: ustaName || '',
          ustaCity: ustaCity || '',
          ustaAvatar: ustaAvatar || null
        }
      });
      const items = await prisma.showcaseItem.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(201).json({ success: true, data: items });
    }

    const items = loadShowcase();
    const newItem = {
      id: `showcase-${Date.now()}`,
      title: title || '',
      description: description || '',
      image: image || '',
      images: images || [],
      ustaId: ustaId || '',
      ustaName: ustaName || '',
      ustaCity: ustaCity || '',
      ustaAvatar: ustaAvatar || null,
      createdAt: new Date().toISOString()
    };
    items.unshift(newItem);
    saveShowcase(items);
    res.status(201).json({ success: true, data: items });
  } catch (error: any) {
    console.error('Error creating showcase item:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/v1/showcase/:id - Delete showcase item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDatabaseAvailable) {
      try {
        await prisma.showcaseItem.delete({
          where: { id }
        });
      } catch (err) {
        console.warn(`Could not delete showcase item ${id} from DB (might be mock ID):`, err);
      }
      const items = await prisma.showcaseItem.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: items });
    }

    let items = loadShowcase();
    items = items.filter(item => item.id !== id);
    saveShowcase(items);
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Error deleting showcase item:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
