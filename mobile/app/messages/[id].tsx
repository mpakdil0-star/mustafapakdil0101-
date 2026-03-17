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
    Modal,
    StatusBar,
    Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchUnreadCount, markTypeAsRead, markRelatedNotificationsAsRead } from '../../store/slices/notificationSlice';
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
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const colors = useAppColors();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingTimeRef = useRef<number>(0);
    const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);

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
            const messageTypes = ['new_message', 'MESSAGE_RECEIVED'];
            dispatch(markTypeAsRead({ type: messageTypes, relatedId: conversationId }));

            // Wait for API calls to finish before fetching final count
            await Promise.all([
                dispatch(markRelatedNotificationsAsRead({ type: 'new_message', relatedId: conversationId })),
                dispatch(markRelatedNotificationsAsRead({ type: 'MESSAGE_RECEIVED', relatedId: conversationId }))
            ]);

            await dispatch(fetchUnreadCount());
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
        const unsubMessage = socketService.onMessage(async (data) => {
            if (data.message.conversationId === conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    if (data.message.senderId === user?.id) {
                        const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === data.message.content);
                        if (tempIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[tempIndex] = data.message;
                            return newMessages;
                        }
                    }
                    return [...prev, data.message];
                });

                // Aktif sohbet olduğu için okundu olarak işaretle
                socketService.markAsRead(conversationId);
                const messageTypes = ['new_message', 'MESSAGE_RECEIVED'];
                dispatch(markTypeAsRead({ type: messageTypes, relatedId: conversationId }));
                
                // Bekleyip badge'i temizle
                await Promise.all([
                    dispatch(markRelatedNotificationsAsRead({ type: 'new_message', relatedId: conversationId })),
                    dispatch(markRelatedNotificationsAsRead({ type: 'MESSAGE_RECEIVED', relatedId: conversationId }))
                ]);
                dispatch(fetchUnreadCount());
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

        // Okundu bilgisi dinle - tüm mesajları okundu olarak güncelle
        const unsubRead = socketService.onMessagesRead((data) => {
            if (data.conversationId === conversationId) {
                setMessages(prev => prev.map(m =>
                    m.senderId === user?.id ? { ...m, isRead: true } : m
                ));
            }
        });

        return () => {
            socketService.leaveConversation(conversationId);
            unsubMessage();
            unsubTyping();
            unsubStopTyping();
            unsubRead();
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
            }, 150);
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

    const handleReport = () => {
        setIsActionMenuVisible(false);
        router.push({
            pathname: '/profile/report',
            params: {
                userId: otherUser?.id,
                userName: otherUser?.fullName
            }
        });
    };

    const handleBlock = () => {
        setIsActionMenuVisible(false);
        Alert.alert(
            'Kullanıcıyı Engelle',
            'Bu kullanıcıyı engellediğinizde birbirinizin ilanlarını ve mesajlarını görmezsiniz. Devam etmek istiyor musunuz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Engelle',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await api.post('/blocks/toggle', { blockedId: otherUser?.id });
                            if (response.data.success) {
                                Alert.alert('Başarılı', 'Kullanıcı engellendi.', [
                                    { text: 'Tamam', onPress: () => router.back() }
                                ]);
                            }
                        } catch (err) {
                            Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
                        }
                    }
                }
            ]
        );
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

    // WhatsApp tarzı okundu tiki bileşeni
    const ReadReceipt = ({ message, isMyMessage }: { message: Message, isMyMessage: boolean }) => {
        if (!isMyMessage) return null;

        const isTempMessage = message.id.startsWith('temp-');
        const isRead = message.isRead;

        if (isTempMessage) {
            // Gönderiliyor: tek gri tik
            return (
                <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
            );
        } else if (isRead) {
            // Okundu: çift mavi tik
            return (
                <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                    <Ionicons name="checkmark-done" size={14} color="#FFF" />
                </View>
            );
        } else {
            // Gönderildi / iletildi: çift soluk tik
            return (
                <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                    <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.4)" />
                </View>
            );
        }
    };

    const renderMessage = ({ item, index }: { item: Message, index: number }) => {
        const isMyMessage = item.senderId === user?.id;
        const nextMessage = messages[index + 1];
        const prevMessage = messages[index - 1];
        
        const isLastInGroup = !nextMessage || nextMessage.senderId !== item.senderId;
        const isFirstInGroup = !prevMessage || prevMessage.senderId !== item.senderId;

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
                { marginBottom: isLastInGroup ? 12 : 3 }
            ]}>
                {!isMyMessage && (
                    <View style={styles.avatarSpace}>
                        {isLastInGroup && (
                            <View style={[styles.avatarMini, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.avatarMiniText, { color: colors.primary }]}>
                                    {otherUser?.fullName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={[
                    styles.bubbleWrapper,
                    isMyMessage ? styles.myBubbleWrapper : styles.otherBubbleWrapper
                ]}>
                    <LinearGradient
                        colors={isMyMessage ? [colors.primary, colors.primaryDark || colors.primary] : ['#FFFFFF', '#F8FAFC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.messageBubble,
                            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                            !isFirstInGroup && (isMyMessage ? { borderTopRightRadius: 6 } : { borderTopLeftRadius: 6 }),
                            !isLastInGroup && (isMyMessage ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 })
                        ]}
                    >
                        <Text style={[
                            styles.messageText,
                            isMyMessage ? styles.myMessageText : styles.otherMessageText
                        ]}>
                            {item.content}
                        </Text>
                        
                        <View style={styles.messageFooter}>
                            <Text style={[
                                styles.messageTime,
                                isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                            ]}>
                                {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                            <ReadReceipt message={item} isMyMessage={isMyMessage} />
                        </View>
                    </LinearGradient>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yüklenüyor...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <PremiumHeader
                title={otherUser?.fullName || 'Mesajlaşma'}
                subtitle={isTyping ? 'yazıyor...' : (otherUser?.userType === 'ELECTRICIAN' ? 'Profesyonel' : 'Müşteri')}
                showBackButton
                variant="transparent"
                rightElement={
                    otherUser && (
                        <TouchableOpacity
                            onPress={() => setIsActionMenuVisible(true)}
                            style={styles.headerActionBtn}
                        >
                            <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )
                }
            />

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Security Banner Header */}
                <View style={[styles.securityBanner, { backgroundColor: '#F0F9FF', borderBottomColor: '#E0F2FE' }]}>
                    <View style={styles.securityIconBox}>
                        <Ionicons name="shield-checkmark" size={14} color="#0369A1" />
                    </View>
                    <Text style={styles.securityBannerText}>
                        Güvenliğiniz için platform dışından ödeme yapmayın.
                    </Text>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.messagesList, { paddingBottom: 20 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LinearGradient
                                colors={['#F8FAFC', '#EEF2FF']}
                                style={styles.emptyIconCircle}
                            >
                                <Ionicons name="chatbubbles-outline" size={36} color={colors.primary} />
                            </LinearGradient>
                            <Text style={[styles.emptyText, { color: colors.text }]}>Mesajlaşmaya Başlayın</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Selam vererek ilk adımı atabilirsiniz.</Text>
                        </View>
                    }
                />

                {/* Input Area */}
                <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 10 }]}>
                    <View style={[styles.inputContainer, { backgroundColor: '#FFF' }]}>
                        {/* Attach Icon Placeholder */}
                        <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
                            <Ionicons name="add" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.input}
                            value={newMessage}
                            onChangeText={handleTyping}
                            placeholder="Mesajınızı yazın..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            maxLength={1000}
                        />

                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                { backgroundColor: colors.primary },
                                (!newMessage.trim() || sending) && { backgroundColor: '#E2E8F0' }
                            ]}
                            onPress={handleSend}
                            disabled={!newMessage.trim() || sending}
                            activeOpacity={0.8}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="send" size={18} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                    {isTyping && (
                        <Text style={styles.isTypingLabel}>{otherUser?.fullName} yazıyor...</Text>
                    )}
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

            {/* Modern Bottom Sheet styled Action Menu */}
            <Modal
                visible={isActionMenuVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsActionMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setIsActionMenuVisible(false)}
                >
                    <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.sheetIndicator} />
                        <Text style={[styles.sheetTitle, { color: colors.text }]}>İşlemler</Text>
                        
                        <TouchableOpacity style={styles.sheetItem} onPress={handleReport}>
                            <View style={[styles.sheetIconBox, { backgroundColor: '#F1F5F9' }]}>
                                <Ionicons name="flag-outline" size={20} color={colors.text} />
                            </View>
                            <Text style={[styles.sheetItemText, { color: colors.text }]}>Kullanıcıyı Şikayet Et</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.sheetItem} onPress={handleBlock}>
                            <View style={[styles.sheetIconBox, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="ban-outline" size={20} color="#EF4444" />
                            </View>
                            <Text style={[styles.sheetItemText, { color: '#EF4444' }]}>Kullanıcıyı Engelle</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.sheetCancelBtn} 
                            onPress={() => setIsActionMenuVisible(false)}
                        >
                            <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Vazgeç</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    flex1: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: fonts.medium,
    },

    // ── Security Header ──
    securityBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 10,
        borderBottomWidth: 1,
    },
    securityIconBox: {
        backgroundColor: '#BAE6FD',
        padding: 4,
        borderRadius: 6,
    },
    securityBannerText: {
        fontFamily: fonts.semiBold,
        fontSize: 11,
        color: '#0369A1',
        flex: 1,
    },

    // ── Message List ──
    messagesList: {
        padding: 14,
        flexGrow: 1,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myMessageContainer: {
        justifyContent: 'flex-end',
    },
    otherMessageContainer: {
        justifyContent: 'flex-start',
    },
    avatarSpace: {
        width: 34,
        marginRight: 8,
    },
    avatarMini: {
        width: 34,
        height: 34,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarMiniText: {
        fontFamily: fonts.black,
        fontSize: 14,
    },
    bubbleWrapper: {
        maxWidth: '82%',
    },
    myBubbleWrapper: {
        alignItems: 'flex-end',
    },
    otherBubbleWrapper: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    myMessageBubble: {
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    messageText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        lineHeight: 22,
    },
    myMessageText: {
        color: '#FFF',
    },
    otherMessageText: {
        color: '#1E293B',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    messageTime: {
        fontFamily: fonts.medium,
        fontSize: 10,
    },
    myMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    otherMessageTime: {
        color: '#94A3B8',
    },

    // ── Input Section ──
    bottomSection: {
        paddingHorizontal: 14,
        paddingTop: 8,
        backgroundColor: 'transparent',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 6,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    attachButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 15,
        color: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 8,
        maxHeight: 120,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    isTypingLabel: {
        fontSize: 11,
        fontFamily: fonts.medium,
        fontStyle: 'italic',
        color: '#64748B',
        marginLeft: 20,
        marginTop: 6,
    },

    // ── Empty State ──
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontFamily: fonts.black,
        fontSize: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontFamily: fonts.medium,
        fontSize: 14,
        opacity: 0.6,
    },

    // ── Header Actions ──
    headerActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Action Sheet Modal ──
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingTop: 12,
    },
    sheetIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 18,
        fontFamily: fonts.black,
        marginBottom: 20,
        textAlign: 'center',
    },
    sheetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 16,
    },
    sheetIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetItemText: {
        fontSize: 15,
        fontFamily: fonts.semiBold,
    },
    sheetCancelBtn: {
        marginTop: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    sheetCancelText: {
        fontSize: 15,
        fontFamily: fonts.bold,
    },
});
