import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../hooks/redux';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { messageService } from '../../services/messageService';
import socketService from '../../services/socketService';
import api from '../../services/api';

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: string;
    createdAt: string;
    isRead?: boolean;
    sender?: {
        id: string;
        fullName: string;
        profileImageUrl: string | null;
    };
}

interface OtherUser {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
    userType?: string;
}

export default function ChatScreen() {
    const { id: conversationId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Konuşma ve mesajları yükle
    const loadConversation = useCallback(async () => {
        if (!conversationId) return;

        try {
            setLoading(true);

            // Konuşma detayını al
            const convResponse = await api.get(`/conversations/${conversationId}`);
            if (convResponse.data.success) {
                const conv = convResponse.data.data.conversation;
                setOtherUser(conv.otherUser);
            }

            // Mesajları al
            const msgResponse = await api.get(`/conversations/${conversationId}/messages`);
            if (msgResponse.data.success) {
                setMessages(msgResponse.data.data.messages || []);
            }

            // Mesajları okundu olarak işaretle
            socketService.markAsRead(conversationId);
        } catch (error: any) {
            console.error('Error loading conversation:', error);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    // Socket bağlantısı ve event dinleyicileri
    useEffect(() => {
        if (!conversationId) return;

        // Socket'e bağlan ve konuşmaya katıl
        const connectAndJoin = async () => {
            const connected = await socketService.connect();
            if (connected) {
                socketService.joinConversation(conversationId);
            }
        };
        connectAndJoin();

        // Yeni mesaj dinle
        const unsubMessage = socketService.onMessage((data) => {
            if (data.message.conversationId === conversationId) {
                setMessages(prev => [...prev, data.message]);
                // Mesajı okundu olarak işaretle
                socketService.markAsRead(conversationId);
            }
        });

        // Typing dinle
        const unsubTyping = socketService.onTyping((data) => {
            if (data.conversationId === conversationId && data.userId !== user?.id) {
                setIsTyping(true);
            }
        });

        // Stop typing dinle
        const unsubStopTyping = socketService.onStopTyping((data) => {
            if (data.conversationId === conversationId) {
                setIsTyping(false);
            }
        });

        return () => {
            socketService.leaveConversation(conversationId);
            unsubMessage();
            unsubTyping();
            unsubStopTyping();
        };
    }, [conversationId, user?.id]);

    // Konuşmayı yükle
    useEffect(() => {
        loadConversation();
    }, [loadConversation]);

    // Mesaj listesi değiştiğinde en alta scroll
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    // Mesaj gönder
    const handleSend = async () => {
        if (!newMessage.trim() || !conversationId || sending) return;

        const messageContent = newMessage.trim();
        const tempId = `temp-${Date.now()}`;
        setNewMessage('');
        setSending(true);

        try {
            // Socket ile gönder
            if (socketService.getConnectionStatus()) {
                socketService.sendMessage(conversationId, messageContent);
                // Optimistic update - mesajı hemen ekle
                const tempMessage: Message = {
                    id: tempId,
                    conversationId,
                    senderId: user?.id || '',
                    content: messageContent,
                    messageType: 'TEXT',
                    createdAt: new Date().toISOString(),
                    sender: {
                        id: user?.id || '',
                        fullName: user?.fullName || '',
                        profileImageUrl: user?.profileImageUrl || null,
                    },
                };
                setMessages(prev => [...prev, tempMessage]);
            } else {
                // HTTP fallback
                const response = await api.post(`/conversations/${conversationId}/messages`, {
                    content: messageContent,
                });
                if (response.data.success) {
                    setMessages(prev => [...prev, response.data.data.message]);
                } else {
                    throw new Error('Mesaj gönderilemedi');
                }
            }

            socketService.sendStopTyping(conversationId);
        } catch (error: any) {
            console.error('Error sending message:', error);
            // Başarısız mesajı listeden kaldır
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            // Kullanıcıya hata göster
            Alert.alert(
                'Mesaj Gönderilemedi',
                'Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
                [{ text: 'Tamam' }]
            );
        } finally {
            setSending(false);
        }
    };

    // Yazıyor bilgisi gönder
    const handleTyping = (text: string) => {
        setNewMessage(text);

        if (!conversationId) return;

        // Typing bildirimi gönder
        if (text.length > 0) {
            socketService.sendTyping(conversationId);

            // Önceki timeout'u temizle
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // 2 saniye sonra yazmayı bıraktı bilgisi gönder
            typingTimeoutRef.current = setTimeout(() => {
                socketService.sendStopTyping(conversationId);
            }, 2000);
        } else {
            socketService.sendStopTyping(conversationId);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMyMessage = item.senderId === user?.id;

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
            ]}>
                <View style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isMyMessage ? styles.myMessageText : styles.otherMessageText
                    ]}>
                        {item.content}
                    </Text>
                    <Text style={[
                        styles.messageTime,
                        isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                    ]}>
                        {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: otherUser?.fullName || 'Mesaj',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>Henüz mesaj yok</Text>
                            <Text style={styles.emptySubtext}>İlk mesajı siz gönderin!</Text>
                        </View>
                    }
                />

                {isTyping && (
                    <View style={styles.typingContainer}>
                        <Text style={styles.typingText}>{otherUser?.fullName} yazıyor...</Text>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newMessage}
                        onChangeText={handleTyping}
                        placeholder="Mesajınızı yazın..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!newMessage.trim() || sending) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Ionicons name="send" size={20} color={colors.white} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
    },
    headerButton: {
        marginRight: spacing.md,
    },
    messagesList: {
        padding: spacing.md,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: spacing.sm,
    },
    myMessageContainer: {
        alignItems: 'flex-end',
    },
    otherMessageContainer: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: spacing.md,
        borderRadius: spacing.radius.lg,
    },
    myMessageBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: colors.white,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        fontFamily: fonts.regular,
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: colors.white,
    },
    otherMessageText: {
        color: colors.text,
    },
    messageTime: {
        fontFamily: fonts.regular,
        fontSize: 11,
        marginTop: 4,
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    otherMessageTime: {
        color: colors.textSecondary,
    },
    typingContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    typingText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    input: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.text,
        backgroundColor: colors.backgroundLight,
        borderRadius: spacing.radius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 100,
        marginRight: spacing.sm,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.textLight,
        marginTop: spacing.xs,
    },
});
