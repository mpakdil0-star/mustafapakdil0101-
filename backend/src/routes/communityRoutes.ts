import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma, { isDatabaseAvailable } from '../config/database';

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
router.get('/forum', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const posts = await prisma.forumPost.findMany({
        include: {
          comments: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: posts });
    }
    res.json({ success: true, data: loadForum() });
  } catch (error: any) {
    console.error('Error fetching forum posts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/forum', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const { title, description, imageUrl, ustaId, ustaName, ustaCity } = req.body;
      await prisma.forumPost.create({
        data: {
          title: title || '',
          description: description || '',
          imageUrl: imageUrl || null,
          ustaId: ustaId || '',
          ustaName: ustaName || '',
          ustaCity: ustaCity || null
        }
      });
      const posts = await prisma.forumPost.findMany({
        include: {
          comments: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(201).json({ success: true, data: posts });
    }

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
    console.error('Error creating forum post:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/forum/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isDatabaseAvailable) {
      const { text, ustaId, ustaName } = req.body;
      const postExists = await prisma.forumPost.findUnique({
        where: { id }
      });
      if (!postExists) {
        return res.status(404).json({ success: false, error: { message: 'Post not found' } });
      }
      await prisma.forumComment.create({
        data: {
          forumPostId: id,
          text: text || '',
          ustaId: ustaId || '',
          ustaName: ustaName || ''
        }
      });
      const posts = await prisma.forumPost.findMany({
        include: {
          comments: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: posts });
    }

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
    console.error('Error creating forum comment:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/v1/community/forum/:id - Delete forum post
router.delete('/forum/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDatabaseAvailable) {
      try {
        await prisma.forumPost.delete({
          where: { id }
        });
      } catch (err) {
        console.warn(`Could not delete forum post ${id} from DB:`, err);
      }
      const posts = await prisma.forumPost.findMany({
        include: {
          comments: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: posts });
    }

    let forum = loadForum();
    forum = forum.filter(post => post.id !== id);
    saveForum(forum);
    res.json({ success: true, data: forum });
  } catch (error: any) {
    console.error('Error deleting forum post:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ==================== JOB SHARING ROUTES ====================
router.get('/jobs', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const jobs = await prisma.jobSharingPost.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: jobs });
    }
    res.json({ success: true, data: loadJobSharing() });
  } catch (error: any) {
    console.error('Error fetching job sharing posts:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    if (isDatabaseAvailable) {
      const { title, description, ustaId, ustaName, ustaCity, ustaAvatar } = req.body;
      await prisma.jobSharingPost.create({
        data: {
          title: title || '',
          description: description || '',
          ustaId: ustaId || '',
          ustaName: ustaName || '',
          ustaCity: ustaCity || '',
          ustaAvatar: ustaAvatar || null
        }
      });
      const jobs = await prisma.jobSharingPost.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(201).json({ success: true, data: jobs });
    }

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
    console.error('Error creating job sharing post:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// DELETE /api/v1/community/jobs/:id - Delete job sharing post
router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDatabaseAvailable) {
      try {
        await prisma.jobSharingPost.delete({
          where: { id }
        });
      } catch (err) {
        console.warn(`Could not delete job sharing post ${id} from DB (might be mock ID):`, err);
      }
      const jobs = await prisma.jobSharingPost.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, data: jobs });
    }

    let jobs = loadJobSharing();
    jobs = jobs.filter(job => job.id !== id);
    saveJobSharing(jobs);
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('Error deleting job sharing post:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
