import { Response, NextFunction } from 'express';
import { isDatabaseAvailable } from '../config/database';
import { jobService } from '../services/jobService';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import { mockStorage, mockReviewStorage } from '../utils/mockStorage';
import { bidStoreById } from './bidController';
import { addMockNotification } from '../routes/notificationRoutes';
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
export const userJobsStore = new Map<string, any[]>();
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

// Helper to delete a mock job
export const deleteMockJob = (jobId: string) => {
  const job = jobStoreById.get(jobId);
  if (job) {
    // Remove from global store
    jobStoreById.delete(jobId);

    // Remove from user store
    if (job.citizenId && userJobsStore.has(job.citizenId)) {
      const userJobs = userJobsStore.get(job.citizenId) || [];
      const filtered = userJobs.filter(j => j.id !== jobId);
      userJobsStore.set(job.citizenId, filtered);
    }

    saveMockJobs();
    return true;
  }
  return false;
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

    if (req.user.userType !== 'CITIZEN' && req.user.userType !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only citizens can create job posts' },
      });
    }

    const { images = [], ...restBody } = req.body;

    // Process images: base64 to file
    // Process images: base64 to Cloudinary
    const processedImages: string[] = [];
    if (images && images.length > 0) {
      const cloudinary = require('../config/cloudinary').default;

      for (const img of images) {
        if (img.startsWith('data:image')) {
          try {
            const result = await cloudinary.uploader.upload(img, {
              folder: 'jobs',
              resource_type: 'image'
            });
            processedImages.push(result.secure_url);
          } catch (err) {
            console.error('Error uploading job image to Cloudinary:', err);
            // Fallback or skip? For now, maybe skip or push original if it's not too huge (but it is huge)
            // Better to skip or log error. pushing original might fail database constraints if too long.
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

      // Socket notifications are already handled inside jobService.createJob()
      // so we don't need redundant notifyUser call here.

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
        console.log('📦 Job Data Service Category:', jobData.serviceCategory);
        const mockJob = {
          id: `mock-${Date.now()}`,
          citizenId: req.user.id,
          title: jobData.title,
          description: jobData.description,
          serviceCategory: jobData.serviceCategory, // Ana hizmet kategorisi
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
            fullName: mockStorage.get(req.user.id)?.fullName || (req.user.email ? req.user.email.split('@')[0] : 'Kullanıcı'),
            profileImageUrl: mockStorage.get(req.user.id)?.profileImageUrl || null,
            phone: mockStorage.get(req.user.id)?.phone || null,
          },
        };

        // Store the job in memory
        if (!userJobsStore.has(req.user.id)) {
          userJobsStore.set(req.user.id, []);
        }
        const userJobs = userJobsStore.get(req.user.id) || [];
        userJobs.unshift(mockJob);
        userJobsStore.set(req.user.id, userJobs);
        jobStoreById.set(mockJob.id, mockJob);
        saveMockJobs();

        // Notification Logic
        const { notifyUser } = require('../server');
        const { addMockNotification } = require('../routes/notificationRoutes');
        const { getAllMockUsers } = require('../utils/mockStorage');

        const allUsers = getAllMockUsers();
        const jobServiceCategory = jobData.serviceCategory;
        const targetCity = jobData.location?.city;
        const targetDistrict = jobData.location?.district;
        const targetRooms: string[] = [];

        // 1. WebSocket Rooms Preparation
        if (jobServiceCategory && targetCity) {
          targetRooms.push(`area:${targetCity}:all:${jobServiceCategory}`);
          if (targetDistrict && targetDistrict !== 'Tüm Şehir' && targetDistrict !== 'Merkez') {
            targetRooms.push(`area:${targetCity}:${targetDistrict}:${jobServiceCategory}`);
          }
        }

        // 2. Iterate users for Mock Notifications and Push Notifications
        const isProjectJob = jobData.category === 'Elektrik Proje Çizimi';
        const electricians = Object.entries(allUsers).filter(([id, data]: [string, any]) => {
          // Notify ALL electricians in the region for all types of electrical jobs
          return data.userType === 'ELECTRICIAN' || data.userType === 'ADMIN';
        });

        console.log(`📡 Sending notifications. Job: ${jobServiceCategory}, Type: ${jobData.category}, Creator: ${req.user.id}`);
        console.log(`👥 Found ${electricians.length} total mock electricians`);

        const validPushTokens: string[] = [];

        electricians.forEach(([userId, userData]: [string, any]) => {
          // SKIP the current user (even if they have an electrician profile)
          if (req.user && userId === req.user.id) {
            return;
          }

          const ustaServiceCategory = userData.serviceCategory;
          const serviceCategoryMatch = ustaServiceCategory && jobServiceCategory && ustaServiceCategory === jobServiceCategory;

          // For projects, we also allow general electricians who are verified to see it if they match service category
          if (!serviceCategoryMatch) {
            return;
          }

          // RELAXED LOCATION MATCH:
          const hasNoLocationsSet = !userData.locations || userData.locations.length === 0;
          const simpleCityMatch = hasNoLocationsSet && userData.city?.toLowerCase() === targetCity?.toLowerCase();

          const hasExplicitLocationMatch = userData.locations?.some((loc: any) =>
            loc.isActive !== false && 
            loc.city?.toLowerCase() === targetCity?.toLowerCase() &&
            (
              !targetDistrict ||
              loc.district?.toLowerCase() === targetDistrict.toLowerCase() ||
              !loc.district ||
              loc.district === 'Tüm Şehir' ||
              loc.district === 'Merkez'
            )
          );

          const isMatch = simpleCityMatch || hasExplicitLocationMatch;

          if (isMatch) {
            console.log(`   ✅ ${isProjectJob ? 'VIP ' : ''}MATCH FOUND for ${userId} (${userData.email})`);

            // Internal Mock Notification
            const notification = {
              id: `mock-notif-${Date.now()}-${userId}`,
              userId,
              type: 'new_job_available',
              title: isProjectJob ? '📐 Yeni Proje İlanı (VIP) 🏗️' : 'Yeni İş İlanı! ⚡',
              message: isProjectJob 
                ? `Uzmanlık alanınızda yeni bir proje çizim ilanı var: ${jobData.title}`
                : `Bölgenizde yeni ilan verildi: ${jobData.title}`,
              isRead: false,
              relatedId: mockJob.id,
              relatedType: 'JOB',
              createdAt: new Date().toISOString()
            };
            addMockNotification(userId, notification);

            // REAL-TIME SOCKET (for badge update)
            try {
              console.log(`      📢 Emitting socket notification to ${userId}`);
              notifyUser(userId, 'notification', notification);
              notifyUser(userId, 'new_job_available', notification);
            } catch (sockErr) {
              console.error('      ❌ Socket emission failed:', sockErr);
            }

            // PUSH NOTIFICATION COLLECT
            if (userData.pushToken) {
              validPushTokens.push(userData.pushToken);
            }
          }
        });

        // BATCH PUSH NOTIFICATION (Queue/Rate limit'i önler)
        if (validPushTokens.length > 0) {
          console.log(`      📲 Sending PUSH to ${validPushTokens.length} valid tokens`);
          const pushNotificationService = require('../services/pushNotificationService').default;
          pushNotificationService.sendNotification({
            to: validPushTokens,
            title: isProjectJob ? '📐 Yeni Proje İlanı (VIP) 🏗️' : 'Yeni İş İlanı! ⚡',
            body: isProjectJob 
              ? `Uzmanlık alanınızda yeni bir proje çizim ilanı var: ${jobData.title}`
              : `Bölgenizde yeni ilan verildi: ${jobData.title}`,
            data: { jobId: mockJob.id, type: 'new_job_available' }
          }).catch((err: any) => console.error('      ❌ Push Notification Error:', err));
        }

        // 3. Send Socket Notifications
        console.log(`📡 [Socket] Target rooms for new_job_available: ${targetRooms.length > 0 ? targetRooms.join(', ') : 'NONE'}`);

        if (targetRooms.length > 0) {
          notifyUser(targetRooms, 'notification', {
            id: `sock-noti-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: 'new_job_available',
            title: 'Yeni İş İlanı! ⚡',
            message: `Bölgenizde yeni ilan verildi: ${jobData.title}`,
            jobId: mockJob.id,
            creatorId: req.user.id,
            locationPreview: targetDistrict || targetCity,
            category: jobData.category,
            serviceCategory: jobServiceCategory,
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: mockJob.id,
            relatedType: 'JOB'
          });
        } else {
          console.warn('⚠️ No target rooms for new job notification (Missing category or city)');
        }

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
    const idStr = String(id);
    const userIdStr = userId ? String(userId) : '';
    if (idStr.startsWith('mock-') || userIdStr.startsWith('mock-')) {
      console.log('⚡ Fast path: returning mock job for id:', id);

      // First, search in global job store by ID (fastest)
      let job = jobStoreById.get(idStr);

      // If not found, check static mock jobs
      if (!job) {
        const mockJobs = getMockJobs();
        job = mockJobs.jobs.find(j => j.id === idStr);

        // EXTRA ROBUSTNESS: If id is something like "mock-job-1", try finding as "mock-1"
        if (!job && idStr.includes('mock-')) {
          const numericId = idStr.match(/\d+/)?.[0];
          if (numericId) {
            const fallbackId = `mock-${numericId}`;
            job = mockJobs.jobs.find(j => j.id === fallbackId);
          }
        }
      }

      if (job) {
        // Enrich citizen data with profile info from mockStorage
        if (job.citizenId) {
          const citizenData = mockStorage.get(job.citizenId);
          job = {
            ...job,
            citizen: {
              ...job.citizen,
              id: job.citizenId,
              fullName: citizenData?.fullName || job.citizen?.fullName || 'Müşteri',
              profileImageUrl: citizenData?.profileImageUrl || job.citizen?.profileImageUrl || null,
              phone: citizenData?.phone || job.citizen?.phone || null,
            },
          };
        }

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
      const idStr = String(id);
      let job = await jobService.getJobById(idStr, userIdStr);

      if (isGuest) {
        job = maskJobData(job);
      }

      res.json({
        success: true,
        data: { job },
      });
    } catch (dbError: any) {
      const idStr = String(id);
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

      if (isConnectionError || idStr.startsWith('mock-')) {
        // Try to find in mock storage
        let job = jobStoreById.get(idStr) || getMockJobs().jobs.find(j => j.id === idStr);

        if (!job) {
          // Try fallback ID formats
          const numericId = idStr.match(/\d+/)?.[0];
          if (numericId) {
            const fallbackId = `mock-${numericId}`;
            job = jobStoreById.get(fallbackId) || getMockJobs().jobs.find(j => j.id === fallbackId);
          }
        }

        if (job) {
          // Enrich citizen data with profile info from mockStorage
          if (job.citizenId) {
            const citizenData = mockStorage.get(job.citizenId);
            job = {
              ...job,
              citizen: {
                ...job.citizen,
                id: job.citizenId,
                fullName: citizenData?.fullName || job.citizen?.fullName || 'Müşteri',
                profileImageUrl: citizenData?.profileImageUrl || job.citizen?.profileImageUrl || null,
                phone: citizenData?.phone || job.citizen?.phone || null,
              },
            };
          }

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
      status, category, serviceCategory, city, district, districts, lat, lng, radius,
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
      serviceCategory: serviceCategory as string | undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    try {
      let result = await jobService.getJobs({
        ...filters,
        currentUserId: req.user?.id
      });

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
      // NEW: Filter by serviceCategory logic
      // This is crucial for distinguishing between Electrician vs Plumber jobs
      const serviceCategoryParam = req.query.serviceCategory as string;
      if (serviceCategoryParam) {
        mockResult.jobs = mockResult.jobs.filter((j: any) =>
          // Match exact serviceCategory 'tesisat' === 'tesisat'
          j.serviceCategory === serviceCategoryParam ||
          // Fallback: If job has no serviceCategory, assume 'elektrik' (legacy support)
          (!j.serviceCategory && serviceCategoryParam === 'elektrik')
        );
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
export const getAllMockJobs = () => {
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
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const userId = req.user.id;
    const userType = req.user.userType;
    let jobs: any[] = [];

    let isMockFallback = false;

    // Try DB fetch first
    try {
      if (isDatabaseAvailable && !userId.startsWith('mock-')) {
        jobs = await jobService.getMyJobs(userId, userType);
        return res.json({
          success: true,
          data: { jobs },
        });
      } else {
        isMockFallback = true;
      }
    } catch (dbError: any) {
      console.warn('⚠️ DB fetch for my jobs failed, falling back to mock jobs');
      isMockFallback = true;
    }

    if (isMockFallback) {
      if (userType === 'CITIZEN' || userType === 'ADMIN') {
        const userCreatedJobs = userJobsStore.get(userId) || [];
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

        if (userCreatedJobs.length > 0) {
          jobs = userCreatedJobs;
        } else {
          jobs = staticMockJobs.filter((job: any) => job.citizenId === userId);
        }
      } else {
        // Mock fallback for electricians (empty for now)
        jobs = [];
      }
    }

    return res.json({
      success: true,
      data: { jobs },
    });
  } catch (error: any) {
    console.error('Error in getMyJobsController:', error);
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

    const idStr = String(req.params.id);

    // Mock job kontrolü
    if (idStr.startsWith('mock-')) {
      const mockJob = jobStoreById.get(idStr);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İlan bulunamadı' },
        });
      }
      if (mockJob.citizenId !== String(req.user.id)) {
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

      jobStoreById.set(idStr, updatedJob);

      // Ana listedeki referansı da güncelle (mock jobs için gerekli olabilir)
      // Ancak UserJobsStore sadece referans tutuyorsa burada yapmaya gerek olmayabilir
      // Yine de tutarlılık için userJobsStore'u güncellemek iyi olur
      const userJobs = userJobsStore.get(String(req.user.id)) || [];
      const jobIndex = userJobs.findIndex(j => j.id === idStr);
      if (jobIndex !== -1) {
        userJobs[jobIndex] = updatedJob;
        userJobsStore.set(String(req.user.id), userJobs);
      }

      // Save to disk
      saveMockJobs();

      return res.json({
        success: true,
        data: { job: updatedJob },
        message: 'İlan başarıyla güncellendi',
      });
    }

    const job = await jobService.updateJob(idStr, String(req.user.id), req.body);

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

    const idStr = String(req.params.id);
    const result = await jobService.deleteJob(idStr, String(req.user.id));

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

    const idStr = String(req.params.id);
    const { reason } = req.body;

    // Mock job kontrolü
    if (idStr.startsWith('mock-')) {
      const mockJob = jobStoreById.get(idStr);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İlan bulunamadı' },
        });
      }
      if (mockJob.citizenId !== String(req.user.id)) {
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
      jobStoreById.set(idStr, mockJob);

      // Save to disk
      saveMockJobs();

      // 📢 Socket ve Kalıcı Bildirim: Teklif veren tüm ustalara ilan iptal edildi bildir
      console.log(`🔍 [DEBUG] Processing notifications for cancelled job ${idStr}`);

      // Bu ilana ait tüm teklifleri bul
      bidStoreById.forEach((bid: any) => {
        if (bid.jobPostId === idStr && bid.electricianId) {
          // 💰 KREDİ İADESİ: Teklif veren tüm ustalara 1 kredi iade et
          try {
            const { mockStorage } = require('../utils/mockStorage');
            mockStorage.addCredits(bid.electricianId, 1);
            console.log(`💰 [MOCK REFUND] 1 Credit refunded to electrician ${bid.electricianId}`);
          } catch (refundErr) {
            console.error('❌ Failed to refund mock credit:', refundErr);
          }

          const cancelMsg = `İlan iptal edildi: ${mockJob.title}. Teklif krediniz hesabınıza yüklenmiştir.${reason ? `\nSebep: ${reason}` : ''}`;
          const notificationData = {
            id: `notif-${Date.now()}-${bid.id}`,
            type: 'JOB_CANCELLED',
            title: '🚫 İlan İptal Edildi (Kredi İade)',
            message: cancelMsg,
            body: cancelMsg,
            jobId: idStr,
            relatedId: idStr,
            isRead: false,
            createdAt: new Date().toISOString()
          };

          // 1. Kalıcı bildirim merkezine ekle
          addMockNotification(bid.electricianId, notificationData);

          // 2. Anlık socket bildirimi gönder
          const io = req.app.get('io');
          if (io) {
            io.to(`user:${bid.electricianId}`).emit('notification', notificationData);
            console.log(`📢 Socket notification emitted to user:${bid.electricianId}`);
          }

          console.log(`📢 Notification processed for electrician ${bid.electricianId} for cancelled job ${idStr}`);
        }
      });

      return res.json({
        success: true,
        data: { job: mockJob },
        message: 'İlan başarıyla iptal edildi',
      });
    }

    // Gerçek veritabanı işlemi
    const job = await jobService.cancelJob(idStr, String(req.user.id), reason);
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

    const idStr = String(req.params.id);

    // Mock job kontrolü
    if (idStr.startsWith('mock-')) {
      const mockJob = jobStoreById.get(idStr);
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
      jobStoreById.set(idStr, mockJob);

      // Save to disk
      saveMockJobs();

      return res.json({
        success: true,
        data: { job: mockJob },
        message: 'İş tamamlandı olarak işaretlendi. Vatandaş onayı bekleniyor.',
      });
    }

    const job = await jobService.markJobComplete(idStr, String(req.user.id));
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

    const idStr = String(req.params.id);

    // Mock job kontrolü
    if (idStr.startsWith('mock-')) {
      const mockJob = jobStoreById.get(idStr);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }
      if (mockJob.citizenId !== String(req.user.id)) {
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
      jobStoreById.set(idStr, mockJob);

      // Save to disk
      saveMockJobs();

      // 🎉 Socket ve Kalıcı Bildirim: Atanmış ustaya "Tebrikler, iş onaylandı!" bildir
      if (mockJob.assignedElectricianId) {
        const notificationData = {
          id: `notif-${Date.now()}-complete`,
          type: 'JOB_COMPLETED',
          title: 'Tebrikler! 🎉',
          message: `İş tarafınızdan onaylandı: ${mockJob.title}`,
          body: `İş onaylandı: ${mockJob.title}`,
          jobId: idStr,
          relatedId: idStr,
          isRead: false,
          createdAt: new Date().toISOString()
        };

        // 1. Kalıcı bildirim merkezine ekle
        addMockNotification(mockJob.assignedElectricianId, notificationData);

        // 2. Anlık socket bildirimi gönder
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${mockJob.assignedElectricianId}`).emit('notification', notificationData);
          console.log(`🎉 Socket completion notification emitted to user:${mockJob.assignedElectricianId}`);
        }

        console.log(`🎉 Job completion notification processed for electrician ${mockJob.assignedElectricianId}`);
      }

      return res.json({
        success: true,
        data: { job: mockJob },
        message: 'İş başarıyla tamamlandı!',
      });
    }

    const job = await jobService.confirmJobComplete(idStr, String(req.user.id));
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

    const idStr = String(req.params.id); // job id
    const { rating, comment, electricianId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'Lütfen 1-5 arası bir puan verin' },
      });
    }

    // Mock job kontrolü
    if (idStr.startsWith('mock-')) {
      const mockJob = jobStoreById.get(idStr);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }
      if (mockJob.citizenId !== String(req.user.id)) {
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
        jobPostId: idStr,
        citizenId: String(req.user.id),
        electricianId: electricianId || mockJob.acceptedElectricianId,
        rating,
        comment: comment || null,
        createdAt: new Date().toISOString(),
      };

      mockJob.hasReview = true;
      mockJob.review = mockReview;
      jobStoreById.set(idStr, mockJob);

      return res.status(201).json({
        success: true,
        data: { review: mockReview },
        message: 'Değerlendirmeniz kaydedildi. Teşekkürler!',
      });
    }

    const review = await jobService.createReview(idStr, String(req.user.id), {
      rating: Number(rating),
      comment: comment ? String(comment) : undefined,
      electricianId: electricianId ? String(electricianId) : undefined,
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

    const idStr = String(req.params.id);
    const { rating, comment } = req.body;

    // 1. Confirm Job Complete
    if (idStr.startsWith('mock-')) {
      const mockJob = jobStoreById.get(idStr);
      if (!mockJob) {
        return res.status(404).json({
          success: false,
          error: { message: 'İş bulunamadı' },
        });
      }

      mockJob.status = 'COMPLETED';
      mockJob.completedAt = new Date().toISOString();

      // Get electrician ID
      const electricianId = mockJob.assignedElectricianId || mockJob.acceptedElectricianId;
      try {
        const logMsg = `[${new Date().toISOString()}] Job Completion: JobId=${idStr}, ElectricianId=${electricianId}, Assigned=${mockJob.assignedElectricianId}, Accepted=${mockJob.acceptedElectricianId}\n`;
        const logPath = path.join(process.cwd(), 'debug_output.txt');
        fs.appendFileSync(logPath, logMsg);
      } catch (e) { console.error('Log error', e); }

      console.log(`👷 Job Completion Debug: JobId=${idStr}, ElectricianId=${electricianId}`);
      console.log('👷 Assigned:', mockJob.assignedElectricianId, 'Accepted:', mockJob.acceptedElectricianId);

      // 2. Add Review if provided using mockReviewStorage
      if (rating && electricianId) {
        // require() removed, using top-level import

        // Get reviewer info from mockStorage if not available in req.user
        let reviewerName = (req.user as any).fullName;
        let reviewerImageUrl = (req.user as any).profileImageUrl || null;

        if (!reviewerName && req.user.id) {
          const reviewerData = mockStorage.get(req.user.id);
          reviewerName = reviewerData?.fullName || 'Müşteri';
          reviewerImageUrl = reviewerData?.profileImageUrl || null;
        }

        // Add review to mockReviewStorage
        const review = mockReviewStorage.addReview({
          electricianId: electricianId,
          reviewerId: req.user.id,
          reviewerName: reviewerName || 'Müşteri',
          reviewerImageUrl: reviewerImageUrl,
          rating: Number(rating),
          comment: comment || '',
          jobId: idStr
        });

        mockJob.hasReview = true;
        mockJob.review = review;
        console.log(`✅ Review added for electrician ${electricianId}`);
      }

      // 3. Increment electrician's completedJobsCount in mockStorage
      if (electricianId) {
        const electricianData = mockStorage.get(electricianId);
        if (electricianData) {
          const currentCount = electricianData.completedJobsCount || 0;
          console.log(`📊 Updating job count for ${electricianId}. Old: ${currentCount}, New: ${currentCount + 1}`);

          try {
            const logPath = path.join(process.cwd(), 'debug_output.txt');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] Updating count for ${electricianId}. Old: ${currentCount}, New: ${currentCount + 1}\n`);
          } catch (e) { console.error(e); }

          mockStorage.updateProfile(electricianId, {
            completedJobsCount: currentCount + 1
          });

          // Verify update
          const updatedData = mockStorage.get(electricianId);
          console.log(`✅ Verified new count: ${updatedData?.completedJobsCount}`);
        } else {
          console.warn(`⚠️ Electrician data not found for ID: ${electricianId}`);
        }
      } else {
        console.warn('⚠️ No electrician ID found for this job, cannot increment count.');
      }

      // Sync job status in userBidsStore (Electrician's My Bids list)
      if (electricianId) {
        try {
          const { userBidsStore } = require('./bidController');
          const bids = userBidsStore.get(electricianId) || [];
          const bidIndex = bids.findIndex((b: any) => b.jobPostId === idStr);

          if (bidIndex !== -1) {
            if (bids[bidIndex].jobPost) {
              bids[bidIndex].jobPost.status = 'COMPLETED';
              bids[bidIndex].jobPost.completedAt = new Date().toISOString();
            }
            userBidsStore.set(electricianId, bids);

            try {
              const logPath = path.join(process.cwd(), 'debug_output.txt');
              fs.appendFileSync(logPath, `[${new Date().toISOString()}] Synced bid status for electrician ${electricianId}\n`);
            } catch (e) { }
          }
        } catch (e) { console.error('Sync error:', e); }
      }

      // 4. Send Push Notification & In-App Notification to Electrician
      if (electricianId) {
        const electricianData = mockStorage.get(electricianId);
        const reviewerData = mockStorage.get(req.user.id);
        const reviewerName = reviewerData?.fullName || (req.user as any).fullName || 'Müşteri';
        const starText = rating ? '⭐'.repeat(Math.min(Number(rating), 5)) : '';
        const notifTitle = 'Yeni Değerlendirme ⭐';
        const notifBody = rating
          ? `${reviewerName} işinizi ${rating} yıldız ile değerlendirdi.${comment ? ` "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"` : ''}`
          : `${reviewerName} işi tamamlandı olarak işaretledi.`;

        // In-app notification
        const reviewNotification = {
          id: `mock-notif-review-${Date.now()}`,
          userId: electricianId,
          type: 'new_review',
          title: notifTitle,
          message: notifBody,
          isRead: false,
          relatedId: idStr,
          relatedType: 'JOB',
          createdAt: new Date().toISOString()
        };
        addMockNotification(electricianId, reviewNotification);

        // Push notification
        if (electricianData?.pushToken) {
          const pushNotificationService = require('../services/pushNotificationService').default;
          pushNotificationService.sendNotification({
            to: electricianData.pushToken,
            title: notifTitle,
            body: notifBody,
            data: { jobId: idStr, type: 'new_review' }
          }).catch((err: any) => console.error('Review Push Error:', err));
          console.log(`📱 Sending review push notification to ${electricianId}`);
        }

        // Socket notification
        try {
          const { notifyUser } = require('../server');
          notifyUser(electricianId, 'new_review', {
            title: notifTitle,
            message: notifBody,
            jobId: idStr,
            rating: Number(rating),
          });
        } catch (e) { console.error('Socket notify error:', e); }
      }

      jobStoreById.set(idStr, mockJob);
      saveMockJobs();

      return res.json({
        success: true,
        message: 'İş başarıyla tamamlandı ve değerlendirildi!',
        data: { job: mockJob }
      });
    }

    // Database path
    const jobId = idStr;
    const citizenId = String(req.user.id);
    await jobService.confirmJobComplete(jobId, citizenId);

    if (rating) {
      await jobService.createReview(jobId, citizenId, { 
        rating: Number(rating), 
        comment: comment ? String(comment) : undefined 
      });
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
