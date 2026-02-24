import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Report status and reason types (matching schema.prisma enums)
type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
type ReportReason = 'FRAUD' | 'HARASSMENT' | 'NO_SHOW' | 'UNPROFESSIONAL' | 'FAKE_PROFILE' | 'SPAM' | 'INAPPROPRIATE_CONTENT' | 'OTHER';

// Create a new report
export const createReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const reporterId = req.user?.id;
        const { reportedId, jobId, reason, description, evidence } = (req as any).body;

        if (!reporterId) {
            return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
        }

        console.log(`🚩 [REPORTS] createReport: ${reporterId} reporting ${reportedId}`);

        // Can't report yourself
        if (reporterId === reportedId) {
            return res.status(400).json({ success: false, message: 'Kendinizi şikayet edemezsiniz' });
        }

        // Check for duplicate report (same reporter, reported, and pending)
        const existingReport = await prisma.report.findFirst({
            where: {
                reporterId,
                reportedId,
                status: 'PENDING'
            }
        });

        if (existingReport) {
            return res.status(400).json({
                success: false,
                message: 'Bu kullanıcı için bekleyen bir şikayetiniz zaten var'
            });
        }

        const report = await prisma.report.create({
            data: {
                reporterId,
                reportedId,
                jobId,
                reason: reason as ReportReason,
                description,
                evidence: evidence || [],
                status: 'PENDING'
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Şikayetiniz başarıyla gönderildi. En kısa sürede incelenecektir.',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

// Get user's reports
export const getMyReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
        }

        console.log(`🚩 [REPORTS] getMyReports for user ${userId}`);
        const reports = await prisma.report.findMany({
            where: { reporterId: userId },
            include: {
                reported: {
                    select: { fullName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({ success: true, data: reports });
    } catch (error) {
        console.error('❌ [REPORTS] getMyReports failed:', error);
        next(error);
    }
};

// ADMIN: Get all reports
export const getAllReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('🚩 [REPORTS] getAllReports called', { query: req.query });
        const { status, page = 1, limit = 20 } = req.query;

        const where: any = {};
        if (status) {
            where.status = status as ReportStatus;
        }

        // Ensure page and limit are valid numbers
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(1, parseInt(limit as string) || 20);
        const skip = (pageNum - 1) * limitNum;

        console.log(`🚩 [REPORTS] Fetching reports: page=${pageNum}, limit=${limitNum}, skip=${skip}`);

        const reports = await prisma.report.findMany({
            where,
            skip,
            take: limitNum,
            include: {
                reporter: { select: { fullName: true } },
                reported: { select: { fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const total = await prisma.report.count({ where });

        console.log(`🚩 [REPORTS] Found ${reports.length} reports out of ${total} total`);

        return res.json({
            success: true,
            data: reports || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        console.error('❌ [REPORTS] getAllReports failed:', error);
        next(error);
    }
};

// ADMIN: Update report status
export const updateReportStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = (req as any).params;
        const { status, adminNotes, banUser, banUntil } = (req as any).body;
        const adminId = req.user?.id;

        console.log(`🚩 [REPORTS] updateReportStatus: ${id} -> ${status}`);

        const report = await prisma.report.update({
            where: { id },
            data: {
                status: status as ReportStatus,
                adminNotes,
                resolvedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : null,
                resolvedBy: ['RESOLVED', 'DISMISSED'].includes(status) ? adminId : null
            }
        });

        if (!report) {
            return res.status(404).json({ success: false, message: 'Şikayet bulunamadı' });
        }

        // If resolved against the reported user, optionally ban them
        if (status === 'RESOLVED' && banUser) {
            await prisma.user.update({
                where: { id: report.reportedId },
                data: { isActive: false }
            });
        }

        return res.json({
            success: true,
            message: 'Şikayet durumu güncellendi',
            data: report
        });
    } catch (error) {
        next(error);
    }
};

// Get report reasons for dropdown
export const getReportReasons = async (req: Request, res: Response) => {
    const reasons = [
        { value: 'FRAUD', label: 'Dolandırıcılık' },
        { value: 'HARASSMENT', label: 'Taciz / Rahatsız Edici Davranış' },
        { value: 'NO_SHOW', label: 'Randevuya Gelmedi' },
        { value: 'UNPROFESSIONAL', label: 'Profesyonel Olmayan Davranış' },
        { value: 'FAKE_PROFILE', label: 'Sahte Profil' },
        { value: 'SPAM', label: 'Spam / İstenmeyen Mesaj' },
        { value: 'INAPPROPRIATE_CONTENT', label: 'Uygunsuz İçerik' },
        { value: 'OTHER', label: 'Diğer' }
    ];

    return res.json({ success: true, data: reasons });
};
