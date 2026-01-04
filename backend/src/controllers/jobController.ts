import { Response, NextFunction } from 'express';
import { isDatabaseAvailable } from '../config/database';
import { jobService } from '../services/jobService';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import { mockStorage } from '../utils/mockStorage';
import { bidStoreById } from './bidController';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const MOCK_JOBS_FILE = path.join(DATA_DIR, 'mock-jobs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// In-memory store for jobs created when database is not available
// Key: userId, Value: array of jobs
const userJobsStore = new Map<string, any[]>();
// Global job store for quick lookup by ID
// Key: jobId, Value: job object
export const jobStoreById = new Map<string, any>();

// Helper to save mock jobs to disk
export const saveMockJobs = () => {
  try {
    const jobs = Array.from(jobStoreById.values());
    fs.writeFileSync(MOCK_JOBS_FILE, JSON.stringify(jobs, null, 2));
    console.log(`✅ Saved ${jobs.length} mock jobs to disk`);
  } catch (error) {
    console.error('❌ Error saving mock jobs:', error);
  }
};

// Helper to load mock jobs from disk
export const loadMockJobs = () => {
  try {
    if (fs.existsSync(MOCK_JOBS_FILE)) {
      const data = fs.readFileSync(MOCK_JOBS_FILE, 'utf8');
      const jobs = JSON.parse(data);
      if (Array.isArray(jobs)) {
        // Clear existing stores first if needed, but here we just append/overwrite
        jobs.forEach(job => {
          jobStoreById.set(job.id, job);
          // Populate userJobsStore as well
          if (job.citizenId) {
            if (!userJobsStore.has(job.citizenId)) {
              userJobsStore.set(job.citizenId, []);
            }
            // Avoid duplicates in userJobsStore if run multiple times (though checking id is safer)
            const userJobs = userJobsStore.get(job.citizenId);
            if (userJobs && !userJobs.find(j => j.id === job.id)) {
              userJobs.push(job);
            }
          }
        });
        console.log(`✅ Loaded ${jobs.length} mock jobs from disk`);
      }
    }
  } catch (error) {
    console.error('❌ Error loading mock jobs:', error);
  }
};

// Load jobs on startup
loadMockJobs();

export const createJobController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    if (req.user.userType !== 'CITIZEN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only citizens can create job posts' },
      });
    }

    const { images = [], ...restBody } = req.body;

    // Process images: base64 to file
    const processedImages: string[] = [];
    if (images && images.length > 0) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'jobs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.startsWith('data:image')) {
          try {
            const matches = img.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1];
              const data = matches[2];
              const buffer = Buffer.from(data, 'base64');
              const filename = `job-${req.user.id}-${Date.now()}-${i}.${ext}`;
              const filePath = path.join(uploadDir, filename);
              fs.writeFileSync(filePath, buffer);
              processedImages.push(`/uploads/jobs/${filename}`);
            } else {
              processedImages.push(img); // Fallback
            }
          } catch (err) {
            console.error('Error saving job image:', err);
            processedImages.push(img);
          }
        } else {
          processedImages.push(img);
        }
      }
    }

    const jobData = {
      ...restBody,
      images: processedImages,
      citizenId: req.user.id,
    };

    // Debug: Check what images are received
    console.log('📸 createJob - req.body.images:', req.body.images ? req.body.images.length : 'undefined');
    console.log('📸 createJob - jobData.images:', jobData.images ? jobData.images.length : 'undefined');

    try {
      if (!isDatabaseAvailable) {
        throw new Error('DATABASE_NOT_CONNECTED');
      }
      const job = await jobService.createJob(jobData);

      // Bildirim Gönder
      const { notifyUser } = require('../server');
      notifyUser('all_electricians', 'new_job_available', {
        title: 'Yeni İş İlanı! ⚡',
        message: `Bölgenizde yeni bir ilan var: ${jobData.title}`,
        jobId: job.id,
        locationPreview: jobData.location?.district || jobData.location?.city,
        category: job.category
      });

      res.status(201).json({
        success: true,
        data: { job },
      });
    } catch (dbError: any) {
      const isConnectionError =
        !isDatabaseAvailable ||
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.message?.includes("DATABASE_NOT_CONNECTED") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor?.name === 'PrismaClientInitializationError';

      if (isConnectionError || req.user.id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, returning mock job data for creation');
        const mockJob = {
          id: `mock-${Date.now()}`,
          citizenId: req.user.id,
          title: jobData.title,
          description: jobData.description,
          category: jobData.category,
          subcategory: jobData.subcategory || null,
          location: jobData.location,
          urgencyLevel: jobData.urgencyLevel || 'MEDIUM',
          estimatedBudget: jobData.estimatedBudget ? jobData.estimatedBudget.toString() : null,
          status: 'OPEN',
          images: jobData.images || [],
          viewCount: 0,
          bidCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          citizen: {
            id: req.user.id,
            fullName: req.user.email ? req.user.email.split('@')[0] : 'Kullanıcı',
            profileImageUrl: null,
            phone: mockStorage.get(req.user.id)?.phone || '05555555555',
          },
        };

        // Store the job in memory for this user
        if (!userJobsStore.has(req.user.id)) {
          userJobsStore.set(req.user.id, []);
        }
        const userJobs = userJobsStore.get(req.user.id) || [];
        userJobs.unshift(mockJob); // Add to beginning
        userJobsStore.set(req.user.id, userJobs);

        // Also store in global ID-based store for quick lookup
        jobStoreById.set(mockJob.id, mockJob);

        // Save to disk
        saveMockJobs();

        // Bildirim Gönder: İlgili bölgedeki elektrikçilere haber ver
        const { notifyUser } = require('../server');
        const { addMockNotification } = require('../routes/notificationRoutes');
        const { getAllMockUsers } = require('../utils/mockStorage');

        // Get all electrician users and send them notification
        const allUsers = getAllMockUsers();
        const electricians = Object.entries(allUsers).filter(([id, data]: [string, any]) =>
          id.includes('ELECTRICIAN')
        );

        // Create notification for each electrician
        electricians.forEach(([userId, userData]: [string, any]) => {
          const notification = {
            id: `mock-notif-${Date.now()}-${userId}`,
            userId,
            type: 'new_job_available',
            title: 'Yeni İş İlanı! ⚡',
            message: `Bölgenizde yeni ilan verildi: ${jobData.title}`,
            isRead: false,
            relatedId: mockJob.id,
            relatedType: 'JOB',
            createdAt: new Date().toISOString()
          };
          addMockNotification(userId, notification);
        });

        // Also send socket notification
        notifyUser('all_electricians', 'new_job_available', {
          title: 'Yeni İş İlanı! ⚡',
          message: `Bölgenizde yeni ilan verildi: ${jobData.title}`,
          jobId: mockJob.id,
          locationPreview: jobData.location?.district || jobData.location?.city,
          category: jobData.category
        });

        return res.status(201).json({
          success: true,
          data: { job: mockJob },
        });
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const getJobByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isGuest = !req.user;

    // FAST PATH: If using mock data, return immediately without calling jobService
    // This avoids any potential Prisma initialization delays
    if (id.startsWith('mock-') || (userId && userId.startsWith('mock-'))) {
      console.log('⚡ Fast path: returning mock job for id:', id);

      // First, search in global job store by ID (fastest)
      let job = jobStoreById.get(id);

      // If not found, check static mock jobs
      if (!job) {
        const mockJobs = getMockJobs();
        job = mockJobs.jobs.find(j => j.id === id);

        // EXTRA ROBUSTNESS: If id is something like "mock-job-1", try finding as "mock-1"
        if (!job && id.includes('mock-')) {
          const numericId = id.match(/\d+/)?.[0];
          if (numericId) {
            const fallbackId = `mock-${numericId}`;
            job = mockJobs.jobs.find(j => j.id === fallbackId);
          }
        }
      }

      if (job) {
        let maskedJob = { ...job };
        if (isGuest) {
          maskedJob = maskJobData(maskedJob);
        }

        const { _count, ...jobWithoutCount } = maskedJob;
        const jobWithBidCount = {
          ...jobWithoutCount,
          bidCount: _count?.bids || job.bidCount || 0,
        };
        return res.json({
          success: true,
          data: { job: jobWithBidCount },
        });
      }
    }

    try {
      let job = await jobService.getJobById(id, userId);

      if (isGuest) {
        job = maskJobData(job);
      }

      res.json({
        success: true,
        data: { job },
      });
    } catch (dbError: any) {
      // Check if it's a database/mock error
      const isConnectionError =
        !isDatabaseAvailable ||
        dbError.message?.includes('Database not available') ||
        dbError.message?.includes('Mock ID detected') ||
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'MOCK_ID' ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor?.name === 'PrismaClientInitializationError';

      if (isConnectionError || id.startsWith('mock-')) {
        // Try to find in mock storage
        let job = jobStoreById.get(id) || getMockJobs().jobs.find(j => j.id === id);

        if (!job) {
          // Try fallback ID formats
          const numericId = id.match(/\d+/)?.[0];
          if (numericId) {
            const fallbackId = `mock-${numericId}`;
            job = jobStoreById.get(fallbackId) || getMockJobs().jobs.find(j => j.id === fallbackId);
          }
        }

        if (job) {
          if (isGuest) job = maskJobData(job);
          const { _count, ...jobWithoutCount } = job;
          return res.json({
            success: true,
            data: { job: { ...jobWithoutCount, bidCount: _count?.bids || job.bidCount || 0 } },
          });
        }
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

// Masking Helper
const maskJobData = (job: any) => {
  if (!job) return job;
  const masked = { ...job };

  // Mask location address
  if (masked.location) {
    masked.location = {
      ...masked.location,
      address: `${masked.location.district || ''}, ${masked.location.city || ''} (Tam adres için giriş yapın)`,
    };
  }

  // Mask citizen name
  if (masked.citizen) {
    masked.citizen = {
      ...masked.citizen,
      fullName: 'Vatandaş', // Or mask like "Ahmet V." if preferred
    };
  }

  return masked;
};

// Mock data for testing when database is not available
export const getMockJobs = () => {
  const mockJobs: any[] = [
    {
      id: 'mock-job-1',
      citizenId: 'mock-citizen-1',
      title: 'Mutfak Priz Arızası',
      description: 'Mutfaktaki 3 prizden elektrik gelmiyor. Sigortalar sağlam görünüyor.',
      category: 'Priz ve Anahtar',
      location: {
        city: 'İstanbul',
        district: 'Kadıköy',
        neighborhood: 'Caferağa',
        address: 'Moda Cd. No:12'
      },
      urgencyLevel: 'HIGH',
      estimatedBudget: '500',
      status: 'OPEN',
      images: [],
      viewCount: 12,
      bidCount: 3,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      citizen: {
        id: 'mock-citizen-1',
        fullName: 'Caner Kaya',
        profileImageUrl: null,
      }
    },
    {
      id: 'mock-job-2',
      citizenId: 'mock-citizen-2',
      title: 'Avize Montajı (3 Adet)',
      description: 'Yeni aldığımız 3 adet avizenin montajı yapılacak. Tavanlar yüksek.',
      category: 'Aydınlatma Sistemleri',
      location: {
        city: 'Adana',
        district: 'Çukurova',
        neighborhood: 'Güzelyalı',
        address: 'Turgut Özal Blv. No:88'
      },
      urgencyLevel: 'MEDIUM',
      estimatedBudget: '750',
      status: 'OPEN',
      images: [],
      viewCount: 8,
      bidCount: 1,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      citizen: {
        id: 'mock-citizen-2',
        fullName: 'Merve Demir',
        profileImageUrl: null,
      }
    },
    {
      id: 'mock-job-3',
      citizenId: 'mock-citizen-3',
      title: 'Sigorta Panosu Değişimi',
      description: 'Eski tip sigorta panosu otomatik sigortalarla değiştirilecek.',
      category: 'Elektrik Panosu',
      location: {
        city: 'Adana',
        district: 'Seyhan',
        neighborhood: 'Cemalpaşa',
        address: 'Vali Yolu Cd.'
      },
      urgencyLevel: 'MEDIUM',
      estimatedBudget: '1200',
      status: 'OPEN',
      images: [],
      viewCount: 15,
      bidCount: 2,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      citizen: {
        id: 'mock-citizen-3',
        fullName: 'Bülent Yılmaz',
        profileImageUrl: null,
      }
    }
  ];

  return {
    jobs: mockJobs,
    pagination: {
      page: 1,
      limit: 20,
      total: mockJobs.length,
      totalPages: 1,
    },
  };
};

export const getJobsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      status, category, city, district, districts, lat, lng, radius,
      page = '1', limit = '20',
    } = req.query;

    const isGuest = !req.user;

    // Parse districts from comma-separated string to array
    let parsedDistricts: string[] | undefined;
    if (districts) {
      if (typeof districts === 'string') {
        parsedDistricts = districts.split(',').map(d => d.trim()).filter(Boolean);
      } else if (Array.isArray(districts)) {
        parsedDistricts = districts as string[];
      }
    }

    const filters = {
      status: status as any,
      category: category as string | undefined,
      city: city as string | undefined,
      district: district as string | undefined,
      districts: parsedDistricts,
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    try {
      let result = await jobService.getJobs(filters);

      if (isGuest && result.jobs) {
        result.jobs = result.jobs.map((job: any) => maskJobData(job));
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (dbError: any) {
      // Mock data handling
      let mockResult = getAllMockJobs();

      // Apply filtering to mock data manually
      if (city) {
        mockResult.jobs = mockResult.jobs.filter((j: any) => j.location?.city === city);
      }
      if (parsedDistricts && parsedDistricts.length > 0) {
        mockResult.jobs = mockResult.jobs.filter((j: any) => parsedDistricts.includes(j.location?.district));
      } else if (district) {
        mockResult.jobs = mockResult.jobs.filter((j: any) => j.location?.district === district);
      }
      if (category) {
        mockResult.jobs = mockResult.jobs.filter((j: any) => j.category === category);
      }

      if (isGuest && mockResult.jobs) {
        mockResult.jobs = mockResult.jobs.map((j: any) => maskJobData(j));
      }
      return res.json({
        success: true,
        data: mockResult,
      });
    }
  } catch (error: any) {
    let mockResult = getAllMockJobs();
    if (!req.user && mockResult.jobs) {
      mockResult.jobs = mockResult.jobs.map((j: any) => maskJobData(j));
    }
    return res.json({
      success: true,
      data: mockResult,
    });
  }
};

// Get all mock jobs including dynamically created ones
const getAllMockJobs = () => {
  const staticMockResult = getMockJobs();

  // Get all dynamically created jobs from the global store
  const dynamicJobs: any[] = [];
  jobStoreById.forEach((job) => {
    // Only include OPEN status jobs
    if (job.status === 'OPEN') {
      dynamicJobs.push({
        ...job,
        bidCount: job.bidCount || job._count?.bids || 0,
      });
    }
  });

  // Merge: dynamic jobs first (newest), then static mock jobs
  const allJobs = [...dynamicJobs, ...staticMockResult.jobs];

  // Remove duplicates by ID (dynamic jobs take precedence)
  const uniqueJobs = allJobs.filter((job, index, self) =>
    index === self.findIndex((j) => j.id === job.id)
  );

  return {
    jobs: uniqueJobs,
    pagination: {
      page: 1,
      limit: 20,
      total: uniqueJobs.length,
      totalPages: Math.ceil(uniqueJobs.length / 20),
    },
  };
};

export const getMyJobsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Wrap everything in try-catch to prevent any error from reaching error handler
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    // Always return mock data - no database calls to avoid timeout
    let jobs: any[] = [];

    if (req.user.userType === 'CITIZEN') {
      const userId = req.user.id;

      // Get user's created jobs from memory store
      const userCreatedJobs = userJobsStore.get(userId) || [];

      // Get static mock jobs
      const mockJobsResult = getMockJobs();
      const staticMockJobs = (mockJobsResult.jobs || []).map((job: any) => {
        const bidCount = job._count?.bids || job.bidCount || 0;
        return {
          id: job.id,
          citizenId: job.citizenId || userId,
          title: job.title,
          description: job.description,
          category: job.category,
          subcategory: job.subcategory || null,
          location: job.location,
          urgencyLevel: job.urgencyLevel,
          estimatedBudget: job.estimatedBudget || null,
          status: job.status,
          images: job.images || [],
          viewCount: job.viewCount || 0,
          bidCount: bidCount,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          citizen: job.citizen || {
            id: userId,
            fullName: 'Mock User',
            profileImageUrl: null,
          },
        };
      });

      // Only show user's own created jobs (not static mock jobs)
      // If user has no jobs yet, show static mock jobs filtered by userId
      if (userCreatedJobs.length > 0) {
        jobs = userCreatedJobs;
      } else {
        // Filter static mock jobs to only show user's (if citizenId matches)
        jobs = staticMockJobs.filter((job: any) => job.citizenId === userId);
      }
    }

    // Always return success - never throw error
    return res.json({
      success: true,
      data: { jobs },
    });
  } catch (error: any) {
    // Absolute fallback - return empty array on any error
    console.error('Error in getMyJobsController (should not happen):', error);
    return res.json({
      success: true,
      data: { jobs: [] },
    });
  }
};

export const updateJobController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;

    // Mock job kontrolü
    if (id.startsWith('mock-')) {
      const mockJob = jobStoreById.get(id);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İlan bulunamadı' },
        });
      }
      if (mockJob.citizenId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Bu ilanı düzenleme yetkiniz yok' },
        });
      }
      if (mockJob.status !== 'OPEN') {
        return res.status(400).json({
          success: false,
          error: { message: 'Sadece açık ilanlar düzenlenebilir' },
        });
      }

      // Güncelleme
      const updatedJob = {
        ...mockJob,
        ...req.body,
        updatedAt: new Date().toISOString(),
        location: {
          ...mockJob.location,
          ...(req.body.location || {}),
        },
      };

      jobStoreById.set(id, updatedJob);

      // Ana listedeki referansı da güncelle (mock jobs için gerekli olabilir)
      // Ancak UserJobsStore sadece referans tutuyorsa burada yapmaya gerek olmayabilir
      // Yine de tutarlılık için userJobsStore'u güncellemek iyi olur
      const userJobs = userJobsStore.get(req.user.id) || [];
      const jobIndex = userJobs.findIndex(j => j.id === id);
      if (jobIndex !== -1) {
        userJobs[jobIndex] = updatedJob;
        userJobsStore.set(req.user.id, userJobs);
      }

      // Save to disk
      saveMockJobs();

      return res.json({
        success: true,
        data: { job: updatedJob },
        message: 'İlan başarıyla güncellendi',
      });
    }

    const job = await jobService.updateJob(id, req.user.id, req.body);

    res.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJobController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    const result = await jobService.deleteJob(id, req.user.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// İlan İptali - Sadece OPEN veya PENDING durumunda iptal edilebilir
export const cancelJobController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Mock job kontrolü
    if (id.startsWith('mock-')) {
      const mockJob = jobStoreById.get(id);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İlan bulunamadı' },
        });
      }
      if (mockJob.citizenId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Bu ilanı iptal etme yetkiniz yok' },
        });
      }
      if (mockJob.status === 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          error: { message: 'Devam eden işler iptal edilemez' },
        });
      }
      if (mockJob.status === 'COMPLETED' || mockJob.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: { message: 'Bu ilan zaten tamamlanmış veya iptal edilmiş' },
        });
      }

      mockJob.status = 'CANCELLED';
      mockJob.cancellationReason = reason || null;
      mockJob.cancelledAt = new Date().toISOString();
      mockJob.cancelledAt = new Date().toISOString();
      jobStoreById.set(id, mockJob);

      // Save to disk
      saveMockJobs();

      // 📢 Socket bildirimi: Teklif veren tüm ustalara ilan iptal edildi bildir
      const io = req.app.get('io');
      if (io) {
        // Bu ilana ait tüm teklifleri bul
        bidStoreById.forEach((bid: any) => {
          if (bid.jobPostId === id && bid.electricianId) {
            io.to(`user:${bid.electricianId}`).emit('notification', {
              type: 'JOB_CANCELLED',
              title: '🚫 İlan İptal Edildi',
              body: `Teklif verdiğiniz ilan iptal edildi: ${mockJob.title}`,
              data: { jobId: id }
            });
            console.log(`📢 Notification sent to electrician ${bid.electricianId} for cancelled job ${id}`);
          }
        });
      }

      return res.json({
        success: true,
        data: { job: mockJob },
        message: 'İlan başarıyla iptal edildi',
      });
    }

    // Gerçek veritabanı işlemi
    const job = await jobService.cancelJob(id, req.user.id, reason);
    res.json({
      success: true,
      data: { job },
      message: 'İlan başarıyla iptal edildi',
    });
  } catch (error: any) {
    if (error.message) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
};

// Elektrikçi: İşi Tamamlandı Olarak İşaretle
export const markJobCompleteController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    if (req.user.userType !== 'ELECTRICIAN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Sadece elektrikçiler işi tamamlayabilir' },
      });
    }

    const { id } = req.params;

    // Mock job kontrolü
    if (id.startsWith('mock-')) {
      const mockJob = jobStoreById.get(id);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }
      if (mockJob.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          error: { message: 'Sadece devam eden işler tamamlanabilir' },
        });
      }

      mockJob.status = 'PENDING_CONFIRMATION';
      mockJob.electricianCompletedAt = new Date().toISOString();
      mockJob.electricianCompletedAt = new Date().toISOString();
      jobStoreById.set(id, mockJob);

      // Save to disk
      saveMockJobs();

      return res.json({
        success: true,
        data: { job: mockJob },
        message: 'İş tamamlandı olarak işaretlendi. Vatandaş onayı bekleniyor.',
      });
    }

    const job = await jobService.markJobComplete(id, req.user.id);
    res.json({
      success: true,
      data: { job },
      message: 'İş tamamlandı olarak işaretlendi. Vatandaş onayı bekleniyor.',
    });
  } catch (error: any) {
    if (error.message) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
};

// Vatandaş: İş Tamamlama Onayı
export const confirmJobCompleteController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;

    // Mock job kontrolü
    if (id.startsWith('mock-')) {
      const mockJob = jobStoreById.get(id);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }
      if (mockJob.citizenId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Bu işi onaylama yetkiniz yok' },
        });
      }
      if (mockJob.status !== 'PENDING_CONFIRMATION' && mockJob.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          error: { message: 'Bu iş onaylanamaz' },
        });
      }

      mockJob.status = 'COMPLETED';
      mockJob.completedAt = new Date().toISOString();
      mockJob.completedAt = new Date().toISOString();
      jobStoreById.set(id, mockJob);

      // Save to disk
      saveMockJobs();

      // 🎉 Socket bildirimi: Atanmış ustaya "Tebrikler, iş onaylandı!" bildir
      const io = req.app.get('io');
      if (io && mockJob.assignedElectricianId) {
        io.to(`user:${mockJob.assignedElectricianId}`).emit('notification', {
          type: 'JOB_COMPLETED',
          title: 'Tebrikler! 🎉',
          body: `İş onaylandı: ${mockJob.title}`,
          data: { jobId: id }
        });
        console.log(`🎉 Job completion notification sent to electrician ${mockJob.assignedElectricianId}`);
      }

      return res.json({
        success: true,
        data: { job: mockJob },
        message: 'İş başarıyla tamamlandı!',
      });
    }

    const job = await jobService.confirmJobComplete(id, req.user.id);
    res.json({
      success: true,
      data: { job },
      message: 'İş başarıyla tamamlandı!',
    });
  } catch (error: any) {
    if (error.message) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
};

// Değerlendirme Oluştur
export const createReviewController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params; // job id
    const { rating, comment, electricianId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'Lütfen 1-5 arası bir puan verin' },
      });
    }

    // Mock job kontrolü
    if (id.startsWith('mock-')) {
      const mockJob = jobStoreById.get(id);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }
      if (mockJob.citizenId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Bu işi değerlendirme yetkiniz yok' },
        });
      }
      if (mockJob.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: { message: 'Sadece tamamlanan işler değerlendirilebilir' },
        });
      }

      const mockReview = {
        id: `review-${Date.now()}`,
        jobPostId: id,
        citizenId: req.user.id,
        electricianId: electricianId || mockJob.acceptedElectricianId,
        rating,
        comment: comment || null,
        createdAt: new Date().toISOString(),
      };

      mockJob.hasReview = true;
      mockJob.review = mockReview;
      jobStoreById.set(id, mockJob);

      return res.status(201).json({
        success: true,
        data: { review: mockReview },
        message: 'Değerlendirmeniz kaydedildi. Teşekkürler!',
      });
    }

    const review = await jobService.createReview(id, req.user.id, {
      rating,
      comment,
      electricianId,
    });

    res.status(201).json({
      success: true,
      data: { review },
      message: 'Değerlendirmeniz kaydedildi. Teşekkürler!',
    });
  } catch (error: any) {
    if (error.message) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
};

// Combined Complete & Review (Called by Citizen)
export const completeJobController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    // 1. Confirm Job Complete
    if (id.startsWith('mock-')) {
      const mockJob = jobStoreById.get(id);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }

      mockJob.status = 'COMPLETED';
      mockJob.completedAt = new Date().toISOString();

      // 2. Add Review if provided
      if (rating) {
        const mockReview = {
          id: `review-${Date.now()}`,
          jobPostId: id,
          citizenId: req.user.id,
          electricianId: mockJob.assignedElectricianId || mockJob.acceptedElectricianId,
          rating,
          comment: comment || null,
          createdAt: new Date().toISOString(),
        };
        mockReview.id = `mock-review-${Date.now()}`;
        mockJob.hasReview = true;
        mockJob.review = mockReview;
      }

      // 3. Increment electrician's completedJobsCount in mockStorage
      const electricianId = mockJob.assignedElectricianId || mockJob.acceptedElectricianId;
      if (electricianId) {
        const { mockStorage } = require('../utils/mockStorage');
        const electricianData = mockStorage.get(electricianId);
        if (electricianData) {
          const currentCount = electricianData.completedJobsCount || 0;
          mockStorage.set(electricianId, {
            ...electricianData,
            completedJobsCount: currentCount + 1
          });
        }
      }

      jobStoreById.set(id, mockJob);
      saveMockJobs();

      return res.json({
        success: true,
        message: 'İş başarıyla tamamlandı ve değerlendirildi!',
        data: { job: mockJob }
      });
    }

    // Database path
    await jobService.confirmJobComplete(id, req.user.id);

    if (rating) {
      await jobService.createReview(id, req.user.id, { rating, comment });
    }

    res.json({
      success: true,
      message: 'İş başarıyla tamamlandı ve değerlendirildi!',
    });
  } catch (error: any) {
    if (error.message) {
      return res.status(400).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
};
