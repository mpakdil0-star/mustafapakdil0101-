import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const FORUM_FILE = path.join(process.cwd(), 'data', 'forum.json');
const JOB_SHARING_FILE = path.join(process.cwd(), 'data', 'job_sharing.json');

// Helpers for Forum
const loadForum = (): any[] => {
  if (fs.existsSync(FORUM_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(FORUM_FILE, 'utf8'));
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};

const saveForum = (data: any[]) => {
  const dataDir = path.dirname(FORUM_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(FORUM_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// Helpers for Job Sharing
const loadJobSharing = (): any[] => {
  if (fs.existsSync(JOB_SHARING_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(JOB_SHARING_FILE, 'utf8'));
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};

const saveJobSharing = (data: any[]) => {
  const dataDir = path.dirname(JOB_SHARING_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(JOB_SHARING_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// ==================== FORUM ROUTES ====================
router.get('/forum', (req, res) => {
  res.json({ success: true, data: loadForum() });
});

router.post('/forum', (req, res) => {
  try {
    const forum = loadForum();
    const newPost = {
      id: `forum-${Date.now()}`,
      comments: [],
      ...req.body,
      createdAt: new Date().toISOString()
    };
    forum.unshift(newPost);
    saveForum(forum);
    res.status(201).json({ success: true, data: forum });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/forum/:id/comment', (req, res) => {
  try {
    const { id } = req.params;
    let forum = loadForum();
    const postIndex = forum.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    }
    const newComment = {
      id: `comment-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    forum[postIndex].comments.push(newComment);
    saveForum(forum);
    res.json({ success: true, data: forum });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ==================== JOB SHARING ROUTES ====================
router.get('/jobs', (req, res) => {
  res.json({ success: true, data: loadJobSharing() });
});

router.post('/jobs', (req, res) => {
  try {
    const jobs = loadJobSharing();
    const newJob = {
      id: `sharing-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    jobs.unshift(newJob);
    saveJobSharing(jobs);
    res.status(201).json({ success: true, data: jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
