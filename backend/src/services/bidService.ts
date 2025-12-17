import prisma, { isDatabaseAvailable } from '../config/database';
import { BidStatus, JobStatus } from '@prisma/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface CreateBidData {
  jobPostId: string;
  electricianId: string;
  amount: number;
  estimatedDuration: number; // in hours
  estimatedStartDate?: Date;
  message: string;
}

export interface UpdateBidData {
  amount?: number;
  estimatedDuration?: number;
  estimatedStartDate?: Date;
  message?: string;
  status?: BidStatus;
}

export const bidService = {
  async createBid(data: CreateBidData) {
    const {
      jobPostId,
      electricianId,
      amount,
      estimatedDuration,
      estimatedStartDate,
      message,
    } = data;

    // Validation
    if (!amount || amount <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }

    if (!estimatedDuration || estimatedDuration <= 0) {
      throw new ValidationError('Estimated duration must be greater than 0');
    }

    if (!message || message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    // Check if job post exists and is open
    let jobPost;
    let electrician;

    try {
      jobPost = await prisma.jobPost.findUnique({
        where: { id: jobPostId },
        include: {
          bids: {
            where: {
              electricianId,
              status: {
                in: [BidStatus.PENDING, BidStatus.ACCEPTED],
              },
            },
          },
        },
      });

      if (!jobPost) {
        throw new NotFoundError('Job post not found');
      }

      if (jobPost.status !== JobStatus.OPEN && jobPost.status !== JobStatus.BIDDING) {
        throw new ValidationError('Job post is not accepting bids');
      }

      if (jobPost.citizenId === electricianId) {
        throw new ForbiddenError('You cannot bid on your own job post');
      }

      // Check if electrician already has a pending bid
      if (jobPost.bids.length > 0) {
        throw new ValidationError('You already have a bid on this job post');
      }

      // Check if user is an electrician
      electrician = await prisma.user.findUnique({
        where: { id: electricianId, userType: 'ELECTRICIAN' },
      });

      if (!electrician) {
        throw new ForbiddenError('Only electricians can place bids');
      }

      // Create bid
      const bid = await prisma.bid.create({
        data: {
          jobPostId,
          electricianId,
          amount: amount.toString(),
          estimatedDuration,
          estimatedStartDate,
          message,
          status: BidStatus.PENDING,
        },
        include: {
          electrician: {
            select: {
              id: true,
              fullName: true,
              profileImageUrl: true,
            },
          },
          jobPost: {
            select: {
              id: true,
              title: true,
              status: true,
              citizenId: true,
            },
          },
        },
      });

      // Update job post bid count
      await prisma.jobPost.update({
        where: { id: jobPostId },
        data: {
          bidCount: { increment: 1 },
          status: JobStatus.BIDDING,
        },
      });

      return bid;
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, throw to be handled by controller
      if (isConnectionError || jobPostId.startsWith('mock-') || electricianId.startsWith('mock-')) {
        throw dbError; // Let controller handle mock data
      }

      // Re-throw other errors (validation, not found, etc.)
      throw dbError;
    }
  },

  async getBidById(bidId: string) {
    // Early check for mock IDs - skip Prisma to avoid connection timeout
    if (bidId.startsWith('mock-')) {
      const mockError = new Error('Mock ID detected - use mock data');
      (mockError as any).code = 'MOCK_ID';
      throw mockError;
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        electrician: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
        jobPost: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            citizen: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    return bid;
  },

  async getJobBids(jobPostId: string, userId?: string) {
    // Skip Prisma entirely if database is not available
    if (!isDatabaseAvailable) {
      const mockError = new Error('Database not available - use mock data');
      (mockError as any).code = 'MOCK_ID';
      throw mockError;
    }

    // Early check for mock IDs - skip Prisma to avoid connection timeout
    if (jobPostId.startsWith('mock-')) {
      const mockError = new Error('Mock ID detected - use mock data');
      (mockError as any).code = 'MOCK_ID';
      throw mockError;
    }

    try {
      // Check if user is the job owner or an electrician with a bid
      const jobPost = await prisma.jobPost.findUnique({
        where: { id: jobPostId },
      });

      if (!jobPost) {
        throw new NotFoundError('Job post not found');
      }

      // Public endpoint: show all bids if no user, or user-specific logic if authenticated
      const isOwner = userId && jobPost.citizenId === userId;

      const bids = await prisma.bid.findMany({
        where: {
          jobPostId,
          ...(userId && !isOwner ? { electricianId: userId } : {}), // Non-owners can only see their own bid, public sees all
        },
        include: {
          electrician: {
            select: {
              id: true,
              fullName: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return bids;
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error and it's a mock ID, throw error to be handled by controller
      if (isConnectionError || jobPostId.startsWith('mock-')) {
        throw dbError; // Let controller handle mock data
      }

      throw dbError;
    }
  },

  async getMyBids(electricianId: string) {
    try {
      const bids = await prisma.bid.findMany({
        where: {
          electricianId,
        },
        include: {
          jobPost: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              location: true,
              citizen: {
                select: {
                  id: true,
                  fullName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return bids;
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // If database error, throw to be handled by controller
      if (isConnectionError || electricianId.startsWith('mock-')) {
        throw dbError; // Let controller handle mock data
      }

      throw dbError;
    }
  },

  async updateBid(bidId: string, electricianId: string, data: UpdateBidData) {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        jobPost: true,
      },
    });

    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.electricianId !== electricianId) {
      throw new ForbiddenError('You can only update your own bids');
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new ValidationError('You can only update pending bids');
    }

    if (bid.jobPost.status !== JobStatus.OPEN && bid.jobPost.status !== JobStatus.BIDDING) {
      throw new ValidationError('Job post is no longer accepting bid updates');
    }

    const updatedBid = await prisma.bid.update({
      where: { id: bidId },
      data: {
        ...(data.amount !== undefined && { amount: data.amount.toString() }),
        ...(data.estimatedDuration !== undefined && {
          estimatedDuration: data.estimatedDuration,
        }),
        ...(data.estimatedStartDate !== undefined && {
          estimatedStartDate: data.estimatedStartDate,
        }),
        ...(data.message !== undefined && { message: data.message }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        electrician: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
        jobPost: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return updatedBid;
  },

  async acceptBid(bidId: string, citizenId: string) {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        jobPost: true,
      },
    });

    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.jobPost.citizenId !== citizenId) {
      throw new ForbiddenError('Only job owner can accept bids');
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new ValidationError('Bid is not in pending status');
    }

    if (bid.jobPost.status !== JobStatus.BIDDING && bid.jobPost.status !== JobStatus.OPEN) {
      throw new ValidationError('Job post is not accepting bids');
    }

    // Reject all other bids
    await prisma.bid.updateMany({
      where: {
        jobPostId: bid.jobPostId,
        id: { not: bidId },
        status: BidStatus.PENDING,
      },
      data: {
        status: BidStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });

    // Accept the bid
    const acceptedBid = await prisma.bid.update({
      where: { id: bidId },
      data: {
        status: BidStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        electrician: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // Update job post
    await prisma.jobPost.update({
      where: { id: bid.jobPostId },
      data: {
        status: JobStatus.IN_PROGRESS,
        assignedElectricianId: bid.electricianId,
        acceptedBidId: bidId,
      },
    });

    return acceptedBid;
  },

  async rejectBid(bidId: string, citizenId: string) {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        jobPost: true,
      },
    });

    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.jobPost.citizenId !== citizenId) {
      throw new ForbiddenError('Only job owner can reject bids');
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new ValidationError('Bid is not in pending status');
    }

    const rejectedBid = await prisma.bid.update({
      where: { id: bidId },
      data: {
        status: BidStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });

    return rejectedBid;
  },

  async withdrawBid(bidId: string, electricianId: string) {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.electricianId !== electricianId) {
      throw new ForbiddenError('You can only withdraw your own bids');
    }

    if (bid.status !== BidStatus.PENDING) {
      throw new ValidationError('You can only withdraw pending bids');
    }

    const withdrawnBid = await prisma.bid.update({
      where: { id: bidId },
      data: {
        status: BidStatus.WITHDRAWN,
      },
    });

    // Update job post bid count
    await prisma.jobPost.update({
      where: { id: bid.jobPostId },
      data: {
        bidCount: { decrement: 1 },
      },
    });

    return withdrawnBid;
  },

  async deleteBid(bidId: string, electricianId: string) {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
    });

    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.electricianId !== electricianId) {
      throw new ForbiddenError('You can only delete your own bids');
    }

    await prisma.bid.delete({
      where: { id: bidId },
    });

    // Update job post bid count
    await prisma.jobPost.update({
      where: { id: bid.jobPostId },
      data: {
        bidCount: { decrement: 1 },
      },
    });

    return { success: true };
  },
};

