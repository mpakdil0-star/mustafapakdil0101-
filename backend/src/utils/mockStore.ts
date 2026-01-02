const mockUnreadCounts = new Map<string, number>();
const mockConversations = new Map<string, any>();
const mockMessages = new Map<string, any[]>();

// Initialize with some default data
mockUnreadCounts.set('mock-conv-1', 1);

export const mockStore = {
    // Unread count management
    getUnreadCount: (convId: string) => mockUnreadCounts.get(convId) ?? 0,
    setUnreadCount: (convId: string, count: number) => mockUnreadCounts.set(convId, count),
    clearUnreadCount: (convId: string) => mockUnreadCounts.set(convId, 0),

    // Conversation management
    saveConversation: (conversation: any) => {
        mockConversations.set(conversation.id, conversation);
        console.log(`💬 [MOCK STORE] Saved conversation: ${conversation.id}`);
        return conversation;
    },

    getConversation: (convId: string) => {
        return mockConversations.get(convId) || null;
    },

    getConversationsByUserId: (userId: string) => {
        const userConvs: any[] = [];
        mockConversations.forEach((conv) => {
            if (conv.participant1Id === userId || conv.participant2Id === userId) {
                userConvs.push(conv);
            }
        });
        return userConvs;
    },

    findConversationByParticipants: (userId1: string, userId2: string) => {
        let found: any = null;
        mockConversations.forEach((conv) => {
            if (
                (conv.participant1Id === userId1 && conv.participant2Id === userId2) ||
                (conv.participant1Id === userId2 && conv.participant2Id === userId1)
            ) {
                found = conv;
            }
        });
        return found;
    },

    // Message management
    saveMessage: (message: any) => {
        const convId = message.conversationId;
        if (!mockMessages.has(convId)) {
            mockMessages.set(convId, []);
        }
        const messages = mockMessages.get(convId)!;
        messages.push(message);
        console.log(`✉️ [MOCK STORE] Saved message to conversation: ${convId}`);

        // Update conversation's lastMessage
        const conversation = mockConversations.get(convId);
        if (conversation) {
            conversation.lastMessage = message;
            conversation.lastMessageAt = message.createdAt;
            conversation.updatedAt = message.createdAt;

            // Increment unread count for receiver
            const currentUnread = mockUnreadCounts.get(convId) ?? 0;
            mockUnreadCounts.set(convId, currentUnread + 1);
        }

        return message;
    },

    getMessages: (convId: string) => {
        return mockMessages.get(convId) || [];
    },

    getAllConversations: () => {
        const all: any[] = [];
        mockConversations.forEach((conv) => all.push(conv));
        return all;
    },

    getAllMessages: () => {
        const all: any[] = [];
        mockMessages.forEach((msgs) => all.push(...msgs));
        return all;
    }
};
