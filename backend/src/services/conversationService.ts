import prisma, { isDatabaseAvailable } from '../config/database';
import { AppError } from '../utils/errors';

export const conversationService = {
    /**
     * Konuşma bul veya oluştur
     */
    async getOrCreateConversation(
        user1Id: string,
        user2Id: string,
        jobPostId?: string
    ) {
        if (!isDatabaseAvailable) {
            throw new Error('DATABASE_NOT_CONNECTED');
        }

        // Engelleme kontrolü
        const block = await prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: user1Id, blockedId: user2Id },
                    { blockerId: user2Id, blockedId: user1Id },
                ],
            },
        });

        if (block) {
            throw new AppError('Engellenen bir kullanıcıyla iletişim kuramazsınız', 403);
        }

        // Mevcut konuşmayı ara
        let conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { participant1Id: user1Id, participant2Id: user2Id },
                    { participant1Id: user2Id, participant2Id: user1Id },
                ],
                ...(jobPostId ? { jobPostId } : {}),
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
                    },
                },
                participant2: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
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

        // Yoksa oluştur
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    participant1Id: user1Id,
                    participant2Id: user2Id,
                    jobPostId,
                },
                include: {
                    participant1: {
                        select: {
                            id: true,
                            fullName: true,
                            profileImageUrl: true,
                            userType: true,
                            email: true,
                        },
                    },
                    participant2: {
                        select: {
                            id: true,
                            fullName: true,
                            profileImageUrl: true,
                            userType: true,
                            email: true,
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
        }

        if (conversation.participant1 && (conversation.participant1.email === 'mpakdil0@gmail.com' || conversation.participant1.userType === 'ADMIN')) {
            (conversation.participant1 as any).fullName = 'Yönetici';
            (conversation.participant1 as any).userType = 'ADMIN';
        }
        if (conversation.participant2 && (conversation.participant2.email === 'mpakdil0@gmail.com' || conversation.participant2.userType === 'ADMIN')) {
            (conversation.participant2 as any).fullName = 'Yönetici';
            (conversation.participant2 as any).userType = 'ADMIN';
        }

        return conversation;
    },

    /**
     * Kullanıcının tüm konuşmalarını getir
     */
    async getConversations(userId: string) {
        if (!isDatabaseAvailable) {
            throw new Error('DATABASE_NOT_CONNECTED');
        }

        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    { participant1Id: userId, isArchivedParticipant1: false },
                    { participant2Id: userId, isArchivedParticipant2: false },
                ],
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
                    },
                },
                participant2: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
                    },
                },
                jobPost: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        senderId: true,
                        isRead: true,
                    },
                },
            },
            orderBy: { lastMessageAt: 'desc' },
        });

        // Engellenen kullanıcıları getir
        const blocks = await prisma.block.findMany({
            where: {
                OR: [
                    { blockerId: userId },
                    { blockedId: userId },
                ],
            },
            select: {
                blockerId: true,
                blockedId: true,
            },
        });

        const blockedUserIds = blocks.map((b: any) => b.blockerId === userId ? b.blockedId : b.blockerId);

        const filteredConversations = conversations.filter((conv: any) => {
            const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
            return !blockedUserIds.includes(otherUserId);
        });

        return filteredConversations.map((conv: any) => {
            const otherUser = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
            
            // 🛡️ Admin name override
            if (otherUser && (otherUser.email === 'mpakdil0@gmail.com' || otherUser.userType === 'ADMIN')) {
                otherUser.fullName = 'Yönetici';
                otherUser.userType = 'ADMIN';
            }

            const unreadCount = conv.participant1Id === userId
                ? conv.unreadCountParticipant1
                : conv.unreadCountParticipant2;

            return {
                id: conv.id,
                otherUser,
                jobPost: conv.jobPost,
                lastMessage: conv.messages[0] || null,
                lastMessagePreview: conv.lastMessagePreview,
                lastMessageAt: conv.lastMessageAt,
                unreadCount,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt,
            };
        });
    },

    /**
     * Tek bir konuşmayı getir
     */
    async getConversation(conversationId: string, userId: string) {
        if (!isDatabaseAvailable) {
            throw new Error('DATABASE_NOT_CONNECTED');
        }

        // First try strict participant check
        let conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { participant1Id: userId },
                    { participant2Id: userId },
                ],
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
                    },
                },
                participant2: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
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

        // Fallback: If not found via participant check, try by ID only
        // This handles cases where conversation was created but participant IDs don't match
        if (!conversation) {
            console.warn(`⚠️ getConversation: User ${userId} not found as participant, trying by ID only...`);
            conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    participant1: {
                        select: { id: true, fullName: true, profileImageUrl: true, userType: true, email: true },
                    },
                    participant2: {
                        select: { id: true, fullName: true, profileImageUrl: true, userType: true, email: true },
                    },
                    jobPost: {
                        select: { id: true, title: true },
                    },
                },
            });

            if (!conversation) {
                throw new AppError('Konuşma bulunamadı', 404);
            }

            // Verify user has messages in this conversation (loose access check)
            const hasMessages = await prisma.message.findFirst({
                where: {
                    conversationId,
                    OR: [
                        { senderId: userId },
                        { recipientId: userId },
                    ],
                },
            });

            // Also check if user is the citizen of the related job post
            let isJobOwner = false;
            if (conversation.jobPostId) {
                const job = await prisma.jobPost.findUnique({
                    where: { id: conversation.jobPostId },
                    select: { citizenId: true },
                });
                isJobOwner = job?.citizenId === userId;
            }

            if (!hasMessages && !isJobOwner) {
                console.warn(`⚠️ getConversation: User ${userId} has no messages and is not job owner. Denying access.`);
                throw new AppError('Konuşma bulunamadı', 404);
            }

            console.log(`✅ getConversation: User ${userId} granted access via fallback (hasMessages: ${!!hasMessages}, isJobOwner: ${isJobOwner})`);
        }

        const otherUser = conversation.participant1Id === userId
            ? conversation.participant2
            : conversation.participant1;

        // 🛡️ Admin name override
        if (otherUser && (otherUser.email === 'mpakdil0@gmail.com' || otherUser.userType === 'ADMIN')) {
            otherUser.fullName = 'Yönetici';
            otherUser.userType = 'ADMIN';
        }

        return {
            ...conversation,
            otherUser,
        };
    },

    /**
     * Katılımcılara göre konuşma bul
     */
    async findConversation(user1Id: string, user2Id: string, jobPostId?: string) {
        if (!isDatabaseAvailable) {
            throw new Error('DATABASE_NOT_CONNECTED');
        }

        const conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { participant1Id: user1Id, participant2Id: user2Id },
                    { participant1Id: user2Id, participant2Id: user1Id },
                ],
                ...(jobPostId ? { jobPostId } : {}),
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
                    },
                },
                participant2: {
                    select: {
                        id: true,
                        fullName: true,
                        profileImageUrl: true,
                        userType: true,
                        email: true,
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

        if (!conversation) return null;

        const otherUser = conversation.participant1Id === user1Id
            ? conversation.participant2
            : conversation.participant1;

        // 🛡️ Admin name override
        if (otherUser && (otherUser.email === 'mpakdil0@gmail.com' || otherUser.userType === 'ADMIN')) {
            otherUser.fullName = 'Yönetici';
            otherUser.userType = 'ADMIN';
        }

        return {
            ...conversation,
            otherUser,
        };
    },

    /**
     * Konuşma mesajlarını getir
     */
    async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
        // Erişim kontrolü - önce participant kontrolü
        let conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { participant1Id: userId },
                    { participant2Id: userId },
                ],
            },
        });

        // Fallback: participant kontrolü başarısızsa, ID ile bul + mesaj/iş sahibi kontrolü yap
        if (!conversation) {
            console.warn(`⚠️ getMessages: User ${userId} not found as participant, trying fallback...`);
            conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
            });

            if (!conversation) {
                throw new AppError('Konuşma bulunamadı veya erişim reddedildi', 404);
            }

            // Verify user has messages in this conversation or is job owner
            const hasMessages = await prisma.message.findFirst({
                where: {
                    conversationId,
                    OR: [{ senderId: userId }, { recipientId: userId }],
                },
            });

            let isJobOwner = false;
            if (conversation.jobPostId) {
                const job = await prisma.jobPost.findUnique({
                    where: { id: conversation.jobPostId },
                    select: { citizenId: true },
                });
                isJobOwner = job?.citizenId === userId;
            }

            if (!hasMessages && !isJobOwner) {
                throw new AppError('Konuşma bulunamadı veya erişim reddedildi', 404);
            }

            console.log(`✅ getMessages: User ${userId} granted access via fallback`);
        }

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: {
                    conversationId,
                    isDeleted: false,
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
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.message.count({
                where: {
                    conversationId,
                    isDeleted: false,
                },
            }),
        ]);

        // 🛡️ Admin name override for message senders
        messages.forEach((msg: any) => {
            if (msg.sender && (msg.sender.email === 'mpakdil0@gmail.com' || msg.sender.userType === 'ADMIN')) {
                 msg.sender.fullName = 'Yönetici';
                 msg.sender.userType = 'ADMIN';
            }
        });

        return {
            messages: messages.reverse(), // En eski mesaj önce
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
};

export default conversationService;
