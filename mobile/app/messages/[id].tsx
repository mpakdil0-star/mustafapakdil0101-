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
    ImageBackground,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../hooks/redux';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { messageService } from '../../services/messageService';
import socketService from '../../services/socketService';
import api from '../../services/api';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { LinearGradient } from 'expo-linear-gradient';

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
    const colors = useAppColors();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingTimeRef = useRef<number>(0);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
    }>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

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
                setMessages(prev => {
                    // Mesaj zaten listede varsa (ID ile kontrol) ekleme
                    if (prev.some(m => m.id === data.message.id)) return prev;

                    // Eğer benim gönderdiğim mesajsa, geçici (temp) mesajı bununla değiştir (optimistic update temizliği)
                    if (data.message.senderId === user?.id) {
                        const tempIndex = prev.findIndex(m =>
                            m.id.startsWith('temp-') &&
                            m.content === data.message.content
                        );

                        if (tempIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[tempIndex] = data.message;
                            return newMessages;
                        }
                    }

                    // Mesaj zaten listede yoksa ekle
                    return [...prev, data.message];
                });

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
            showAlert(
                'Mesaj Gönderilemedi',
                'Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
                'error'
            );
        } finally {
            setSending(false);
        }
    };

    // Yazıyor bilgisi gönder
    const handleTyping = (text: string) => {
        setNewMessage(text);

        if (!conversationId) return;

        // Typing bildirimi gönder (her 3 saniyede bir göndererek trafiği ve re-render'ı azalt)
        const now = Date.now();
        if (text.length > 0) {
            if (now - lastTypingTimeRef.current > 3000) {
                socketService.sendTyping(conversationId);
                lastTypingTimeRef.current = now;
            }

            // Önceki timeout'u temizle
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // 2 saniye sonra yazmayı bıraktı bilgisi gönder
            typingTimeoutRef.current = setTimeout(() => {
                socketService.sendStopTyping(conversationId);
                lastTypingTimeRef.current = 0;
            }, 2000);
        } else {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            socketService.sendStopTyping(conversationId);
            lastTypingTimeRef.current = 0;
        }
    };

    const renderMessage = ({ item, index }: { item: Message, index: number }) => {
        const isMyMessage = item.senderId === user?.id;
        const showAvatar = !isMyMessage && (index === 0 || messages[index - 1].senderId !== item.senderId);

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
            ]}>
                {!isMyMessage && (
                    <View style={styles.otherUserAvatarPlaceholder}>
                        {showAvatar && (
                            <View style={[styles.avatarMiniContainer, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.avatarMiniText, { color: colors.primary }]}>
                                    {otherUser?.fullName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={[
                    styles.messageBubble,
                    isMyMessage ? [styles.myMessageBubble, { backgroundColor: colors.primary }] : styles.otherMessageBubble
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
        <View style={styles.mainContainer}>
            <Stack.Screen options={{ headerShown: false }} />

            <PremiumHeader
                title={otherUser?.fullName || 'Mesajlaşma'}
                subtitle={isTyping ? 'yazıyor...' : (otherUser?.userType === 'ELECTRICIAN' ? 'Profesyonel' : 'Müşteri')}
                showBackButton
                backgroundImage={require('../../assets/images/header_bg.png')}
            />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[styles.securityBanner, { backgroundColor: staticColors.secondary + '10', borderBottomColor: staticColors.secondary + '20' }]}>
                    <Ionicons name="shield-checkmark" size={16} color={staticColors.secondary} />
                    <Text style={[styles.securityBannerText, { color: staticColors.secondary }]}>
                        Güvenliğiniz için ödeme ve iletişim bilgilerinizi platform dışından paylaşmayın.
                    </Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={styles.emptyText}>Mesajlaşmaya Başlayın</Text>
                            <Text style={styles.emptySubtext}>Selam vererek ilk adımı atabilirsiniz.</Text>
                        </View>
                    }
                />

                <View style={styles.bottomSection}>
                    {isTyping && (
                        <View style={styles.typingContainer}>
                            <Text style={styles.typingText}>{otherUser?.fullName} yazıyor...</Text>
                        </View>
                    )}

                    <View style={[styles.inputCard, { shadowColor: colors.primary }]}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={newMessage}
                                onChangeText={handleTyping}
                                placeholder="Mesajınızı buraya yazın..."
                                placeholderTextColor={colors.textLight}
                                multiline
                                maxLength={1000}
                                autoCorrect={false}
                                autoComplete="off"
                                autoCapitalize="sentences"
                                spellCheck={false}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    { backgroundColor: colors.primary, shadowColor: colors.primary },
                                    (!newMessage.trim() || sending) && [styles.sendButtonDisabled, { backgroundColor: staticColors.textLight }]
                                ]}
                                onPress={handleSend}
                                disabled={!newMessage.trim() || sending}
                                activeOpacity={0.8}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color={staticColors.white} />
                                ) : (
                                    <Ionicons name="send" size={18} color={staticColors.white} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
    },
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: spacing.md,
        gap: 8,
        borderBottomWidth: 1,
    },
    securityBannerText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    messagesList: {
        padding: spacing.md,
        paddingBottom: 20,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    otherUserAvatarPlaceholder: {
        width: 32,
        marginRight: 8,
    },
    avatarMiniContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: staticColors.white,
    },
    avatarMiniText: {
        fontFamily: fonts.extraBold,
        fontSize: 12,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    myMessageBubble: {
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: staticColors.white,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    messageText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        lineHeight: 22,
    },
    myMessageText: {
        color: staticColors.white,
    },
    otherMessageText: {
        color: staticColors.text,
    },
    messageTime: {
        fontFamily: fonts.medium,
        fontSize: 10,
        marginTop: 4,
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.65)',
        textAlign: 'right',
    },
    otherMessageTime: {
        color: staticColors.textLight,
        textAlign: 'left',
    },
    bottomSection: {
        backgroundColor: 'transparent',
        paddingHorizontal: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    typingContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    typingText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        fontStyle: 'italic',
    },
    inputCard: {
        backgroundColor: staticColors.white,
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.text,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonDisabled: {
        shadowOpacity: 0,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontFamily: fonts.extraBold,
        fontSize: 18,
        color: staticColors.text,
    },
    emptySubtext: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        marginTop: 6,
    },
});
