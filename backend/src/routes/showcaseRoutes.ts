import { Router } from 'express';
import fs from 'fs';
import path from 'path';

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
router.get('/', (req, res) => {
  const items = loadShowcase();
  res.json({ success: true, data: items });
});

// POST /api/v1/showcase - Add new showcase item
router.post('/', (req, res) => {
  try {
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
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/v1/showcase/:id - Delete showcase item
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    let items = loadShowcase();
    items = items.filter(item => item.id !== id);
    saveShowcase(items);
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
