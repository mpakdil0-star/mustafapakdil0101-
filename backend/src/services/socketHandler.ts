import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma, { isDatabaseAvailable } from '../config/database';
import { mockStore } from '../utils/mockStore';
import pushNotificationService from './pushNotificationService';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userType?: string;
}

interface MessagePayload {
    conversationId: string;
    content: string;
    messageType?: 'TEXT' | 'IMAGE' | 'FILE';
}

// Aktif kullanıcı bağlantılarını takip et
const userSockets = new Map<string, Set<string>>();
let ioInstance: SocketServer | null = null;

export const initializeSocketServer = (httpServer: HttpServer): SocketServer => {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: '*', // Production'da spesifik origin belirleyin
            methods: ['GET', 'POST'],
        },
        path: '/socket.io',
    });
    ioInstance = io;

    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token as string, config.jwtSecret) as any;
            socket.userId = decoded.id;
            socket.userType = decoded.userType;

            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;
        console.log(`🔌 User connected: ${userId}`);

        // Kullanıcının socket bağlantılarını kaydet
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socket.id);

        // Kullanıcının kendi odasına katıl
        socket.join(`user:${userId}`);

        // Elektrikçiler odasına katıl (eğer elektrikçiyse)
        if (socket.userType === 'ELECTRICIAN') {
            socket.join('all_electricians');
            console.log(`👷 Electrician ${userId} joined global electricians room`);
            joinUserLocationRooms(socket);
        }

        // Konuşmaya katıl
        socket.on('join_conversation', async (conversationId: string) => {
            try {
                // Mock veya veritabanı yoksa
                if (!isDatabaseAvailable || userId.startsWith('mock-') || conversationId.startsWith('mock-')) {
                    const { mockStore } = require('../utils/mockStore');

                    if (mockStore.isParticipant(conversationId, userId)) {
                        socket.join(`conversation:${conversationId}`);
                        console.log(`📝 User ${userId} joined conversation ${conversationId} (Mock/No DB)`);
                    } else {
                        console.warn(`🔒 Access denied: User ${userId} tried to join ${conversationId}`);
                        socket.emit('error', { message: 'Access denied to this conversation' });
                    }
                    return;
                }

                // Kullanıcının bu konuşmaya erişimi olup olmadığını kontrol et
                const conversation = await prisma.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { participant1Id: userId },
                            { participant2Id: userId },
                        ],
                    },
                });

                if (conversation) {
                    socket.join(`conversation:${conversationId}`);
                    console.log(`📝 User ${userId} joined conversation ${conversationId}`);
                } else {
                    socket.emit('error', { message: 'Conversation not found or access denied' });
                }
            } catch (error) {
                console.error('Error joining conversation:', error);
                // Veritabanı hatası olsa bile mock modda katılmaya izin ver
                socket.join(`conversation:${conversationId}`);
                console.warn(`⚠️ Veritabanı hatasına rağmen odaya katılma denendi: ${conversationId}`);
            }
        });

        // Konuşmadan ayrıl
        socket.on('leave_conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
            console.log(`👋 User ${userId} left conversation ${conversationId}`);
        });

        // Mesaj gönder
        socket.on('send_message', async (payload: MessagePayload) => {
            try {
                const { conversationId, content, messageType = 'TEXT' } = payload;

                // Mock veya veritabanı yoksa direkt gönder (Client-side broadcast)
                if (!isDatabaseAvailable || userId.startsWith('mock-') || conversationId.startsWith('mock-')) {
                    const { mockStore } = require('../utils/mockStore');

                    // Kullanıcı bilgilerini al
                    const { mockStorage } = require('../utils/mockStorage');
                    const senderUser = mockStorage.get(userId);

                    const mockMessage = {
                        id: `mock-socket-msg-${Date.now()}`,
                        conversationId,
                        senderId: userId,
                        receiverId: 'mock-recipient',
                        content,
                        messageType,
                        isRead: false,
                        createdAt: new Date().toISOString(),
                        sender: {
                            id: userId,
                            fullName: senderUser?.fullName || 'Kullanıcı',
                            profileImageUrl: senderUser?.profileImageUrl || null,
                        },
                    };

                    // Determine receiverId (using robust detection from ID if memory is cleared)
                    const receiverId = mockStore.getOtherParticipant(conversationId, userId);
                    mockMessage.receiverId = receiverId;

                    // Save to mockStore
                    mockStore.saveMessage(mockMessage);

                    // Add to mock notifications for persistence
                    const { addMockNotification } = require('../routes/notificationRoutes');
                    addMockNotification(mockMessage.receiverId, {
                        id: `mock-notif-${Date.now()}`,
                        userId: mockMessage.receiverId,
                        type: 'new_message',
                        title: '💬 Yeni Mesaj',
                        message: `${senderUser?.fullName || 'Bir kullanıcı'}: ${content.substring(0, 50)}`,
                        relatedType: 'CONVERSATION',
                        relatedId: conversationId,
                        isRead: false,
                        createdAt: new Date().toISOString()
                    });

                    io.to(`conversation:${conversationId}`).emit('new_message', {
                        message: mockMessage
                    });

                    const senderTitle = (senderUser?.userType === 'ADMIN' || senderUser?.email === 'mpakdil0@gmail.com') 
                        ? 'Yönetici' 
                        : (senderUser?.fullName || 'Kullanıcı');

                    // Send notification to force badge update if user is not in the room
                    io.to(`user:${mockMessage.receiverId}`).emit('notification', {
                        type: 'new_message',
                        conversationId,
                        senderName: senderTitle,
                        preview: content.substring(0, 50),
                    });

                    // CRITICAL: Send PUSH notification (for background/closed app)
                    const receiverData = mockStorage.get(mockMessage.receiverId);
                    if (receiverData?.pushToken) {
                        const pushNotificationService = require('../services/pushNotificationService').default;
                        pushNotificationService.sendNotification({
                            to: receiverData.pushToken,
                            title: `${senderTitle} mesaj gönderdi 💬`,
                            body: content.substring(0, 80) + (content.length > 80 ? '...' : ''),
                            data: { conversationId, type: 'new_message' }
                        }).catch((err: any) => console.error('Push Notification Error:', err));
                    }

                    console.log(`💬 Mock message sent & saved via socket in conversation ${conversationId}`);
                    return;
                }

                // Konuşmayı bul
                const conversation = await prisma.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { participant1Id: userId },
                            { participant2Id: userId },
                        ],
                    },
                });

                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                // Alıcıyı belirle
                const recipientId = conversation.participant1Id === userId
                    ? conversation.participant2Id
                    : conversation.participant1Id;

                // Mesajı kaydet
                const message = await prisma.message.create({
                    data: {
                        conversationId,
                        senderId: userId,
                        recipientId,
                        content,
                        messageType,
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                fullName: true,
                                profileImageUrl: true,
                                userType: true,
                                email: true,
                            },
                        },
                    },
                });

                // Konuşmayı güncelle
                const updateData: any = {
                    lastMessageAt: new Date(),
                    lastMessagePreview: content.substring(0, 100),
                };

                // Okunmamış mesaj sayısını artır
                if (conversation.participant1Id === recipientId) {
                    updateData.unreadCountParticipant1 = { increment: 1 };
                } else {
                    updateData.unreadCountParticipant2 = { increment: 1 };
                }

                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: updateData,
                });

                // Mesajı konuşmadaki herkese gönder
                io.to(`conversation:${conversationId}`).emit('new_message', {
                    message: {
                        id: message.id,
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        content: message.content,
                        messageType: message.messageType,
                        createdAt: message.createdAt,
                        sender: message.sender,
                    },
                });

                // Bildirimi veritabanına kaydet (Kalıcı rozet için)
                const dbNotification = await prisma.notification.create({
                    data: {
                        userId: recipientId,
                        type: 'new_message',
                        title: '💬 Yeni Mesaj',
                        message: `${message.sender.fullName}: ${content.substring(0, 50)}`,
                        relatedType: 'CONVERSATION',
                        relatedId: conversationId,
                    }
                });

                const senderTitle = (message.sender.userType === 'ADMIN' || message.sender.email === 'mpakdil0@gmail.com') 
                    ? 'Yönetici' 
                    : message.sender.fullName;

                // Alıcıya socket bildirimi gönder (konuşmada değilse bile gerçek zamanlı güncelleme için)
                io.to(`user:${recipientId}`).emit('notification', {
                    id: dbNotification.id,
                    type: 'new_message',
                    conversationId,
                    message: {
                        id: message.id,
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        content: message.content,
                        messageType: message.messageType,
                        createdAt: message.createdAt,
                    },
                    senderName: senderTitle,
                    preview: content.substring(0, 50),
                    isRead: false,
                    createdAt: dbNotification.createdAt,
                });

                // CRITICAL: Alıcıya PUSH bildirimi gönder (Arka plan/ Kapalı uygulama için)
                // Real DB path was missing this!
                const recipient = await prisma.user.findUnique({
                    where: { id: recipientId },
                    select: { pushToken: true }
                });

                if (recipient?.pushToken) {
                    pushNotificationService.sendNotification({
                        to: recipient.pushToken,
                        title: `${senderTitle} mesaj gönderdi 💬`,
                        body: content.substring(0, 80) + (content.length > 80 ? '...' : ''),
                        data: { conversationId, type: 'new_message' }
                    }).catch((err: any) => console.error('Push Notification Error (Real DB):', err));
                }

                console.log(`💬 Message sent in conversation ${conversationId}`);
            } catch (error) {
                console.error('Error sending message:', error);
                // Hata durumunda bile broadcast dene (best effort)
                io.to(`conversation:${payload.conversationId}`).emit('new_message', {
                    message: {
                        id: `error-msg-${Date.now()}`,
                        conversationId: payload.conversationId,
                        senderId: userId,
                        content: payload.content,
                        messageType: payload.messageType || 'TEXT',
                        createdAt: new Date().toISOString(),
                        sender: { id: userId, fullName: 'Siz', profileImageUrl: null }
                    }
                });
            }
        });

        // Mesajları okundu olarak işaretle
        socket.on('mark_as_read', async (conversationId: string) => {
            try {
                // Mock veya veritabanı yoksa direkt başarılı dön
                if (!isDatabaseAvailable || userId.startsWith('mock-') || conversationId.startsWith('mock-')) {
                    mockStore.clearUnreadCount(conversationId, userId);

                    // Bildirimleri de temizle (Örn: rozet için)
                    const { clearMockNotificationsByRelatedId } = require('../routes/notificationRoutes');
                    clearMockNotificationsByRelatedId(userId, ['new_message', 'MESSAGE_RECEIVED'], conversationId);
                    return;
                }

                const conversation = await prisma.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { participant1Id: userId },
                            { participant2Id: userId },
                        ],
                    },
                });

                if (!conversation) return;

                // Okunmamış mesajları güncelle
                await prisma.message.updateMany({
                    where: {
                        conversationId,
                        recipientId: userId,
                        isRead: false,
                    },
                    data: {
                        isRead: true,
                        readAt: new Date(),
                    },
                });

                // Konuşmadaki okunmamış sayısını sıfırla
                const updateData: any = {};
                if (conversation.participant1Id === userId) {
                    updateData.unreadCountParticipant1 = 0;
                } else {
                    updateData.unreadCountParticipant2 = 0;
                }

                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: updateData,
                });

                // Rozeti temizlemek için ilgili bildirimleri de okundu yap
                await prisma.notification.updateMany({
                    where: {
                        userId,
                        relatedId: conversationId,
                        type: { in: ['new_message', 'MESSAGE_RECEIVED'] },
                        isRead: false
                    },
                    data: { isRead: true }
                });

                // Karşı tarafa okundu bilgisi gönder
                const otherUserId = conversation.participant1Id === userId
                    ? conversation.participant2Id
                    : conversation.participant1Id;

                io.to(`user:${otherUserId}`).emit('messages_read', {
                    conversationId,
                    readBy: userId,
                });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Yazıyor bilgisi
        socket.on('typing', (conversationId: string) => {
            socket.to(`conversation:${conversationId}`).emit('user_typing', {
                conversationId,
                userId,
            });
        });

        // Yazmayı bıraktı
        socket.on('stop_typing', (conversationId: string) => {
            socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
                conversationId,
                userId,
            });
        });

        // Bağlantı koptuğunda
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${userId}`);

            // Socket'i listeden kaldır
            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                }
            }
        });
    });

    return io;
};

// Kullanıcının online olup olmadığını kontrol et
export const isUserOnline = (userId: string): boolean => {
    return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
};

// Belirli bir kullanıcıya mesaj gönder
export const sendToUser = (io: SocketServer, userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, data);
};

// Online kullanıcıları listele (userType bilgisiyle birlikte)
export const getOnlineUsers = () => {
    const onlineUsers: { id: string, userType?: string }[] = [];

    // userSockets map'indeki her userId için online bilgisini topla
    // Not: Gerçek bir uygulamada bu veriyi Redis veya global bir state'te tutmak daha iyidir
    // Biz buradaki userSockets map'ini ve socket nesnelerindeki userType bilgisini kullanacağız

    // socket.userId ve socket.userType bilgilerine erişmek için bağlı her socket'e bakalım
    // Bu basit bir yaklaşımdır.

    // userSockets Map'ini kullanarak online olanları dön
    for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.size > 0) {
            // userId bazlı userType bilgisini o kullanıcıya ait socket'lerden birinden çekebiliriz
            // (Tüm socket'ler aynı userType'a sahip olmalı)
            onlineUsers.push({ id: userId, userType: 'ELECTRICIAN' }); // Default ELECTRICIAN (mock için yeterli)
            // Not: Gerçek çözüm için socket nesnelerinden userType çekilmeli
        }
    }

    return onlineUsers;
};

// --- Yeni Dinamik Oda Yönetimi ---

/**
 * Kullanıcının konum odalarını yeniler (Profil/Konum güncellemesinden sonra tetiklenir)
 */
export const refreshUserRooms = async (userId: string) => {
    if (!ioInstance) return;

    const socketIds = userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) return;

    console.log(`🔄 Refreshing rooms for user: ${userId} (${socketIds.size} active sockets)`);

    for (const socketId of socketIds) {
        const socket = ioInstance.sockets.sockets.get(socketId) as AuthenticatedSocket;
        if (socket && socket.userType === 'ELECTRICIAN') {
            // Önce mevcut tüm area odalarından çık
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room.startsWith('area:')) {
                    socket.leave(room);
                }
            });

            // Yeni konumlar ile odalara tekrar katıl
            await joinUserLocationRooms(socket);
        }
    }
};

/**
 * Elektrikçinin konum bazlı odalara katılmasını sağlar
 */
async function joinUserLocationRooms(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    try {
        let userLocations: any[] = [];
        let serviceCategory = 'elektrik'; // Default

        if (!isDatabaseAvailable || userId.startsWith('mock-')) {
            const { mockStorage } = require('../utils/mockStorage');
            const mockData = mockStorage.get(userId);

            if (!mockData) {
                console.warn(`⚠️ [joinUserLocationRooms] No mock data found for user: ${userId}`);
                return;
            }

            serviceCategory = mockData.serviceCategory || mockData.electricianProfile?.serviceCategory || 'elektrik';

            // 1. Eklediği tüm etkin (isActive) hizmet bölgelerinden odaya katıl
            if (mockData.locations && Array.isArray(mockData.locations) && mockData.locations.length > 0) {
                mockData.locations
                    .filter((loc: any) => loc.isActive !== false) // Sadece aktif olanlar
                    .forEach((loc: any) => {
                        userLocations.push({
                            city: loc.city,
                            district: loc.district || 'Merkez'
                        });
                    });
            } else {
                // Fallback: Kullanıcının şehri varsa o şehrin genel odasına katıl
                if (mockData.city) {
                    console.log(`📍 [joinUserLocationRooms] No locations, using user city: ${mockData.city}`);
                    userLocations.push({
                        city: mockData.city,
                        district: mockData.district || 'Merkez'
                    });
                }
            }
        } else {
            const userWithLocations = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    locations: {
                        where: { isActive: true } // Sadece aktif kayıtları getir
                    },
                    electricianProfile: true
                }
            });
            userLocations = userWithLocations?.locations || [];
            serviceCategory = (userWithLocations?.electricianProfile as any)?.serviceCategory || 'elektrik';
        }

        if (userLocations.length === 0) {
            console.warn(`⚠️ [joinUserLocationRooms] User ${userId} has NO locations to join rooms for`);
            return;
        }

        userLocations.forEach(loc => {
            if (loc.city) {
                if (loc.district && loc.district !== 'Tüm Şehir' && loc.district !== 'Merkez') {
                    // Kategoriye özel ilçe odasına katıl
                    const districtRoom = `area:${loc.city}:${loc.district}:${serviceCategory}`;
                    socket.join(districtRoom);
                    console.log(`📍 User ${userId} joined category-specific district room: ${districtRoom}`);
                } else {
                    // Kategoriye özel şehir genel odasına katıl
                    const cityRoom = `area:${loc.city}:all:${serviceCategory}`;
                    socket.join(cityRoom);
                    console.log(`📍 User ${userId} joined category-specific city room: ${cityRoom}`);
                }
            }
        });
    } catch (err) {
        console.error('Error in joinUserLocationRooms:', err);
    }
}
