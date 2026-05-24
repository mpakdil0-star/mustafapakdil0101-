import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma, { isDatabaseAvailable } from '../config/database';

const router = Router();
const SHOWCASE_FILE = path.join(process.cwd(), 'data', 'showcase.json');

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
    if (isDatabaseAvailable) {
      const { title, description, image, images, ustaId, ustaName, ustaCity, ustaAvatar } = req.body;
      await prisma.showcaseItem.create({
        data: {
          title: title || '',
          description: description || '',
          image: image || '',
          images: Array.isArray(images) ? images : [],
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
      ...req.body,
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
