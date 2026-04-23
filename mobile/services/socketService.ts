import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, WS_BASE_URL } from '../constants/api';

const API_TOKEN_KEY = 'auth_token';

interface MessageData {
    id: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    read: boolean;
    messageType: string;
    createdAt: string;
    sender: {
        id: string;
        fullName: string;
        profileImageUrl: string | null;
    };
}

interface NotificationData {
    type: string;
    conversationId?: string;
    senderName?: string;
    preview?: string;
    message?: MessageData;
}

// Bid notification interfaces
interface BidNotificationData {
    type: 'bid_received' | 'bid_accepted' | 'bid_rejected';
    bidId: string;
    jobPostId: string;
    jobTitle?: string;
    amount?: string;
    electricianName?: string;
    message: string;
}

export type { MessageData, NotificationData, BidNotificationData };
export type MessageHandler = (data: { message: MessageData }) => void;
type TypingHandler = (data: { conversationId: string; userId: string }) => void;
type ReadHandler = (data: { conversationId: string; readBy: string }) => void;
type NotificationHandler = (data: NotificationData) => void;
type BidNotificationHandler = (data: BidNotificationData) => void;

class SocketService {
    private socket: Socket | null = null;
    private isConnected = false;
    private isConnecting = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    // Event handlers
    private messageHandlers: Set<MessageHandler> = new Set();
    private typingHandlers: Set<TypingHandler> = new Set();
    private stopTypingHandlers: Set<TypingHandler> = new Set();
    private readHandlers: Set<ReadHandler> = new Set();
    private notificationHandlers: Set<NotificationHandler> = new Set();
    private bidNotificationHandlers: Set<BidNotificationHandler> = new Set();
    private jobStatusHandlers: Set<NotificationHandler> = new Set();
    private reviewHandlers: Set<NotificationHandler> = new Set();

    async connect(): Promise<boolean> {
        // Eğer zaten bağlıysa veya bağlanma sürecindeyse tekrar deneme
        if (this.socket?.connected || this.isConnecting) {
            if (this.socket?.connected) console.log('🔌 Socket: Zaten bağlı.');
            return true;
        }

        this.isConnecting = true;

        try {
            const token = await SecureStore.getItemAsync(API_TOKEN_KEY);

            if (!token) {
                console.warn('🔌 Socket: No token available');
                this.isConnecting = false;
                return false;
            }

            // Base URL'den WebSocket URL oluştur
            const wsUrl = WS_BASE_URL;
            console.log('🔌 Socket: Bağlanmaya çalışılan adres:', wsUrl);

            // Varsa eski soketi temizle
            if (this.socket) {
                this.socket.disconnect();
                this.socket.removeAllListeners();
            }

            this.socket = io(wsUrl, {
                auth: { token },
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 2000,
                timeout: 5000,
                transports: ['polling', 'websocket'],
                forceNew: true
            });

            this.setupEventListeners();

            return new Promise((resolve) => {
                this.socket?.once('connect', () => {
                    console.log('🔌 Socket connected');
                    this.isConnected = true;
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    resolve(true);
                });

                this.socket?.once('connect_error', (error) => {
                    this.isConnected = false;
                    this.isConnecting = false;
                    resolve(false);
                });

                // Timeout
                setTimeout(() => {
                    if (this.isConnecting) {
                        console.warn('🔌 Socket: Bağlantı zaman aşımı.');
                        this.isConnecting = false;
                        resolve(false);
                    }
                }, 10000);
            });
        } catch (error) {
            console.error('🔌 Socket connection failed:', error);
            this.isConnecting = false;
            return false;
        }
    }

    private setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            this.isConnected = false;
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
            this.isConnected = true;
        });

        this.socket.on('error', (error) => {
            console.error('🔌 Socket error:', error);
        });

        // Mesaj eventi
        this.socket.on('new_message', (data: { message: MessageData }) => {
            this.messageHandlers.forEach(handler => handler(data));
        });

        // Yazıyor eventi
        this.socket.on('user_typing', (data: { conversationId: string; userId: string }) => {
            this.typingHandlers.forEach(handler => handler(data));
        });

        // Yazmayı bıraktı eventi
        this.socket.on('user_stopped_typing', (data: { conversationId: string; userId: string }) => {
            this.stopTypingHandlers.forEach(handler => handler(data));
        });

        // Okundu eventi
        this.socket.on('messages_read', (data: { conversationId: string; readBy: string }) => {
            this.readHandlers.forEach(handler => handler(data));
        });

        // Bildirim eventi
        this.socket.on('notification', (data: NotificationData) => {
            this.notificationHandlers.forEach(handler => handler(data));
        });

        // Teklif alındı eventi (vatandaş için)
        this.socket.on('bid_received', (data: BidNotificationData) => {
            console.log('📢 Bid received notification:', data);
            this.bidNotificationHandlers.forEach(handler => handler(data));
        });

        // Teklif kabul edildi eventi (usta için)
        this.socket.on('bid_accepted', (data: BidNotificationData) => {
            console.log('✅ Bid accepted notification:', data);
            this.bidNotificationHandlers.forEach(handler => handler(data));
        });

        // Teklif reddedildi eventi (usta için)
        this.socket.on('bid_rejected', (data: BidNotificationData) => {
            console.log('❌ Bid rejected notification:', data);
            this.bidNotificationHandlers.forEach(handler => handler(data));
        });

        // İş durumu güncelleme eventi
        this.socket.on('job_status_updated', (data: any) => {
            console.log('🔄 Job status updated:', data);
            this.jobStatusHandlers.forEach(handler => handler(data));
        });

        // Yeni değerlendirme eventi
        this.socket.on('new_review', (data: any) => {
            console.log('⭐ New review received:', data);
            this.reviewHandlers.forEach(handler => handler(data));
        });

        // Yeni iş ilanı eventi
        this.socket.on('new_job_available', (data: any) => {
            console.log('⚡ New job available notification:', data);
            // Ensure type is set for the frontend handlers
            const enrichedData = { ...data, type: 'new_job_available' };
            this.notificationHandlers.forEach(handler => handler(enrichedData));
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }

    // Konuşmaya katıl
    joinConversation(conversationId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('join_conversation', conversationId);
        }
    }

    // Konuşmadan ayrıl
    leaveConversation(conversationId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_conversation', conversationId);
        }
    }

    // Mesaj gönder
    sendMessage(conversationId: string, content: string, messageType = 'TEXT') {
        if (this.socket && this.isConnected) {
            this.socket.emit('send_message', {
                conversationId,
                content,
                messageType,
            });
        }
    }

    // Okundu olarak işaretle
    markAsRead(conversationId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('mark_as_read', conversationId);
        }
    }

    // Yazıyor bilgisi gönder
    sendTyping(conversationId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('typing', conversationId);
        }
    }

    // Yazmayı bıraktı bilgisi gönder
    sendStopTyping(conversationId: string) {
        if (this.socket && this.isConnected) {
            this.socket.emit('stop_typing', conversationId);
        }
    }

    // Event handler'ları ekle/kaldır
    onMessage(handler: MessageHandler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onTyping(handler: TypingHandler) {
        this.typingHandlers.add(handler);
        return () => this.typingHandlers.delete(handler);
    }

    onStopTyping(handler: TypingHandler) {
        this.stopTypingHandlers.add(handler);
        return () => this.stopTypingHandlers.delete(handler);
    }

    onMessagesRead(handler: ReadHandler) {
        this.readHandlers.add(handler);
        return () => this.readHandlers.delete(handler);
    }

    onNotification(handler: NotificationHandler) {
        this.notificationHandlers.add(handler);
        return () => this.notificationHandlers.delete(handler);
    }

    // Teklif bildirimleri için handler
    onBidNotification(handler: BidNotificationHandler) {
        this.bidNotificationHandlers.add(handler);
        return () => this.bidNotificationHandlers.delete(handler);
    }

    onJobStatusUpdate(handler: NotificationHandler) {
        this.jobStatusHandlers.add(handler);
        return () => this.jobStatusHandlers.delete(handler);
    }

    onNewReview(handler: NotificationHandler) {
        this.reviewHandlers.add(handler);
        return () => this.reviewHandlers.delete(handler);
    }

    getConnectionStatus() {
        return this.isConnected;
    }
}

export const socketService = new SocketService();
export default socketService;
