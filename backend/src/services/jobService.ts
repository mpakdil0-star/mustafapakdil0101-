import prisma, { isDatabaseAvailable } from '../config/database';
import { JobStatus, UrgencyLevel } from '@prisma/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface CreateJobData {
  citizenId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: {
    address: string;
    city: string;
    district: string;
    neighborhood?: string;
    latitude: number;
    longitude: number;
  };
  urgencyLevel?: UrgencyLevel;
  estimatedBudget?: number;
  budgetRange?: {
    min: number;
    max: number;
  };
  preferredTime?: Date;
  images?: string[];
}

export interface UpdateJobData {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  location?: {
    address: string;
    city: string;
    district: string;
    neighborhood?: string;
    latitude: number;
    longitude: number;
  };
  urgencyLevel?: UrgencyLevel;
  estimatedBudget?: number;
  budgetRange?: {
    min: number;
    max: number;
  };
  preferredTime?: Date;
  images?: string[];
  status?: JobStatus;
}

export const jobService = {
  async createJob(data: CreateJobData) {
    const {
      citizenId,
      title,
      description,
      category,
      subcategory,
      location,
      urgencyLevel = UrgencyLevel.MEDIUM,
      estimatedBudget,
      budgetRange,
      preferredTime,
      images = [],
    } = data;

    // Validation
    if (!title || !description || !category) {
      throw new ValidationError('Title, description, and category are required');
    }

    if (!location || !location.address || !location.city || !location.district) {
      throw new ValidationError('Location details are required');
    }

    // Check if citizen exists
    const citizen = await prisma.user.findUnique({
      where: { id: citizenId, userType: 'CITIZEN' },
    });

    if (!citizen) {
      throw new NotFoundError('Citizen not found');
    }

    // Create job post
    const jobPost = await prisma.jobPost.create({
      data: {
        citizenId,
        title,
        description,
        category,
        subcategory,
        location: location as any,
        urgencyLevel,
        estimatedBudget: estimatedBudget ? estimatedBudget.toString() : null,
        budgetRange: budgetRange ? (budgetRange as any) : null,
        preferredTime,
        images,
        status: JobStatus.OPEN,
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return jobPost;
  },

  async getJobById(jobId: string, userId?: string) {
    // Skip Prisma entirely if database is not available
    if (!isDatabaseAvailable) {
      const mockError = new Error('Database not available - use mock data');
      (mockError as any).code = 'MOCK_ID';
      throw mockError;
    }

    // Early check for mock IDs - skip Prisma to avoid connection timeout
    if (jobId.startsWith('mock-')) {
      const mockError = new Error('Mock ID detected - use mock data');
      (mockError as any).code = 'MOCK_ID';
      throw mockError;
    }

    try {
      const jobPost = await prisma.jobPost.findUnique({
        where: { id: jobId },
        include: {
          citizen: {
            select: {
              id: true,
              fullName: true,
              profileImageUrl: true,
            },
          },
          bids: {
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
          },
        },
      });

      if (!jobPost) {
        throw new NotFoundError('Job post not found');
      }

      // Increment view count if user is viewing
      if (userId && userId !== jobPost.citizenId) {
        try {
          await prisma.jobPost.update({
            where: { id: jobId },
            data: { viewCount: { increment: 1 } },
          });
        } catch (updateError) {
          // Ignore update errors if database is down
          console.warn('Failed to increment view count:', updateError);
        }
      }

      return jobPost;
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
      if (isConnectionError || jobId.startsWith('mock-')) {
        throw dbError; // Let controller handle mock data
      }

      throw dbError;
    }
  },

  async getJobs(filters: {
    status?: JobStatus;
    category?: string;
    city?: string;
    district?: string;
    page?: number;
    limit?: number;
  }) {
    // NOTE: Removed blocking $connect() call that was causing 5 second delay
    // Database errors will be handled in the catch block below

    try {
      const {
        status = JobStatus.OPEN,
        category,
        city,
        district,
        page = 1,
        limit = 20,
      } = filters;

      const skip = (page - 1) * limit;

      const where: any = {
        status,
        deletedAt: null,
      };

      if (category) {
        where.category = category;
      }

      // Location filtering için JSON field query - şimdilik devre dışı
      // PostgreSQL JSON field'ları için Prisma'nın özel syntax'ı gerekli
      // TODO: Location filtreleme eklenebilir (raw query veya Prisma JSON filtering)

      const [jobs, total] = await Promise.all([
        prisma.jobPost.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            citizen: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
              },
            },
            _count: {
              select: {
                bids: true,
              },
            },
          },
        }),
        prisma.jobPost.count({ where }),
      ]);

      // Transform jobs to match expected format
      const transformedJobs = jobs.map((job) => ({
        ...job,
        bidCount: job._count.bids,
        estimatedBudget: job.estimatedBudget ? job.estimatedBudget.toString() : null,
      }));

      return {
        jobs: transformedJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      // Log error for debugging
      console.error('Error in getJobs service:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Prisma specific errors - return empty array to let controller handle mock data
      if (error.code === 'P1001' || error.code === 'P1017' || error.code === 'P2002') {
        // Database connection errors - return empty to trigger mock data in controller
        throw new Error('DATABASE_NOT_CONNECTED');
      }

      throw error;
    }
  },

  async getMyJobs(userId: string, userType: string) {
    try {
      const where: any = {
        deletedAt: null,
      };

      if (userType === 'CITIZEN') {
        where.citizenId = userId;
      } else if (userType === 'ELECTRICIAN') {
        // Jobs where electrician has placed a bid
        where.bids = {
          some: {
            electricianId: userId,
          },
        };
      }

      const jobs = await prisma.jobPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          citizen: {
            select: {
              id: true,
              fullName: true,
              profileImageUrl: true,
            },
          },
          bids: {
            where: userType === 'ELECTRICIAN' ? { electricianId: userId } : undefined,
            include: {
              electrician: {
                select: {
                  id: true,
                  fullName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              bids: true,
            },
          },
        },
      });

      // Transform jobs to match expected format
      const transformedJobs = jobs.map((job) => ({
        ...job,
        bidCount: job._count.bids,
        estimatedBudget: job.estimatedBudget ? job.estimatedBudget.toString() : null,
      }));

      return transformedJobs;
    } catch (dbError: any) {
      // Check if it's a database connection error
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes("Can't reach database") ||
        dbError.message === 'DATABASE_NOT_CONNECTED' ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor?.name === 'PrismaClientInitializationError';

      if (isConnectionError) {
        // Throw error to be handled by controller (will return mock data)
        // Normalize the error format
        const normalizedError: any = new Error('DATABASE_NOT_CONNECTED');
        normalizedError.code = dbError.code || 'P1001';
        normalizedError.name = 'PrismaClientInitializationError';
        normalizedError.originalError = dbError;
        throw normalizedError;
      }

      // For other errors, throw as is
      throw dbError;
    }
  },

  async updateJob(jobId: string, userId: string, data: UpdateJobData) {
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: jobId },
    });

    if (!jobPost) {
      throw new NotFoundError('Job post not found');
    }

    if (jobPost.citizenId !== userId) {
      throw new ForbiddenError('You can only update your own job posts');
    }

    if (jobPost.status !== JobStatus.OPEN && jobPost.status !== JobStatus.DRAFT) {
      throw new ValidationError('You can only update open or draft job posts');
    }

    const updatedJob = await prisma.jobPost.update({
      where: { id: jobId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
        ...(data.location && { location: data.location as any }),
        ...(data.urgencyLevel && { urgencyLevel: data.urgencyLevel }),
        ...(data.estimatedBudget !== undefined && {
          estimatedBudget: data.estimatedBudget.toString(),
        }),
        ...(data.budgetRange && { budgetRange: data.budgetRange as any }),
        ...(data.preferredTime && { preferredTime: data.preferredTime }),
        ...(data.images && { images: data.images }),
        ...(data.status && { status: data.status }),
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return updatedJob;
  },

  async deleteJob(jobId: string, userId: string) {
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: jobId },
    });

    if (!jobPost) {
      throw new NotFoundError('Job post not found');
    }

    if (jobPost.citizenId !== userId) {
      throw new ForbiddenError('You can only delete your own job posts');
    }

    await prisma.jobPost.update({
      where: { id: jobId },
      data: {
        deletedAt: new Date(),
        status: JobStatus.CANCELLED,
      },
    });

    return { success: true };
  },

  // İlan İptali
  async cancelJob(jobId: string, userId: string, reason?: string) {
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: jobId },
      include: {
        bids: {
          where: { status: 'ACCEPTED' },
        },
      },
    });

    if (!jobPost) {
      throw new NotFoundError('İlan bulunamadı');
    }

    if (jobPost.citizenId !== userId) {
      throw new ForbiddenError('Bu ilanı iptal etme yetkiniz yok');
    }

    if (jobPost.status === JobStatus.IN_PROGRESS) {
      throw new ValidationError('Devam eden işler iptal edilemez');
    }

    if (jobPost.status === JobStatus.COMPLETED || jobPost.status === JobStatus.CANCELLED) {
      throw new ValidationError('Bu ilan zaten tamamlanmış veya iptal edilmiş');
    }

    const updatedJob = await prisma.jobPost.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        cancellationReason: reason || null,
        cancelledAt: new Date(),
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return updatedJob;
  },

  // Elektrikçi: İşi Tamamlandı Olarak İşaretle
  async markJobComplete(jobId: string, electricianId: string) {
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: jobId },
      include: {
        bids: {
          where: {
            electricianId,
            status: 'ACCEPTED',
          },
        },
      },
    });

    if (!jobPost) {
      throw new NotFoundError('İş bulunamadı');
    }

    if (jobPost.bids.length === 0) {
      throw new ForbiddenError('Bu işte kabul edilmiş teklifiniz yok');
    }

    if (jobPost.status !== JobStatus.IN_PROGRESS) {
      throw new ValidationError('Sadece devam eden işler tamamlanabilir');
    }

    // BIDDING durumunu "vatandaş onayı bekliyor" olarak kullanıyoruz
    const updatedJob = await prisma.jobPost.update({
      where: { id: jobId },
      data: {
        status: JobStatus.BIDDING, // Vatandaş onayı bekliyor
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return updatedJob;
  },

  // Vatandaş: İş Tamamlama Onayı
  async confirmJobComplete(jobId: string, citizenId: string) {
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: jobId },
    });

    if (!jobPost) {
      throw new NotFoundError('İş bulunamadı');
    }

    if (jobPost.citizenId !== citizenId) {
      throw new ForbiddenError('Bu işi onaylama yetkiniz yok');
    }

    // BIDDING (vatandaş onayı bekliyor) veya IN_PROGRESS durumunda onaylanabilir
    if (jobPost.status !== JobStatus.BIDDING && jobPost.status !== JobStatus.IN_PROGRESS) {
      throw new ValidationError('Bu iş onaylanamaz');
    }

    const updatedJob = await prisma.jobPost.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });

    return updatedJob;
  },

  // Değerlendirme Oluştur
  async createReview(jobId: string, citizenId: string, data: { rating: number; comment?: string; electricianId?: string }) {
    const jobPost = await prisma.jobPost.findUnique({
      where: { id: jobId },
      include: {
        bids: {
          where: { status: 'ACCEPTED' },
          include: {
            electrician: true,
          },
        },
      },
    });

    if (!jobPost) {
      throw new NotFoundError('İş bulunamadı');
    }

    if (jobPost.citizenId !== citizenId) {
      throw new ForbiddenError('Bu işi değerlendirme yetkiniz yok');
    }

    if (jobPost.status !== JobStatus.COMPLETED) {
      throw new ValidationError('Sadece tamamlanan işler değerlendirilebilir');
    }

    // Elektrikçi ID'si belirtilmemişse, kabul edilen tekliften al
    const electricianId = data.electricianId || jobPost.bids[0]?.electricianId;

    if (!electricianId) {
      throw new ValidationError('Değerlendirilecek elektrikçi bulunamadı');
    }

    // Daha önce değerlendirme yapılmış mı kontrol et (jobPostId unique olduğu için)
    const existingReview = await prisma.review.findUnique({
      where: {
        jobPostId: jobId,
      },
    });

    if (existingReview) {
      throw new ValidationError('Bu iş için zaten değerlendirme yapmışsınız');
    }

    // Değerlendirme oluştur - Prisma şemasına uygun: reviewerId, reviewedId
    const review = await prisma.review.create({
      data: {
        jobPostId: jobId,
        reviewerId: citizenId,
        reviewedId: electricianId,
        rating: data.rating,
        comment: data.comment || null,
      },
    });

    // Elektrikçinin ortalama puanını güncelle
    const allReviews = await prisma.review.findMany({
      where: { reviewedId: electricianId },
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.electricianProfile.update({
      where: { userId: electricianId },
      data: {
        ratingAverage: avgRating,
        totalReviews: allReviews.length,
      },
    });

    return review;
  },
};
