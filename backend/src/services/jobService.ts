import prisma, { isDatabaseAvailable } from '../config/database';
import { JobStatus, UrgencyLevel } from '@prisma/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { notifyUser } from '../server';
import pushNotificationService from './pushNotificationService';
import { calculateDistance, getBoundingBox } from '../utils/geo';

export interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  messageType: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
  };
}

export interface CreateJobData {
  citizenId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  serviceCategory?: string;
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
      serviceCategory,
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

    // Check if citizen exists - skip if database is not available or it's a mock user
    if (isDatabaseAvailable && !citizenId.startsWith('mock-')) {
      const citizen = await prisma.user.findUnique({
        where: { id: citizenId },
      });

      if (!citizen || (citizen.userType !== 'CITIZEN' && citizen.userType !== 'ADMIN')) {
        throw new NotFoundError('User not authorized to create jobs or not found');
      }
    }

    // Create job post
    const jobPost = await prisma.jobPost.create({
      data: {
        citizenId,
        title,
        description,
        category,
        subcategory,
        serviceCategory,
        location: location as any,
        urgencyLevel,
        estimatedBudget: estimatedBudget ? estimatedBudget.toString() : null,
        budgetRange: budgetRange ? (budgetRange as any) : null,
        preferredTime,
        images,
        status: JobStatus.OPEN,
      } as any,
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            profileImageUrl: true,
            phone: true,
          },
        },
      },
    });

    // Notify nearby electricians
    try {
      this.notifyNearbyElectricians(jobPost);
    } catch (error) {
      console.error('Error starting notifications:', error);
    }

    return jobPost;
  },

  async notifyNearbyElectricians(job: any) {
    const { city, district } = job.location as any;
    const serviceCategory = job.serviceCategory || 'elektrik';

    console.log(`🔔 notifyNearbyElectricians triggered for JOB: ${job.id}`);
    console.log(`   - Service Category: ${serviceCategory} (Original in job: ${job.serviceCategory})`);
    console.log(`   - Location: ${city}, ${district}`);

    try {
      // 1. SEND REAL-TIME SOCKET NOTIFICATION VIA TARGETED ROOMS (with serviceCategory)
      // En güvenli ve performanslı yol: kişilere tek tek değil, bölge odalarına yayın yapmak.
      const targetRooms: string[] = [];
      if (city) {
        // Kategoriye özel 'all' odasına gönder (tüm şehre bakanlar için)
        targetRooms.push(`area:${city}:all:${serviceCategory}`);
        // Eğer ilçe varsa kategoriye özel ilçe odasına da gönder
        if (district && district !== 'Tüm Şehir' && district !== 'Merkez') {
          targetRooms.push(`area:${city}:${district}:${serviceCategory}`);
        }
      }

      // 'notification' event'i mobile app'te alert tetikler
      notifyUser(targetRooms, 'notification', {
        id: `sock-noti-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'new_job_available',
        jobId: job.id,
        title: job.title,
        category: job.category,
        urgencyLevel: job.urgencyLevel,
        locationPreview: `${district || ''}, ${city || ''}`,
        message: `Bölgenizde yeni bir iş ilanı yayınlandı: ${job.title}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: job.id,
        relatedType: 'JOB'
      });

      // 2. PERSISTENT NOTIFICATIONS (Push & DB)
      if (isDatabaseAvailable) {
        // Note: Socket room filtering by serviceCategory handles real-time notifications
        // Database query filters by location only - push notifications go to all category users in area
        const electricians = await prisma.user.findMany({
          where: {
            userType: 'ELECTRICIAN',
            isActive: true,
            locations: {
              some: {
                isActive: true, // Only notify for active addresses
                city: city,
                OR: [
                  ...(district ? [{ district: district }] : []),
                  { district: 'Tüm Şehir' },
                  { district: 'Merkez' }
                ]
              }
            },
            electricianProfile: {
              serviceCategory: serviceCategory
            } as any
          },
          select: { id: true, pushToken: true }
        });

        const validPushTokens: string[] = [];

        for (const elec of electricians) {
          if (elec.id === job.citizenId) continue;

          // DB Bildirimi kaydet
          prisma.notification.create({
            data: {
              userId: elec.id,
              type: 'new_job_available',
              title: 'Yeni İş İlanı!',
              message: `${district || ''}, ${city || ''} bölgesinde yeni bir ${job.category} ilanı açıldı: "${job.title}"`,
              relatedType: 'JOB',
              relatedId: job.id,
            }
          }).catch(err => console.error('Failed to save notification to DB:', err));

          if (elec.pushToken) {
            validPushTokens.push(elec.pushToken);
          }
        }

        // Toplu Push Bildirimi Gönderimi (Queue/Rate limit aşımını önler)
        if (validPushTokens.length > 0) {
          pushNotificationService.sendNotification({
            to: validPushTokens,
            title: 'Yeni İş İlanı!',
            body: `${district || ''}, ${city || ''} bölgesinde yeni bir ${job.category} ilanı açıldı.`,
            data: { jobId: job.id, type: 'new_job_available' }
          }).catch(err => console.error('Push Notification Error:', err));
        }
      } else {
        // Mock modda notificationRoutes'taki listenin de güncellenmesi gerekiyorsa controller zaten bunu yapıyor.
        // Ama socket yayını artık targetRooms üzerinden yapıldığı için broad broadcast engellenmiş oldu.
        console.log(`📡 Targeted room notification sent to: ${targetRooms.join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to notify nearby electricians:', error);
    }
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
              phone: true,
            },
          },
          bids: {
            include: {
              electrician: {
                select: {
                  id: true,
                  fullName: true,
                  profileImageUrl: true,
                  phone: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          reviews: true,
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
    districts?: string[];
    lat?: number;
    lng?: number;
    radius?: number; // km cinsinden
    serviceCategory?: string;
    page?: number;
    limit?: number;
    currentUserId?: string;
  }) {
    // Skip Prisma entirely if database is not available
    if (!isDatabaseAvailable) {
      throw new Error('DATABASE_NOT_CONNECTED');
    }

    try {
      const {
        status = JobStatus.OPEN,
        category,
        city,
        district,
        districts,
        lat,
        lng,
        radius,
        serviceCategory,
        page = 1,
        limit = 20,
        currentUserId,
      } = filters;

      const skip = (page - 1) * limit;

      // Get blocked users to filter out
      let blockedUserIds: string[] = [];
      if (currentUserId && isDatabaseAvailable) {
        const blocks = await prisma.block.findMany({
          where: {
            OR: [
              { blockerId: currentUserId },
              { blockedId: currentUserId },
            ],
          },
          select: {
            blockerId: true,
            blockedId: true,
          },
        });
        blockedUserIds = blocks.map(b => b.blockerId === currentUserId ? b.blockedId : b.blockerId);
      }

      const where: any = {
        deletedAt: null,
      };

      if (blockedUserIds.length > 0) {
        where.citizenId = {
          notIn: blockedUserIds,
        };
      }

      if (category) {
        where.category = category;
      }

      if (serviceCategory) {
        where.serviceCategory = serviceCategory;
      }

      // FIX: Handle 'ACTIVE' status to show both OPEN and BIDDING jobs
      if (status === 'ACTIVE' as any) {
        where.status = {
          in: [JobStatus.OPEN, JobStatus.BIDDING],
        };
      } else {
        where.status = status;
      }

      // Spatial Optimization: If lat/lng and radius are provided, use Bounding Box
      // Note: Since location is a JSON field, Prisma's standard numeric filters aren't directly available.
      // However, we can use the 'city' as a pre-filter if available, OR we keep the location filter
      // but we will prioritize these coordinates in the transform.
      // FOR TRUE PERFORMANCE: We would use a raw SQL query or move lat/lng to separate columns.
      // For this implementation, we will use the bbox to at least narrow down if we have city/district.

      const andConditions: any[] = [];

      if (city) {
        andConditions.push({
          location: {
            path: ['city'],
            equals: city,
          }
        });
      }

      if (district) {
        andConditions.push({
          location: {
            path: ['district'],
            equals: district,
          }
        });
      } else if (districts && districts.length > 0) {
        andConditions.push({
          OR: districts.map((d: string) => ({
            location: {
              path: ['district'],
              equals: d,
            }
          }))
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      // If no city/district but has lat/lng, we'd ideally filter here.
      // To improve perceived speed, we'll fetch with a larger limit if it's a map search
      // FIX: Increased from 100 to 500 to prevent "hidden jobs" issue where nearby jobs are excluded because they aren't in the top 100 latest.
      const queryLimit = (lat && lng && radius) ? 500 : limit;

      const [jobs, total] = await Promise.all([
        prisma.jobPost.findMany({
          where,
          skip: (lat && lng && radius) ? 0 : skip, // Map fetch usually wants all points in view
          take: queryLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            citizen: {
              select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
                phone: true,
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
      let transformedJobs = jobs.map((job) => {
        const location = job.location as any;
        let distance: number | null = null;

        if (lat && lng && location?.latitude && location?.longitude) {
          distance = calculateDistance(lat, lng, location.latitude, location.longitude);
        }

        return {
          ...job,
          bidCount: job._count.bids,
          estimatedBudget: job.estimatedBudget ? job.estimatedBudget.toString() : null,
          distance: distance ? parseFloat(distance.toFixed(2)) : null,
        };
      });

      // Eğer yarıçap filtresi varsa, mesafeye göre filtrele
      if (radius && lat && lng) {
        transformedJobs = transformedJobs.filter(job => job.distance !== null && job.distance <= radius);
      }

      return {
        jobs: transformedJobs,
        pagination: {
          page,
          limit,
          total: radius ? transformedJobs.length : total,
          totalPages: Math.ceil((radius ? transformedJobs.length : total) / limit),
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
    if (!isDatabaseAvailable) {
      throw new Error('DATABASE_NOT_CONNECTED');
    }

    try {
      const where: any = {
        deletedAt: null,
      };

      if (userType === 'CITIZEN' || userType === 'ADMIN') {
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
              phone: true,
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
                  phone: true,
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
            phone: true,
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
          where: {
            status: { in: ['PENDING', 'ACCEPTED'] as any }
          },
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

    // 💰 KREDİ İADESİ VE BİLDİRİM (Database)
    if (jobPost.bids && jobPost.bids.length > 0) {
      for (const bid of jobPost.bids) {
        try {
          // İlgili ustanın profilini al (mevcut bakiyeyi bilmek için)
          const profile = await prisma.electricianProfile.findUnique({
            where: { userId: bid.electricianId }
          });

          if (profile) {
            const currentBalance = Number(profile.creditBalance);
            const newBalance = currentBalance + 1;

            // 1. Krediyi iade et
            await prisma.electricianProfile.update({
              where: { userId: bid.electricianId },
              data: { creditBalance: newBalance }
            });

            // 2. Transaksiyon kaydı oluştur
            await prisma.credit.create({
              data: {
                userId: bid.electricianId,
                amount: 1,
                transactionType: 'REFUND' as any,
                relatedId: bid.id,
                description: `"${jobPost.title}" ilanı iptal edildiği için teklif kredisi iade edildi.`,
                balanceAfter: newBalance
              }
            });

            // 3. Bildirimleri Gönder
            const cancelMsg = `İlan iptal edildi: ${jobPost.title}. Teklif krediniz hesabınıza yüklenmiştir.${reason ? `\nSebep: ${reason}` : ''}`;

            // a. Socket Bildirimi
            notifyUser(bid.electricianId, 'notification', {
              type: 'JOB_CANCELLED',
              jobId: jobId,
              title: '🚫 İlan İptal Edildi (Kredi İade)',
              message: cancelMsg
            });

            // b. DB Bildirimi
            await prisma.notification.create({
              data: {
                userId: bid.electricianId,
                type: 'JOB_CANCELLED',
                title: 'İlan İptal Edildi (Kredi İade)',
                message: cancelMsg,
                relatedType: 'JOB',
                relatedId: jobId,
              }
            });

            // c. Push Bildirimi
            const electrician = await prisma.user.findUnique({
              where: { id: bid.electricianId },
              select: { pushToken: true }
            });

            if (electrician?.pushToken) {
              pushNotificationService.sendNotification({
                to: electrician.pushToken,
                title: 'İlan İptal Edildi',
                body: `Teklif krediniz hesabınıza iade edilmiştir.`,
                data: { jobId: jobId, type: 'JOB_CANCELLED' }
              }).catch(err => console.error('Push error during cancel refund:', err));
            }
          }
        } catch (refundErr) {
          console.error(`❌ Failed to refund credit/notify electrician ${bid.electricianId}:`, refundErr);
        }
      }
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

    // Not: PENDING_CONFIRMATION durumu henüz şemada tam oturmamışsa, 
    // mevcut BIDDING durumunu proxy olarak kullanmaya devam ediyoruz.
    const updatedJob = await prisma.jobPost.update({
      where: { id: jobId },
      data: {
        status: 'PENDING_CONFIRMATION' as any, // Vatandaş onayı bekliyor
      },
      include: {
        citizen: {
          select: {
            id: true,
            fullName: true,
            pushToken: true,
          },
        },
      },
    });

    // 1. Vatandaşa Gerçek Zamanlı Socket Bildirimi
    notifyUser(updatedJob.citizenId, 'job_status_updated', {
      type: 'job_complete_request',
      jobId: updatedJob.id,
      title: 'İş Tamamlandı mı?',
      message: `"${updatedJob.title}" ilanı için usta işi bitirdiğini bildirdi. Lütfen onaylayın.`,
    });

    // 2. Veritabanı Bildirimi
    await prisma.notification.create({
      data: {
        userId: updatedJob.citizenId,
        type: 'job_complete_request',
        title: 'İş Tamamlandı Onayı Bekleniyor',
        message: `"${updatedJob.title}" ilanı için elektrikçi işi tamamladığını bildirdi. Onay vererek süreci bitirebilirsiniz.`,
        relatedType: 'JOB',
        relatedId: updatedJob.id,
      }
    }).catch(err => console.error('Notification save error:', err));

    // 3. Push Bildirimi (Token varsa)
    if (updatedJob.citizen.pushToken) {
      pushNotificationService.sendNotification({
        to: updatedJob.citizen.pushToken,
        title: 'İş Tamamlandı!',
        body: `Usta işi bitirdiğini bildirdi. Onaylamak için dokunun.`,
        data: { jobId: updatedJob.id, type: 'job_complete_request' }
      }).catch(err => console.error('Push error:', err));
    }

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

    // Elektrikçiye Bildirim Gönder (assignedElectricianId üzerinden)
    if (updatedJob.assignedElectricianId) {
      // 1. Socket Bildirimi
      notifyUser(updatedJob.assignedElectricianId, 'job_status_updated', {
        type: 'job_confirmed',
        jobId: updatedJob.id,
        title: 'İş Onaylandı! 🎉',
        message: `"${updatedJob.title}" ilanı vatandaş tarafından onaylandı. Tebrikler!`,
      });

      // 2. DB Bildirimi
      await prisma.notification.create({
        data: {
          userId: updatedJob.assignedElectricianId,
          type: 'job_confirmed',
          title: 'İş Başarıyla Tamamlandı',
          message: `"${updatedJob.title}" ilanı için yaptığınız çalışma onaylandı. Kazancınız hesabınıza yansıdı.`,
          relatedType: 'JOB',
          relatedId: updatedJob.id,
        }
      }).catch(err => console.error('Electrician notification save error:', err));

      // 3. Push Bildirimi (Token bulmak için sorgu lazım)
      const electrician = await prisma.user.findUnique({
        where: { id: updatedJob.assignedElectricianId },
        select: { pushToken: true }
      });

      if (electrician?.pushToken) {
        pushNotificationService.sendNotification({
          to: electrician.pushToken,
          title: 'İş Onaylandı! 🎉',
          body: `"${updatedJob.title}" ilanı vatandaş tarafından onaylandı. Tebrikler!`,
          data: { jobId: updatedJob.id, type: 'job_confirmed' }
        }).catch(err => console.error('Electrician push error:', err));
      }

      // 4. Ustanın Tamamlanan İş Sayısını Artır
      await prisma.electricianProfile.update({
        where: { userId: updatedJob.assignedElectricianId },
        data: {
          completedJobsCount: { increment: 1 }
        }
      }).catch(err => console.error('Electrician profile update error:', err));
    }

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

    // Notify electrician about new review
    try {
      // 1. Socket notification
      notifyUser(electricianId, 'new_review', {
        type: 'new_review',
        jobId: jobId,
        rating: data.rating,
        title: 'Yeni Değerlendirme!',
        message: `"${jobPost.title}" ilanı için ${data.rating} yıldızlı bir değerlendirme aldınız.`
      });

      // 2. DB notification
      if (isDatabaseAvailable) {
        await prisma.notification.create({
          data: {
            userId: electricianId,
            type: 'new_review',
            title: 'Yeni Değerlendirme Alındı! ⭐',
            message: `"${jobPost.title}" ilanı için ${data.rating} yıldızlı bir değerlendirme aldınız. Profil puanınız güncellendi.`,
            relatedType: 'JOB',
            relatedId: jobId,
          }
        });
      }

      // 3. Push notification
      const electrician = await prisma.user.findUnique({
        where: { id: electricianId },
        select: { pushToken: true }
      });

      if (electrician?.pushToken) {
        pushNotificationService.sendNotification({
          to: electrician.pushToken,
          title: 'Yeni Değerlendirme!',
          body: `"${jobPost.title}" ilanı için ${data.rating} yıldızlı bir değerlendirme aldınız.`,
          data: { jobId: jobId, type: 'new_review' }
        }).catch(err => console.error('Electrician review push error:', err));
      }
    } catch (error) {
      console.error('Failed to notify electrician about new review:', error);
    }

    return review;
  },
};
