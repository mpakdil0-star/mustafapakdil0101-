import { Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ValidationError } from '../utils/errors';
import { mockTicketStorage, mockStorage } from '../utils/mockStorage';
import { notifyUser } from '../server';
import pushNotificationService from '../services/pushNotificationService';

// Durum etiketleri
const STATUS_LABELS: Record<string, string> = {
    open: 'Açık',
    in_progress: 'İnceleniyor',
    resolved: 'Çözüldü',
    closed: 'Kapatıldı'
};

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

        // 🔔 Admin'e bildirim gönder
        try {
            const userName = (req.user as any).fullName || 'Bir kullanıcı';
            const notifTitle = '📩 Yeni Destek Talebi';
            const notifMessage = `${userName} yeni bir destek talebi oluşturdu: "${subject}"`;

            if (isDatabaseAvailable) {
                const admins = await prisma.user.findMany({
                    where: { userType: 'ADMIN' },
                    select: { id: true, pushToken: true }
                });

                for (const admin of admins) {
                    notifyUser(admin.id, 'notification', {
                        type: 'new_support_ticket',
                        title: notifTitle,
                        message: notifMessage,
                        ticketId: ticket.id
                    });

                    if (admin.pushToken) {
                        await pushNotificationService.sendNotification({
                            to: admin.pushToken,
                            title: notifTitle,
                            body: notifMessage,
                            data: { type: 'new_support_ticket', ticketId: ticket.id }
                        });
                    }
                }
                console.log(`🔔 [SUPPORT] Admin(s) notified about new ticket: ${ticket.id}`);
            }
        } catch (notifErr) {
            console.error('⚠️ [SUPPORT] Admin notification failed (non-critical):', notifErr);
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

        res.json({ success: true, data: tickets });
    } catch (error) {
        next(error);
    }
};

export const getTicketDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const id = req.params.id as string;
        const isAdmin = req.user.userType === 'ADMIN';

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
                const ticket = await prisma.supportTicket.findUnique({
                    where: { id: id as string },
                    include: {
                        user: {
                            select: { fullName: true, email: true, phone: true }
                        },
                        messages: {
                            orderBy: { createdAt: 'asc' },
                            include: {
                                sender: { select: { fullName: true } }
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

        res.json({ success: true, data: ticket });
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
                        user: { select: { fullName: true, email: true, phone: true } }
                    }
                });
                return res.json({ success: true, data: tickets });
            } catch (error) {
                console.warn('⚠️ [SUPPORT] DB getAllTickets failed, falling back to mock');
            }
        }

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

        res.json({ success: true, data: tickets });
    } catch (error) {
        next(error);
    }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user || req.user.userType !== 'ADMIN') {
            throw new ValidationError('Bu işlem için yönetici yetkisi gereklidir');
        }

        const id = req.params.id as string;
        const { status, replyMessage } = req.body;

        if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
            throw new ValidationError('Geçersiz durum');
        }

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
                const ticket = await prisma.supportTicket.update({
                    where: { id: id as string },
                    data: { status },
                    include: {
                        user: { select: { id: true, pushToken: true } }
                    }
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

                // 🔔 Talebi açan kullanıcıya bildirim gönder
                try {
                    const statusLabel = STATUS_LABELS[status] || status;
                    const notifTitle = '📋 Destek Talebiniz Güncellendi';
                    const notifMessage = replyMessage
                        ? `Talebiniz "${statusLabel}" durumuna alındı. Admin notu: ${replyMessage}`
                        : `Talebiniz "${statusLabel}" durumuna alındı.`;

                    notifyUser(ticket.userId, 'notification', {
                        type: 'support_ticket_updated',
                        title: notifTitle,
                        message: notifMessage,
                        ticketId: id,
                        status
                    });

                    await prisma.notification.create({
                        data: {
                            userId: ticket.userId,
                            type: 'SYSTEM',
                            title: notifTitle,
                            message: notifMessage,
                            relatedType: 'SUPPORT_TICKET',
                            relatedId: id
                        }
                    });

                    const ticketUser = (ticket as any).user;
                    if (ticketUser?.pushToken) {
                        await pushNotificationService.sendNotification({
                            to: ticketUser.pushToken,
                            title: notifTitle,
                            body: notifMessage,
                            data: { type: 'support_ticket_updated', ticketId: id, status }
                        });
                    }

                    console.log(`🔔 [SUPPORT] User ${ticket.userId} notified about ticket status: ${status}`);
                } catch (notifErr) {
                    console.error('⚠️ [SUPPORT] User notification failed (non-critical):', notifErr);
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

        // 🔔 Mock modda da socket bildirimi + push
        try {
            const statusLabel = STATUS_LABELS[status] || status;
            const notifTitle = '📋 Destek Talebiniz Güncellendi';
            const notifMessage = replyMessage
                ? `Talebiniz "${statusLabel}" durumuna alındı. Admin notu: ${replyMessage}`
                : `Talebiniz "${statusLabel}" durumuna alındı.`;

            notifyUser(ticket.userId, 'notification', {
                type: 'support_ticket_updated',
                title: notifTitle,
                message: notifMessage,
                ticketId: id,
                status
            });

            // Push token via mock storage
            const ticketUserData = mockStorage.get(ticket.userId);
            if (ticketUserData?.pushToken) {
                await pushNotificationService.sendNotification({
                    to: ticketUserData.pushToken,
                    title: notifTitle,
                    body: notifMessage,
                    data: { type: 'support_ticket_updated', ticketId: id, status }
                });
            }
        } catch (notifErr) {
            console.error('⚠️ [SUPPORT] Mock notification failed:', notifErr);
        }

        res.json({ success: true, message: 'Talep durumu güncellendi', data: ticket });
    } catch (error) {
        next(error);
    }
};

export const addTicketMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const id = req.params.id as string;
        const { text } = req.body;

        if (!text) throw new ValidationError('Mesaj boş olamaz');

        const isAdmin = req.user.userType === 'ADMIN';

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
                const message = await prisma.supportTicketMessage.create({
                    data: {
                        ticketId: id as string,
                        senderId: req.user.id,
                        text,
                        isAdmin
                    }
                });

                // 🔔 Mesaja karşılıklı bildirim
                try {
                    const ticket = await prisma.supportTicket.findUnique({
                        where: { id: id as string },
                        include: { user: { select: { id: true, pushToken: true } } }
                    });

                    if (ticket) {
                        if (isAdmin) {
                            // Admin yanıtladı → kullanıcıya bildir
                            const notifTitle = '💬 Destek Ekibinden Yanıt';
                            const notifBody = `Destek talebinize yanıt geldi: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`;
                            notifyUser(ticket.userId, 'notification', {
                                type: 'support_ticket_reply', title: notifTitle, message: notifBody, ticketId: id
                            });
                            const ticketUser = (ticket as any).user;
                            if (ticketUser?.pushToken) {
                                await pushNotificationService.sendNotification({
                                    to: ticketUser.pushToken, title: notifTitle, body: notifBody,
                                    data: { type: 'support_ticket_reply', ticketId: id }
                                });
                            }
                        } else {
                            // Kullanıcı yanıtladı → admin'e bildir
                            const admins = await prisma.user.findMany({
                                where: { userType: 'ADMIN' }, select: { id: true, pushToken: true }
                            });
                            const notifTitle = '💬 Destek Talebine Kullanıcı Yanıtı';
                            const notifBody = `Kullanıcı talebi yanıtladı: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`;
                            for (const admin of admins) {
                                notifyUser(admin.id, 'notification', {
                                    type: 'support_ticket_user_reply', title: notifTitle, message: notifBody, ticketId: id
                                });
                                if (admin.pushToken) {
                                    await pushNotificationService.sendNotification({
                                        to: admin.pushToken, title: notifTitle, body: notifBody,
                                        data: { type: 'support_ticket_user_reply', ticketId: id }
                                    });
                                }
                            }
                        }
                    }
                } catch (notifErr) {
                    console.error('⚠️ [SUPPORT] Message notification failed (non-critical):', notifErr);
                }

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

        res.json({ success: true, message: 'Mesaj gönderildi', data: message });
    } catch (error) {
        next(error);
    }
};
