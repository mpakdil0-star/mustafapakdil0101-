import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export interface PushNotificationPayload {
    to: string | string[];
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
    badge?: number;
}

export const pushNotificationService = {
    async sendNotification(payload: PushNotificationPayload) {
        const { to, title, body, data, sound = 'default', badge } = payload;

        const messages: ExpoPushMessage[] = [];
        const pushTokens = Array.isArray(to) ? to : [to];

        for (const pushToken of pushTokens) {
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`❌ Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: pushToken,
                sound,
                title,
                body,
                data,
                badge,
            });
        }

        if (messages.length === 0) return;

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('❌ Error sending push notification chunk:', error);
            }
        }

        return tickets;
    }
};

export default pushNotificationService;
