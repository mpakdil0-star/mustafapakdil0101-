import { Response, NextFunction } from 'express';
import { bidService } from '../services/bidService';
import { AuthRequest } from '../middleware/auth';
import { jobStoreById, saveMockJobs } from './jobController';
import { notifyUser } from '../server';
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
const userBidsStore = new Map<string, any[]>();

// Load bids on startup
loadMockBids();

export const createBidController = async (
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
        error: { message: 'Only electricians can place bids' },
      });
    }

    const bidData = {
      ...req.body,
      electricianId: req.user.id,
    };

    try {
      const bid = await bidService.createBid(bidData);

      // İş sahibine (vatandaşa) yeni teklif bildirimi gönder
      if (bid.jobPost?.citizenId) {
        notifyUser(bid.jobPost.citizenId, 'bid_received', {
          type: 'bid_received',
          bidId: bid.id,
          jobPostId: bid.jobPostId,
          jobTitle: bid.jobPost?.title || 'İş İlanı',
          amount: bid.amount,
          electricianName: bid.electrician?.fullName || 'Elektrikçi',
          message: `${bid.electrician?.fullName || 'Bir elektrikçi'} iş ilanınıza ${bid.amount} TL teklif verdi.`,
        });
      }

      res.status(201).json({
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

      // If database error, return mock bid
      if (isConnectionError || bidData.jobPostId?.startsWith('mock-') || req.user.id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, returning mock bid data');

        // Try to get job details from jobStoreById
        let job: any = jobStoreById.get(bidData.jobPostId);

        // If not found in store, try to get from mock jobs
        if (!job) {
          try {
            const { getMockJobs } = await import('./jobController');
            const mockJobsResult = getMockJobs();
            job = mockJobsResult.jobs.find((j: any) => j.id === bidData.jobPostId);
          } catch (e) {
            // Ignore - will use fallback job object
          }
        }

        const mockBid = {
          id: `mock-bid-${Date.now()}`,
          jobPostId: bidData.jobPostId,
          electricianId: req.user.id,
          amount: bidData.amount.toString(),
          estimatedDuration: bidData.estimatedDuration,
          estimatedStartDate: bidData.estimatedStartDate || new Date(),
          message: bidData.message,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          electrician: {
            id: req.user.id,
            fullName: req.user.email.split('@')[0] || 'Mock Electrician',
            profileImageUrl: null,
          },
          jobPost: job ? {
            id: job.id,
            title: job.title || 'Mock Job Post',
            description: job.description || '',
            status: job.status || 'BIDDING',
            location: job.location || { city: '', district: '' },
            citizen: job.citizen || null,
          } : {
            id: bidData.jobPostId,
            title: 'Mock Job Post',
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
        userBids.unshift(mockBid);
        userBidsStore.set(req.user.id, userBids);

        // Also store in global store and save to disk
        bidStoreById.set(mockBid.id, mockBid);
        saveMockBids();

        return res.status(201).json({
          success: true,
          data: { bid: mockBid },
        });
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
    const { id } = req.params;

    try {
      const bid = await bidService.getBidById(id);

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
      if (isConnectionError || id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, searching for bid in memory store');

        // Search in global store first (faster)
        let foundBid: any = bidStoreById.get(id);

        // Fallback to userBidsStore if needed (legacy check)
        if (!foundBid) {
          for (const [, bids] of userBidsStore.entries()) {
            const bid = bids.find((b: any) => b.id === id);
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

    // FAST PATH: If using mock data, return immediately without calling bidService
    // This avoids any potential Prisma initialization delays
    if (jobId.startsWith('mock-') || req.user?.id?.startsWith('mock-')) {
      console.log('⚡ Fast path: returning mock bids for job:', jobId);
      const bids = Array.from(bidStoreById.values()).filter(bid => bid.jobPostId === jobId);
      return res.json({
        success: true,
        data: { bids },
      });
    }

    try {
      const bids = await bidService.getJobBids(jobId, req.user?.id);
      res.json({
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
        dbError.code === 'MOCK_ID' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error and it's a mock ID, return bids from memory store
      if (isConnectionError || jobId.startsWith('mock-')) {
        console.warn('⚠️ Database not connected, searching for bids in memory store');

        // Filter bids by jobPostId from global store
        const bids = Array.from(bidStoreById.values()).filter(bid => bid.jobPostId === jobId);

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

    const { id } = req.params;

    try {
      const bid = await bidService.updateBid(id, req.user.id, req.body);

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
      if (isConnectionError || id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid update');

        // Find and update bid in memory store
        const userBids = userBidsStore.get(req.user.id) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === id);

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
        userBidsStore.set(req.user.id, userBids);

        // Update global store and save to disk
        bidStoreById.set(id, updatedBid);
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
        error: { message: 'Only job owners can accept bids' },
      });
    }

    const { id } = req.params;

    try {
      const bid = await bidService.acceptBid(id, req.user.id);

      // Elektrikçiye teklif kabul bildirimi gönder
      if (bid.electrician?.id) {
        notifyUser(bid.electrician.id, 'bid_accepted', {
          type: 'bid_accepted',
          bidId: bid.id,
          jobPostId: bid.jobPostId,
          message: `Teklifiniz kabul edildi! İş detaylarını görüntülemek için tıklayın.`,
        });
      }

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

      // If database error, handle mock bid accept
      if (isConnectionError || id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid accept');

        // Debug logging for 404 investigation
        console.log('🔍 [DEBUG] acceptBidController');
        console.log('Checking for bid ID:', id);
        console.log('Total bids in global store:', bidStoreById.size);
        console.log('Store Keys:', Array.from(bidStoreById.keys()));
        const foundBidContent = bidStoreById.get(id);
        console.log('Found Bid content:', foundBidContent ? 'YES' : 'NO');

        // Search in global store first (faster and more reliable)
        const foundBid: any = bidStoreById.get(id);

        if (!foundBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // Add ownerId for compatibility if missing
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

        // Update bid status to ACCEPTED
        const userBids = userBidsStore.get(foundBid.ownerId) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === id);
        if (bidIndex !== -1) {
          userBids[bidIndex].status = 'ACCEPTED';
          userBids[bidIndex].acceptedAt = new Date().toISOString();
          userBids[bidIndex].updatedAt = new Date().toISOString();
          userBidsStore.set(foundBid.ownerId, userBids);
        }

        const acceptedBid = { ...foundBid, status: 'ACCEPTED', acceptedAt: new Date().toISOString() };

        // Update global store and save to disk
        bidStoreById.set(id, acceptedBid);
        saveMockBids();

        // ALSO UPDATE JOB STATUS TO IN_PROGRESS
        const job = jobStoreById.get(acceptedBid.jobPostId);
        if (job) {
          job.status = 'IN_PROGRESS';
          job.updatedAt = new Date().toISOString();
          jobStoreById.set(job.id, job);
          saveMockJobs(); // Save job change to disk
        }

        return res.json({
          success: true,
          data: { bid: acceptedBid },
        });
      }

      throw dbError;
    }
  } catch (error) {
    next(error);
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

    const { id } = req.params;

    try {
      const bid = await bidService.rejectBid(id, req.user.id);

      // Elektrikçiye teklif red bildirimi gönder
      if (bid.electricianId) {
        notifyUser(bid.electricianId, 'bid_rejected', {
          type: 'bid_rejected',
          bidId: bid.id,
          jobPostId: bid.jobPostId,
          message: `Teklifiniz reddedildi.`,
        });
      }

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
      if (isConnectionError || id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid reject');

        // Search in global store first
        const foundBid: any = bidStoreById.get(id);

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
        const bidIndex = userBids.findIndex((b: any) => b.id === id);
        if (bidIndex !== -1) {
          userBids[bidIndex].status = 'REJECTED';
          userBids[bidIndex].rejectedAt = new Date().toISOString();
          userBids[bidIndex].updatedAt = new Date().toISOString();
          userBidsStore.set(foundBid.ownerId, userBids);
        }

        const rejectedBid = { ...foundBid, status: 'REJECTED', rejectedAt: new Date().toISOString() };

        // Update global store and save to disk
        bidStoreById.set(id, rejectedBid);
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

    const { id } = req.params;

    try {
      const bid = await bidService.withdrawBid(id, req.user.id);

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
      if (isConnectionError || id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid withdrawal');

        // Find bid in global store
        const existingBid: any = bidStoreById.get(id);

        if (!existingBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // Find and update bid in memory store for the user
        const userBids = userBidsStore.get(req.user.id) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === id);

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
        bidStoreById.set(id, existingBid);
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

    const { id } = req.params;

    try {
      const result = await bidService.deleteBid(id, req.user.id);

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
      if (isConnectionError || id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, handling mock bid deletion');

        // Check global store
        const existingBid = bidStoreById.get(id);

        if (!existingBid) {
          return res.status(404).json({
            success: false,
            error: { message: 'Bid not found' },
          });
        }

        // Find and remove bid from memory store
        const userBids = userBidsStore.get(req.user.id) || [];
        const bidIndex = userBids.findIndex((b: any) => b.id === id);

        // Remove bid from array
        userBids.splice(bidIndex, 1);
        // Remove bid from array
        userBids.splice(bidIndex, 1);
        userBidsStore.set(req.user.id, userBids);

        // Remove from global store and save to disk
        bidStoreById.delete(id);
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

