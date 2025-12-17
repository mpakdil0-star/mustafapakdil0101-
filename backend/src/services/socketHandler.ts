import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import prisma from '../config/database';

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

export const initializeSocketServer = (httpServer: HttpServer): SocketServer => {
    const io = new SocketServer(httpServer, {
        cors: {
            origin: '*', // Production'da spesifik origin belirleyin
            methods: ['GET', 'POST'],
        },
        path: '/socket.io',
    });

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

        // Konuşmaya katıl
        socket.on('join_conversation', async (conversationId: string) => {
            try {
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
                socket.emit('error', { message: 'Failed to join conversation' });
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

                // Alıcıya bildirim gönder (konuşmada değilse bile)
                io.to(`user:${recipientId}`).emit('notification', {
                    type: 'new_message',
                    conversationId,
                    senderName: message.sender.fullName,
                    preview: content.substring(0, 50),
                });

                console.log(`💬 Message sent in conversation ${conversationId}`);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Mesajları okundu olarak işaretle
        socket.on('mark_as_read', async (conversationId: string) => {
            try {
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
