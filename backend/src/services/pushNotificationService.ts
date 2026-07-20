import { Prisma } from '@prisma/client';
import prisma, { isDatabaseAvailable } from '../config/database';

export interface PushNotificationPayload {
    to: string | string[];
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
    badge?: number;
}

type PushRecipient = {
    userId: string;
    expoPushToken: string;
};

const resolveRecipients = async (pushTokens: string[]): Promise<PushRecipient[]> => {
    if (!isDatabaseAvailable || pushTokens.length === 0) return [];

    const rows = await prisma.$queryRaw<PushRecipient[]>(Prisma.sql`
        select distinct user_id as "userId", expo_push_token as "expoPushToken"
        from public.push_tokens
        where expo_push_token in (${Prisma.join(pushTokens)})
          and is_active = true
    `);

    return rows;
};

const enqueueNotification = async (recipient: PushRecipient, payload: PushNotificationPayload) => {
    const eventType = typeof payload.data?.type === 'string' ? payload.data.type : 'custom_notification';
    const message = payload.body;
    const actionUrl = typeof payload.data?.actionUrl === 'string' ? payload.data.actionUrl : null;
    const relatedType = typeof payload.data?.relatedType === 'string' ? payload.data.relatedType : null;
    const relatedId = typeof payload.data?.relatedId === 'string' ? payload.data.relatedId : null;

    const notification = await prisma.notification.create({
        data: {
            userId: recipient.userId,
            type: eventType,
            title: payload.title,
            message,
            actionUrl,
            relatedType,
            relatedId,
            pushSent: false,
        },
    });

    await prisma.$executeRaw(Prisma.sql`
        insert into public.notification_outbox (notification_id, user_id, event_type, payload)
        values (
            ${notification.id},
            ${recipient.userId},
            ${eventType},
            ${JSON.stringify({
                ...payload.data,
                title: payload.title,
                message,
                sound: payload.sound ?? 'default',
                badge: payload.badge ?? null,
            })}::jsonb
        )
    `);

    return notification.id;
};

export const pushNotificationService = {
    async sendNotification(payload: PushNotificationPayload) {
        const pushTokens = Array.isArray(payload.to) ? payload.to : [payload.to];
        const uniqueTokens = [...new Set(pushTokens.filter((token): token is string => Boolean(token)))];

        const recipients = await resolveRecipients(uniqueTokens);
        if (!recipients.length) {
            console.warn('[Push] No active recipients found for notification:', {
                title: payload.title,
                tokenCount: uniqueTokens.length,
            });
            return [];
        }

        const recipientMap = new Map(recipients.map((recipient) => [recipient.userId, recipient]));
        const queuedNotifications: string[] = [];

        for (const recipient of recipientMap.values()) {
            try {
                const notificationId = await enqueueNotification(recipient, payload);
                queuedNotifications.push(notificationId);
            } catch (error) {
                console.error('[Push] Failed to enqueue notification:', {
                    userId: recipient.userId,
                    token: recipient.expoPushToken,
                    error,
                });
            }
        }

        return queuedNotifications;
    },
};

export default pushNotificationService;
