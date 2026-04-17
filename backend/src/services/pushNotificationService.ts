import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN
});

// Note: Ensure your Render environment variables include FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID
// using the values from the Service Account JSON provided.

export interface PushNotificationPayload {
    to: string | string[];
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
    badge?: number;
}

/**
 * Geçersiz (DeviceNotRegistered) token'ı veritabanından ve mock storage'dan temizler.
 * Bu sayede bir sonraki bildirim denemesinde boşa gitmez.
 */
async function cleanupInvalidToken(pushToken: string) {
    try {
        // 1. Gerçek veritabanından temizle
        const prismaModule = require('../config/database');
        const prisma = prismaModule.default;
        const isDatabaseAvailable = prismaModule.isDatabaseAvailable;

        if (isDatabaseAvailable) {
            const usersWithToken = await prisma.user.findMany({
                where: { pushToken: pushToken as string }
            });
            
            for (const u of usersWithToken) {
                const ns = (u.notificationSettings as any) || {};
                ns.appUninstalled = true;
                ns.uninstalledAt = new Date().toISOString();
                
                await prisma.user.update({
                    where: { id: u.id },
                    data: { 
                        pushToken: null,
                        notificationSettings: ns
                    }
                });
                console.log(`🧹 Marked user ${u.id} as UNINSTALLED from DB.`);
            }
        }

        // 2. Mock storage'dan temizle
        const { mockStorage } = require('../utils/mockStorage');
        const allUsers = mockStorage.getAllUsers();
        for (const user of allUsers) {
            if (user.pushToken === pushToken) {
                user.pushToken = null;
                if (!user.notificationSettings) user.notificationSettings = {};
                (user.notificationSettings as any).appUninstalled = true;
                (user.notificationSettings as any).uninstalledAt = new Date().toISOString();
                mockStorage.set(user.id, user);
                console.log(`🧹 Marked user ${user.id} as UNINSTALLED in mockStorage`);
            }
        }
    } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup invalid token (non-blocking):', cleanupError);
    }
}

export const pushNotificationService = {
    async sendNotification(payload: PushNotificationPayload) {
        const { to, title, body, data, sound = 'default', badge } = payload;

        const messages: ExpoPushMessage[] = [];
        const pushTokens = Array.isArray(to) ? to : [to];
        // Token → mesaj index eşlemesi (temizleme için)
        const tokenMap: Map<number, string> = new Map();

        for (const pushToken of pushTokens) {
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`❌ Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            tokenMap.set(messages.length, pushToken);
            messages.push({
                to: pushToken,
                sound,
                title,
                body,
                data,
                badge,
                priority: 'high',
                channelId: 'default',
            });

            console.log(`\n📤 SENDING PUSH NOTIFICATION:`);
            console.log(`   To: ${pushToken}`);
            console.log(`   Title: ${title}`);
            console.log(`   Body: ${body}\n`);
        }

        if (messages.length === 0) return;

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        let globalIndex = 0;

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);

                // Log each ticket result for debugging
                ticketChunk.forEach((ticket, index) => {
                    const token = chunk[index]?.to;
                    if (ticket.status === 'ok') {
                        console.log(`   ✅ PUSH DELIVERED to Expo: ${token}`);
                        console.log(`      Ticket ID: ${ticket.id}`);
                    } else if (ticket.status === 'error') {
                        console.error(`   ❌ PUSH FAILED for ${token}:`);
                        console.error(`      Error: ${ticket.message}`);
                        if (ticket.details?.error) {
                            console.error(`      Details: ${ticket.details.error}`);
                            if (ticket.details.error === 'DeviceNotRegistered') {
                                console.error(`      ⚠️ Token INVALID — auto-cleaning from database...`);
                                // Geçersiz token'ı arka planda temizle (non-blocking)
                                if (typeof token === 'string') {
                                    cleanupInvalidToken(token);
                                }
                            }
                        }
                    }
                    globalIndex++;
                });
            } catch (error) {
                console.error('❌ Error sending push notification chunk:', error);
            }
        }

        return tickets;
    }
};

export default pushNotificationService;

