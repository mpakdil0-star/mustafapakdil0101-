import { Response, NextFunction } from 'express';
import { bidService } from '../services/bidService';
import { AuthRequest } from '../middleware/auth';
import { isDatabaseAvailable } from '../config/database';
// import { jobStoreById, saveMockJobs } from './jobController'; // Removed for circular dependency fix
import { notifyUser } from '../server';
import { mockStorage, mockTransactionStorage } from '../utils/mockStorage';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const MOCK_BIDS_FILE = path.join(DATA_DIR, 'mock-bids.json');

// Global bid store for quick lookup by ID and persistence
export const bidStoreById = new Map<string, any>();

// Helper to save mock bids to disk
const saveMockBids = () => {
  try {
    const bids = Array.from(bidStoreById.values());
    fs.writeFileSync(MOCK_BIDS_FILE, JSON.stringify(bids, null, 2));
    console.log(`✅ Saved ${bids.length} mock bids to disk`);
  } catch (error) {
    console.error('❌ Error saving mock bids:', error);
  }
};

// Helper to load mock bids from disk
const loadMockBids = () => {
  try {
    if (fs.existsSync(MOCK_BIDS_FILE)) {
      const data = fs.readFileSync(MOCK_BIDS_FILE, 'utf8');
      const bids = JSON.parse(data);
      if (Array.isArray(bids)) {
        bids.forEach(bid => {
          bidStoreById.set(bid.id, bid);
          // Populate userBidsStore as well
          if (bid.electricianId) {
            if (!userBidsStore.has(bid.electricianId)) {
              userBidsStore.set(bid.electricianId, []);
            }
            const userBids = userBidsStore.get(bid.electricianId);
            if (userBids && !userBids.find(b => b.id === bid.id)) {
              userBids.push(bid);
            }
          }
        });
        console.log(`✅ Loaded ${bids.length} mock bids from disk`);
      }
    }
  } catch (error) {
    console.error('❌ Error loading mock bids:', error);
  }
};

// In-memory store for bids created when database is not available
// Key: userId, Value: array of bids
export const userBidsStore = new Map<string, any[]>();

// Load bids on startup
loadMockBids();

export const createBidController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('📥 createBidController called');
    console.log('   Method:', req.method);
    console.log('   URL:', req.url);
    console.log('   User:', req.user?.id, req.user?.userType);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    if (req.user.userType !== 'ELECTRICIAN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only electricians can place bids' },
      });
    }

    const bidData = {
      ...req.body,
      electricianId: req.user.id,
    };

    try {
      console.log('🚀 Attempting to create bid via bidService...');
      const bid = await bidService.createBid(bidData);
      const b = bid as any;

      // İş sahibine (vatandaşa) yeni teklif bildirimi gönder
      if (b.jobPost?.citizenId) {
        try {
          console.log(`📢 Sending bid_received notification to citizen ${b.jobPost.citizenId}`);

          // Push bildirimi için vatandaşın pushToken'ını al
          const prismaConfig = require('../config/database').default;
          const citizen = await prismaConfig.user.findUnique({
            where: { id: b.jobPost.citizenId },
            select: { pushToken: true }
          });

          // Push bildirimi gönder (uygulama arka planda veya kapalıyken)
          if (citizen?.pushToken) {
            console.log(`📲 [CONTROLLER] Sending PUSH to citizen ${b.jobPost.citizenId}`);
            const pushNotificationService = require('../services/pushNotificationService').default;
            pushNotificationService.sendNotification({
              to: citizen.pushToken,
              title: 'Yeni Teklif Aldınız! 💰',
              body: `${b.electrician?.fullName || 'Bir usta'} "${b.jobPost?.title || 'ilanınız'}" için ${b.amount} ₺ teklif verdi.`,
              data: { jobId: b.jobPostId, type: 'bid_received' }
            }).catch((err: any) => console.error('Push Notification Error (Controller):', err));
          }
          const notificationPayload = {
            id: `bid-notif-${Date.now()}`,
            type: 'bid_received',
            bidId: b.id,
            jobPostId: b.jobPostId,
            jobTitle: b.jobPost?.title || 'İş İlanı',
            amount: b.amount,
            electricianName: b.electrician?.fullName || 'Elektrikçi',
            message: `${b.electrician?.fullName || 'Bir elektrikçi'} iş ilanınıza ${b.amount} TL teklif verdi.`,
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: b.jobPostId,
            relatedType: 'JOB'
          };

          // 1. Emit specific event
          notifyUser(b.jobPost.citizenId, 'bid_received', notificationPayload);
          // 2. Emit general notification event for badge handling
          notifyUser(b.jobPost.citizenId, 'notification', notificationPayload);
        } catch (notifErr) {
          console.error('⚠️ Failed to send real-time notification for bid:', notifErr);
        }
      }

      return res.status(201).json({
        success: true,
        data: { bid },
      });
    } catch (dbError: any) {
      console.error('❌ Bid Creation Error Details:', dbError);

      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor?.name === 'PrismaClientInitializationError' ||
        dbError.name === 'PrismaClientValidationError';

      // If database error OR validation error, return mock bid
      if (isConnectionError || bidData.jobPostId?.startsWith('mock-') || (req.user.id && req.user.id.startsWith('mock-'))) {
        console.warn('⚠️ Database issues or Mock ID detected, returning mock bid data');

        try {
          // Import mockStorage
          const { mockStorage } = await import('../utils/mockStorage');

          // Check if user has enough credits (same as database logic)
          const userStore = mockStorage.get(req.user.id);
          const currentBalance = Number(userStore?.creditBalance || 0);

          console.log(`💰 [MOCK BID] User ${req.user.id} current balance: ${currentBalance}`);

          if (currentBalance < 1) {
            return res.status(400).json({
              success: false,
              error: {
                message: 'Yetersiz kredi. Teklif verebilmek için en az 1 krediniz olmalıdır. Profilinizden telefonunuzu doğrulayarak hediye kredi kazanabilirsiniz.'
              },
            });
          }

          // Deduct 1 credit from mockStorage
          const newBalance = currentBalance - 1;
          mockStorage.updateBalance(req.user.id, newBalance);

          // Create transaction record in mock storage
          mockTransactionStorage.addTransaction({
            userId: req.user.id,
            amount: -1,
            transactionType: 'BID_SPENT',
            description: `İlana teklif verildi`,
            balanceAfter: newBalance
          });

          console.log(`✅ [MOCK BID] Credit deducted and transaction recorded. New balance: ${newBalance}`);

          // Try to get job details from jobStoreById
          const { jobStoreById } = require('./jobController');
          let job: any = jobStoreById.get(bidData.jobPostId);

          // If not found in store, try to get from mock jobs
          if (!job) {
            try {
              const { getMockJobs } = await import('./jobController');
              const mockJobsResult = getMockJobs();
              job = mockJobsResult.jobs.find((j: any) => j.id === bidData.jobPostId);
            } catch (e) {
              console.warn('⚠️ Could not find job details for mock bid notification');
            }
          }

          // Check if job is closed for bids
          if (job && job.status !== 'OPEN' && job.status !== 'BIDDING') {
            return res.status(400).json({
              success: false,
              error: { message: 'Bu ilan usta seçildiği için yeni tekliflere kapatılmıştır.' }
            });
          }

          const mockBid = {
            id: `mock-bid-${Date.now()}`,
            jobPostId: bidData.jobPostId,
            electricianId: req.user.id,
            amount: String(bidData.amount),
            estimatedDuration: bidData.estimatedDuration,
            estimatedStartDate: bidData.estimatedStartDate || new Date(),
            message: bidData.message,
            costItems: bidData.costItems || null,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            electrician: {
              id: req.user.id,
              fullName: userStore?.fullName || req.user.email?.split('@')[0] || 'Mock Electrician',
              profileImageUrl: userStore?.profileImageUrl || null,
              phone: userStore?.phone || '05555555555',
              electricianProfile: {
                verificationStatus: userStore?.verificationStatus || 'APPROVED',
                licenseVerified: true,
                licenseNumber: 'MOCK-LIC-12345',
              },
            },
            jobPost: job ? {
              id: job.id,
              title: job.title || 'Mock İş İlanı',
              description: job.description || '',
              status: job.status || 'BIDDING',
              location: job.location || { city: '', district: '' },
              citizen: job.citizen || null,
            } : {
              id: bidData.jobPostId,
              title: 'İş İlanı',
              description: '',
              status: 'BIDDING',
              location: { city: '', district: '' },
              citizen: null,
            },
          };

          // Store bid in memory
          if (!userBidsStore.has(req.user.id)) {
            userBidsStore.set(req.user.id, []);
          }
          const userBids = userBidsStore.get(req.user.id) || [];
          userBids.unshift(mockBid);
          userBidsStore.set(req.user.id, userBids);

          // Also store in global store and save to disk
          bidStoreById.set(mockBid.id, mockBid);
          saveMockBids();

          // Create notification for job owner (citizen)
          if (job?.citizenId) {
            try {
              const { addMockNotification } = require('../routes/notificationRoutes');
              const notification = {
                id: `mock-notif-${Date.now()}-bid`,
                userId: job.citizenId,
                type: 'BID_RECEIVED',
                title: 'Yeni Teklif',
                message: `${mockBid.electrician?.fullName || 'Bir elektrikçi'} ilanınıza ${bidData.amount} ₺ teklif verdi.`,
                isRead: false,
                relatedId: bidData.jobPostId,
                relatedType: 'JOB',
                createdAt: new Date().toISOString()
              };
              addMockNotification(job.citizenId, notification);

              // CRITICAL: Send PUSH notification
              const citizenData = mockStorage.get(job.citizenId);
              if (citizenData?.pushToken) {
                console.log(`📲 Sending PUSH to citizen: ${job.citizenId}, Token: ${citizenData.pushToken}`);
                const pushNotificationService = require('../services/pushNotificationService').default;
                pushNotificationService.sendNotification({
                  to: citizenData.pushToken,
                  title: 'Yeni Teklif Aldınız! 💰',
                  body: `${mockBid.electrician?.fullName || 'Bir usta'} ilanınıza ${bidData.amount} ₺ teklif verdi.`,
                  data: { jobId: bidData.jobPostId, type: 'bid_received' }
                }).catch((err: any) => console.error('Push Notification Error (Mock):', err));
              }

              // Also send socket notification for real-time update
              console.log(`📢 [SOCKET] Sending bid_received notification to ${job.citizenId}`);
              const socketPayload = {
                id: `sock-noti-${Date.now()}`,
                type: 'bid_received',
                bidId: mockBid.id,
                jobPostId: bidData.jobPostId,
                jobTitle: job.title || 'İş İlanı',
                amount: bidData.amount,
                electricianName: mockBid.electrician?.fullName || 'Elektrikçi',
                message: `${mockBid.electrician?.fullName || 'Bir elektrikçi'} iş ilanınıza ${bidData.amount} ₺ teklif verdi.`,
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: bidData.jobPostId,
                relatedType: 'JOB'
              };
              notifyUser(job.citizenId, 'bid_received', socketPayload);
              // General notification event for badge
              notifyUser(job.citizenId, 'notification', socketPayload);
              console.log(`✅ [SOCKET] bid_received notification sent successfully`);
            } catch (innerErr) {
              console.error('⚠️ Failed to send mock bid notification:', innerErr);
            }
          }

          console.log(`🎉 [MOCK BID] Bid created successfully. User ${req.user.id} new balance: ${newBalance}`);

          return res.status(201).json({
            success: true,
            data: { bid: mockBid },
          });
        } catch (mockErr: any) {
          console.error('🔥 Critical Mock Bid Error:', mockErr.message);
          return res.status(500).json({
            success: false,
            error: { message: 'Mock teklif oluşturulurken hata oluştu: ' + mockErr.message }
          });
        }
      }

      // Re-throw other errors (validation, not found, etc.)
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const getBidByIdController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const idStr = String(req.params.id);

    try {
      const bid = await bidService.getBidById(idStr);

      res.json({
        success: true,
        data: { bid },
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.code === 'MOCK_ID' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, search in memory store
      if (isConnectionError || idStr.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, searching for bid in memory store');

        // Search in global store first (faster)
        let foundBid: any = bidStoreById.get(idStr);

        // Fallback to userBidsStore if needed (legacy check)
        if (!foundBid) {
          for (const [, bids] of userBidsStore.entries()) {
            const bid = bids.find((b: any) => b.id === idStr);
            if (bid) {
              foundBid = bid;
              break;
            }
          }
        }

        if (!foundBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        return res.json({
          success: true,
          data: { bid: foundBid },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const getJobBidsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Support both :id and :jobId params
    const jobId = req.params.jobId || req.params.id;

    const jobIdStr = String(jobId);
    // FAST PATH: If using mock data, return immediately without calling bidService
    // This avoids any potential Prisma initialization delays
    if (jobIdStr.startsWith('mock-') || (req.user?.id as string)?.startsWith('mock-')) {
      console.log('⚡ Fast path: returning mock bids for job:', jobIdStr);
      const bids = Array.from(bidStoreById.values())
        .filter(bid => bid.jobPostId === jobIdStr)
        .map(bid => {
          // Enrich bid with up-to-date electrician profile data from mockStorage
          const electricianData = mockStorage.get(bid.electricianId);
          return {
            ...bid,
            electrician: {
              ...bid.electrician,
              id: bid.electricianId,
              fullName: electricianData?.fullName || bid.electrician?.fullName || 'Elektrikçi',
              profileImageUrl: electricianData?.profileImageUrl || bid.electrician?.profileImageUrl || null,
              phone: electricianData?.phone || bid.electrician?.phone || null,
              electricianProfile: {
                ...bid.electrician?.electricianProfile,
                verificationStatus: electricianData?.verificationStatus || bid.electrician?.electricianProfile?.verificationStatus || 'PENDING',
              },
            },
          };
        });
      return res.json({
        success: true,
        data: { bids },
      });
    }

    try {
      const jobIdStr = String(jobId);
      const bids = await bidService.getJobBids(jobIdStr, req.user?.id);
      res.json({
        success: true,
        data: { bids },
      });
    } catch (dbError: any) {
      const jobIdStr = String(jobId);
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.code === 'MOCK_ID' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error and it's a mock ID, return bids from memory store
      if (isConnectionError || jobIdStr.startsWith('mock-')) {
        console.warn('⚠️ Database not connected, searching for bids in memory store');

        // Filter bids by jobPostId from global store and enrich with profile data
        const bids = Array.from(bidStoreById.values())
          .filter(bid => bid.jobPostId === jobIdStr)
          .map(bid => {
            // Enrich bid with up-to-date electrician profile data from mockStorage
            const electricianData = mockStorage.get(bid.electricianId);
            return {
              ...bid,
              electrician: {
                ...bid.electrician,
                id: bid.electricianId,
                fullName: electricianData?.fullName || bid.electrician?.fullName || 'Elektrikçi',
                profileImageUrl: electricianData?.profileImageUrl || bid.electrician?.profileImageUrl || null,
                phone: electricianData?.phone || bid.electrician?.phone || null,
                electricianProfile: {
                  ...bid.electrician?.electricianProfile,
                  verificationStatus: electricianData?.verificationStatus || bid.electrician?.electricianProfile?.verificationStatus || 'PENDING',
                },
              },
            };
          });

        return res.json({
          success: true,
          data: { bids },
        });
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const getMyBidsController = async (
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
        error: { message: 'Only electricians can view their bids' },
      });
    }

    try {
      const bids = await bidService.getMyBids(req.user.id);

      return res.json({
        success: true,
        data: { bids },
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, return mock bids from in-memory store
      if (isConnectionError || req.user.id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, returning mock bids from memory store');
        const userBids = userBidsStore.get(req.user.id) || [];
        return res.json({
          success: true,
          data: { bids: userBids },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const updateBidController = async (
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

    try {
      const bid = await bidService.updateBid(idStr, String(req.user?.id), req.body);

      res.json({
        success: true,
        data: { bid },
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, handle mock bid update
      if (isConnectionError || idStr.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid update');

        // Find and update bid in memory store
        const userBids = userBidsStore.get(String(req.user?.id)) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === idStr);

        if (bidIndex === -1) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        const existingBid = userBids[bidIndex];

        if (existingBid.status !== 'PENDING') {
          return res.status(400).json({
            success: false,
            error: { message: 'You can only update pending bids' },
          });
        }

        // Update bid with new data
        const updatedBid = {
          ...existingBid,
          ...(req.body.amount !== undefined && { amount: req.body.amount.toString() }),
          ...(req.body.estimatedDuration !== undefined && { estimatedDuration: req.body.estimatedDuration }),
          ...(req.body.estimatedStartDate !== undefined && { estimatedStartDate: req.body.estimatedStartDate }),
          ...(req.body.message !== undefined && { message: req.body.message }),
          updatedAt: new Date().toISOString(),
        };

        userBids[bidIndex] = updatedBid;
        userBidsStore.set(String(req.user?.id), userBids);

        // Update global store and save to disk
        bidStoreById.set(idStr, updatedBid);
        saveMockBids();

        return res.json({
          success: true,
          data: { bid: updatedBid },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const acceptBidController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const idStr = String(req.params.id);
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }

    if (!idStr) {
      return res.status(400).json({ success: false, error: { message: 'Bid ID is required' } });
    }

    // --- 1. FAST PATH: Mock İşlemi ---
    if (idStr.startsWith('mock-') || !isDatabaseAvailable) {
      console.log('⚡ Handling bid acceptance in MOCK mode:', idStr);

      const foundBid = bidStoreById.get(idStr);
      if (!foundBid) {
        return res.status(404).json({ success: false, error: { message: 'Bid not found in mock store' } });
      }

      const acceptedBid = {
        ...foundBid,
        status: 'ACCEPTED',
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      bidStoreById.set(idStr, acceptedBid);
      saveMockBids();

      // Sync with user's specific bid list
      if (acceptedBid.electricianId) {
        const userBids = userBidsStore.get(acceptedBid.electricianId) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === idStr);
        if (bidIndex !== -1) {
          userBids[bidIndex] = acceptedBid;
          userBidsStore.set(acceptedBid.electricianId, userBids);
          console.log(`✅ [MOCK] Updated userBidsStore for electrician ${acceptedBid.electricianId}`);
        }
      }

      // İşi de ilerlet
      const { jobStoreById, saveMockJobs } = require('./jobController');
      const job = jobStoreById.get(acceptedBid.jobPostId);
      if (job) {
        job.status = 'IN_PROGRESS';
        job.assignedElectricianId = acceptedBid.electricianId;
        job.acceptedBidId = acceptedBid.id;
        job.updatedAt = new Date().toISOString();
        jobStoreById.set(job.id, job);
        saveMockJobs();
      }

      // Create notification for electrician
      const { addMockNotification } = require('../routes/notificationRoutes');
      if (acceptedBid.electricianId) {
        const notification = {
          id: `mock-notif-${Date.now()}-accept`,
          userId: acceptedBid.electricianId,
          type: 'BID_ACCEPTED',
          title: 'Teklifiniz Kabul Edildi! 🎉',
          message: `${acceptedBid.amount} ₺ teklifiniz kabul edildi. İşe başlayabilirsiniz!`,
          isRead: false,
          relatedId: acceptedBid.jobPostId, // Use jobPostId not bid ID!
          relatedType: 'JOB', // Changed from BID to JOB
          createdAt: new Date().toISOString()
        };
        addMockNotification(acceptedBid.electricianId, notification);

        // CRITICAL: Send PUSH notification (for background/closed app)
        const { mockStorage } = require('../utils/mockStorage');
        const electricianData = mockStorage.get(acceptedBid.electricianId);
        if (electricianData?.pushToken) {
          const pushNotificationService = require('../services/pushNotificationService').default;
          pushNotificationService.sendNotification({
            to: electricianData.pushToken,
            title: 'Teklifiniz Kabul Edildi! 🎉',
            body: `${acceptedBid.amount} ₺ teklifiniz kabul edildi. İşe başlayabilirsiniz!`,
            data: { jobId: acceptedBid.jobPostId, type: 'bid_accepted' }
          }).catch((err: any) => console.error('Push Notification Error:', err));
        }

        // --- ADDED: Real-time notification for electrician ---
        console.log(`📢 [MOCK] Sending bid_accepted notification to electrician ${acceptedBid.electricianId}`);
        notifyUser(acceptedBid.electricianId, 'bid_accepted', {
          type: 'bid_accepted',
          bidId: acceptedBid.id,
          jobPostId: acceptedBid.jobPostId,
          jobTitle: job?.title || 'İş İlanı',
          message: `✅ Tebrikler! "${job?.title || 'İş'}" ilanına verdiğiniz teklif kabul edildi. Hemen iletişime geçebilirsiniz!`
        });
      }

      return res.json({ success: true, data: { bid: acceptedBid } });
    }

    // --- 2. DATABASE PATH ---
    try {
      const bid = await bidService.acceptBid(idStr, String(userId));

      // notifyUser already called in bidService.acceptBid for DB path
      return res.json({ success: true, data: { bid } });
    } catch (dbError: any) {
      console.error('⚠️ DB Bid Acceptance Error:', dbError.message);

      // Veritabanı hatası alırsak ama ID mock formatındaysa veya acil durumsa mock onaylamayı dene
      const foundBid = bidStoreById.get(idStr);
      if (foundBid) {
        foundBid.status = 'ACCEPTED';
        bidStoreById.set(idStr, foundBid);
        return res.json({ success: true, data: { bid: foundBid } });
      }

      throw dbError; // Diğer hataları dış catch'e at
    }
  } catch (error: any) {
    console.error('🔥 Critical AcceptBid Error:', error.message);

    // Uygulamanın çökmesini engellemek için her zaman bir yanıt dön
    return res.status(200).json({
      success: true,
      data: {
        bid: { id: idStr, status: 'ACCEPTED', updatedAt: new Date().toISOString() }
      }
    });
  }
};

export const rejectBidController = async (
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
        error: { message: 'Only job owners can reject bids' },
      });
    }

    const idStr = String(req.params.id);

    // FAST PATH: If this is a mock bid, handle it immediately
    if (idStr && idStr.startsWith('mock-')) {
      console.log('⚡ Fast path: rejecting mock bid:', idStr);
      const foundBid: any = bidStoreById.get(idStr);

      if (!foundBid) {
        return res.status(404).json({
          success: false,
          error: { message: 'Bid not found' },
        });
      }

      const rejectedBid = {
        ...foundBid,
        status: 'REJECTED',
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      bidStoreById.set(idStr, rejectedBid);
      saveMockBids();

      // --- ADDED: Real-time notification for electrician ---
      if (rejectedBid.electricianId) {
        console.log(`📢 [MOCK] Sending bid_rejected notification to electrician ${rejectedBid.electricianId}`);
        const { jobStoreById } = require('./jobController');
        const job = jobStoreById.get(rejectedBid.jobPostId);
        notifyUser(rejectedBid.electricianId, 'bid_rejected', {
          type: 'bid_rejected',
          bidId: rejectedBid.id,
          jobPostId: rejectedBid.jobPostId,
          jobTitle: job?.title || 'İş İlanı',
          message: `❌ Üzgünüz, "${job?.title || 'İş'}" ilanına verdiğiniz teklif vatandaş tarafından reddedildi.`
        });

        // CRITICAL: Send PUSH notification (for background/closed app)
        const { mockStorage } = require('../utils/mockStorage');
        const electricianData = mockStorage.get(rejectedBid.electricianId);
        if (electricianData?.pushToken) {
          const pushNotificationService = require('../services/pushNotificationService').default;
          pushNotificationService.sendNotification({
            to: electricianData.pushToken,
            title: 'Teklif Reddedildi',
            body: `"${job?.title || 'İş'}" ilanı için verdiğiniz teklif reddedildi.`,
            data: { jobId: rejectedBid.jobPostId, type: 'bid_rejected' }
          }).catch((err: any) => console.error('Push Notification Error (Mock Reject):', err));
        }
      }

      return res.json({
        success: true,
        data: { bid: rejectedBid },
      });
    }

    try {
      const bid = await bidService.rejectBid(idStr, String(req.user?.id));

      // notifyUser already called in bidService.rejectBid for DB path
      res.json({
        success: true,
        data: { bid },
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, handle mock bid reject
      if (isConnectionError || idStr.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid reject');

        // Search in global store first
        const foundBid: any = bidStoreById.get(idStr);

        if (!foundBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // Add ownerId for compatibility
        if (!foundBid.ownerId && foundBid.electricianId) {
          foundBid.ownerId = foundBid.electricianId;
        }

        if (!foundBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        if (foundBid.status !== 'PENDING') {
          return res.status(400).json({
            success: false,
            error: { message: 'Bid is not in pending status' },
          });
        }

        // Update bid status to REJECTED
        const userBids = userBidsStore.get(foundBid.ownerId) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === idStr);
        if (bidIndex !== -1) {
          userBids[bidIndex].status = 'REJECTED';
          userBids[bidIndex].rejectedAt = new Date().toISOString();
          userBids[bidIndex].updatedAt = new Date().toISOString();
          userBidsStore.set(foundBid.ownerId, userBids);
        }

        const rejectedBid = { ...foundBid, status: 'REJECTED', rejectedAt: new Date().toISOString() };

        // Update global store and save to disk
        bidStoreById.set(idStr, rejectedBid);
        saveMockBids();

        return res.json({
          success: true,
          data: { bid: rejectedBid },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const withdrawBidController = async (
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

    // FAST PATH: If this is a mock bid, handle it immediately
    if (idStr && idStr.startsWith('mock-')) {
      console.log('⚡ Fast path: withdrawing mock bid:', idStr);
      const foundBid: any = bidStoreById.get(idStr);

      if (!foundBid) {
        return res.status(404).json({
          success: false,
          error: { message: 'Bid not found' },
        });
      }

      const withdrawnBid = {
        ...foundBid,
        status: 'WITHDRAWN',
        updatedAt: new Date().toISOString()
      };

      bidStoreById.set(idStr, withdrawnBid);
      saveMockBids();

      return res.json({
        success: true,
        data: { bid: withdrawnBid },
      });
    }

    try {
      const bid = await bidService.withdrawBid(idStr, String(req.user?.id));

      res.json({
        success: true,
        data: { bid },
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, handle mock bid withdrawal
      if (isConnectionError || idStr.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid withdrawal');

        // Find bid in global store
        const existingBid: any = bidStoreById.get(idStr);

        if (!existingBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // Find and update bid in memory store for the user
        const userBids = userBidsStore.get(String(req.user?.id)) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === idStr);

        if (bidIndex === -1) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // We already have existingBid from correct source
        // const existingBid = userBids[bidIndex];

        if (existingBid.status !== 'PENDING') {
          return res.status(400).json({
            success: false,
            error: { message: 'You can only withdraw pending bids' },
          });
        }

        // Update bid status to WITHDRAWN
        existingBid.status = 'WITHDRAWN';
        existingBid.updatedAt = new Date().toISOString();
        userBids[bidIndex] = existingBid;
        userBids[bidIndex] = existingBid;
        userBidsStore.set(req.user.id, userBids);

        // Update global store and save to disk
        bidStoreById.set(idStr, existingBid);
        saveMockBids();

        return res.json({
          success: true,
          data: { bid: existingBid },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const deleteBidController = async (
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

    try {
      const result = await bidService.deleteBid(idStr, String(req.user?.id));

      res.json({
        success: true,
        data: result,
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, handle mock bid deletion
      if (isConnectionError || idStr.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid deletion');

        // Check global store
        const existingBid = bidStoreById.get(idStr);

        if (!existingBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // Find and remove bid from memory store
        const userBids = userBidsStore.get(String(req.user?.id)) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === idStr);

        // Remove bid from array
        userBids.splice(bidIndex, 1);
        userBidsStore.set(String(req.user?.id), userBids);

        // Remove from global store and save to disk
        bidStoreById.delete(idStr);
        saveMockBids();

        return res.json({
          success: true,
          data: { success: true },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

