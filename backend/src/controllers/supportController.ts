import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';

export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { subject, description, ticketType, priority } = req.body;

        if (!subject || !description || !ticketType) {
            throw new ValidationError('Konu, açıklama ve talep türü zorunludur');
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: req.user.id,
                subject,
                description,
                ticketType,
                priority: priority || 'medium',
                status: 'open'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Destek talebiniz oluşturuldu',
            data: ticket
        });
    } catch (error) {
        next(error);
    }
};

export const getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const tickets = await prisma.supportTicket.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: tickets
        });
    } catch (error) {
        next(error);
    }
};

export const getTicketDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { id } = req.params;
        const isAdmin = req.user.userType === 'ADMIN';

        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true,
                        phone: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: { fullName: true }
                        }
                    }
                }
            }
        });

        if (!ticket) {
            throw new ValidationError('Destek talebi bulunamadı');
        }

        if (ticket.userId !== req.user.id && !isAdmin) {
            throw new ValidationError('Yetkisiz işlem');
        }

        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        next(error);
    }
};

export const getAllTickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user || req.user.userType !== 'ADMIN') {
            throw new ValidationError('Bu işlem için yönetici yetkisi gereklidir');
        }

        const tickets = await prisma.supportTicket.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: tickets
        });
    } catch (error) {
        next(error);
    }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user || req.user.userType !== 'ADMIN') {
            throw new ValidationError('Bu işlem için yönetici yetkisi gereklidir');
        }

        const { id } = req.params;
        const { status, replyMessage } = req.body;

        if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            throw new ValidationError('Geçersiz durum');
        }

        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: { status }
        });

        if (replyMessage) {
            await prisma.supportTicketMessage.create({
                data: {
                    ticketId: id,
                    senderId: req.user.id,
                    text: replyMessage,
                    isAdmin: true
                }
            });
        }

        res.json({
            success: true,
            message: 'Talep durumu güncellendi',
            data: ticket
        });
    } catch (error) {
        next(error);
    }
};

export const addTicketMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { id } = req.params;
        const { text } = req.body;

        if (!text) throw new ValidationError('Mesaj boş olamaz');

        const isAdmin = req.user.userType === 'ADMIN';

        const existingTicket = await prisma.supportTicket.findUnique({ where: { id } });
        if (!existingTicket) throw new ValidationError('Talep bulunamadı');

        if (existingTicket.userId !== req.user.id && !isAdmin) {
            throw new ValidationError('Yetkisiz işlem');
        }

        const message = await prisma.supportTicketMessage.create({
            data: {
                ticketId: id,
                senderId: req.user.id,
                text,
                isAdmin
            }
        });

        res.json({
            success: true,
            message: 'Mesaj gönderildi',
            data: message
        });

    } catch (error) {
        next(error);
    }
};
