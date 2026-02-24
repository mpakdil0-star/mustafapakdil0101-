import { Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import { mockTicketStorage, mockStorage } from '../utils/mockStorage';

export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { subject, description, ticketType, priority } = req.body;

        if (!subject || !description || !ticketType) {
            throw new ValidationError('Konu, açıklama ve talep türü zorunludur');
        }

        let ticket;
        if (isDatabaseAvailable) {
            try {
                ticket = await prisma.supportTicket.create({
                    data: {
                        userId: req.user.id,
                        subject,
                        description,
                        ticketType,
                        priority: priority || 'medium',
                        status: 'open'
                    }
                });
            } catch (dbError) {
                console.warn('⚠️ [SUPPORT] DB createTicket failed, falling back to mock');
                ticket = mockTicketStorage.addTicket({
                    userId: req.user.id,
                    subject,
                    description,
                    ticketType,
                    priority: priority || 'medium'
                });
            }
        } else {
            ticket = mockTicketStorage.addTicket({
                userId: req.user.id,
                subject,
                description,
                ticketType,
                priority: priority || 'medium'
            });
        }

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

        let tickets;
        if (isDatabaseAvailable) {
            try {
                tickets = await prisma.supportTicket.findMany({
                    where: { userId: req.user.id },
                    orderBy: { createdAt: 'desc' }
                });
                return res.json({ success: true, data: tickets });
            } catch (error) {
                console.warn('⚠️ [SUPPORT] DB getMyTickets failed, falling back to mock');
            }
        }

        tickets = mockTicketStorage.getTicketsByUser(req.user.id);
        tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
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

                if (ticket) {
                    if (ticket.userId !== req.user.id && !isAdmin) {
                        throw new ValidationError('Yetkisiz işlem');
                    }
                    return res.json({ success: true, data: ticket });
                }
            } catch (error) {
                console.warn('⚠️ [SUPPORT] DB getTicketDetail failed, checking mock');
            }
        }

        // Mock Fallback
        const rawTicket = mockTicketStorage.getTicket(id);
        if (!rawTicket) throw new ValidationError('Destek talebi bulunamadı');

        if (rawTicket.userId !== req.user.id && !isAdmin) {
            throw new ValidationError('Yetkisiz işlem');
        }

        const userStore = mockStorage.get(rawTicket.userId);
        const ticket = {
            ...rawTicket,
            user: {
                fullName: userStore?.fullName || 'Bilinmeyen Kullanıcı',
                email: userStore?.email,
                phone: userStore?.phone
            },
            messages: rawTicket.messages || []
        };

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

        if (isDatabaseAvailable) {
            try {
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
                return res.json({ success: true, data: tickets });
            } catch (error) {
                console.warn('⚠️ [SUPPORT] DB getAllTickets failed, falling back to mock');
            }
        }

        // Mock Fallback
        const allTickets = mockTicketStorage.getAllTickets();
        const tickets = allTickets.map(t => {
            const user = mockStorage.get(t.userId);
            return {
                ...t,
                user: {
                    fullName: user?.fullName || 'Bilinmeyen Kullanıcı',
                    email: user?.email,
                    phone: user?.phone
                }
            };
        });
        tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
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

                return res.json({ success: true, message: 'Talep durumu güncellendi', data: ticket });
            } catch (error) {
                console.warn('⚠️ [SUPPORT] DB updateTicketStatus failed, checking mock');
            }
        }

        // Mock Fallback
        const ticket = mockTicketStorage.updateTicket(id, { status });
        if (replyMessage && ticket) {
            mockTicketStorage.addMessage(id, {
                senderId: req.user.id,
                text: replyMessage,
                isAdmin: true
            });
        }

        if (!ticket) throw new ValidationError('Talep bulunamadı');

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

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
                const message = await prisma.supportTicketMessage.create({
                    data: {
                        ticketId: id,
                        senderId: req.user.id,
                        text,
                        isAdmin
                    }
                });
                return res.json({ success: true, message: 'Mesaj gönderildi', data: message });
            } catch (error) {
                console.warn('⚠️ [SUPPORT] DB addTicketMessage failed, checking mock');
            }
        }

        // Mock Fallback
        const existingTicket = mockTicketStorage.getTicket(id);
        if (!existingTicket) throw new ValidationError('Talep bulunamadı');

        if (existingTicket.userId !== req.user.id && !isAdmin) {
            throw new ValidationError('Yetkisiz işlem');
        }

        const message = mockTicketStorage.addMessage(id, {
            senderId: req.user.id,
            text,
            isAdmin
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
