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
import { supabase } from '../../services/supabase';
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
    const { id: conversationId, sellerName, sellerId } = useLocalSearchParams<{ id: string; sellerName?: string; sellerId?: string }>();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, guestRole } = useAppSelector((state: any) => state.auth);
    const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';
    const colors = useAppColors();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<OtherUser | null>(
        // Initialize otherUser from route params if provided (from product detail / marketplace)
        sellerName && sellerId ? { id: sellerId, fullName: sellerName, profileImageUrl: null } : null
    );
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
            const conversation = await messageService.getConversation(conversationId);
            if (conversation) setOtherUser(conversation.otherUser || null);

            // Mesajları al
            setMessages(await messageService.getMessages(conversationId));

            // Mesajları okundu olarak işaretle
            await messageService.markAsRead(conversationId);
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
            
            // Fallback: reconstruct otherUser from route params or mock conversation ID
            // Priority: route params (sellerName/sellerId) > conversation ID parsing
            const hasRouteParams = sellerName && sellerId;
            
            if (hasRouteParams || (conversationId && conversationId.includes('mock'))) {
                let name = sellerName || 'Mustafa Yılmaz (Usta)';
                let odtherUserId = sellerId || 'mock-electrician-1';
                let type = name.includes('Usta') || name.includes('usta') ? 'ELECTRICIAN' : 'CITIZEN';

                // Only parse from conversation ID if no route params
                if (!hasRouteParams && conversationId.includes('mock')) {
                    const parts = conversationId.split('-');
                    for (const part of parts) {
                        if (part === 'electrician' || part === 'citizen' || part === 'user') {
                            const idx = parts.indexOf(part);
                            if (idx !== -1 && parts[idx+1]) {
                                odtherUserId = `mock-${part}-${parts[idx+1]}`;
                                if (part === 'electrician') {
                                    name = 'Mustafa Yılmaz (Usta)';
                                    type = 'ELECTRICIAN';
                                } else {
                                    name = 'Ahmet Kaya (Vatandaş)';
                                    type = 'CITIZEN';
                                }
                                break;
                            }
                        }
                    }
                }
                
                setOtherUser({
                    id: odtherUserId,
                    fullName: name,
                    profileImageUrl: null,
                    userType: type
                });

                // Set a welcoming mock message
                setMessages([
                    {
                        id: 'mock-msg-welcome',
                        conversationId,
                        senderId: odtherUserId,
                        content: `Merhaba! Ben ${name}. Size nasıl yardımcı olabilirim?`,
                        messageType: 'TEXT',
                        createdAt: new Date(Date.now() - 60000).toISOString(),
                        sender: {
                            id: odtherUserId,
                            fullName: name,
                            profileImageUrl: null
                        }
                    }
                ]);
            }
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    // Supabase Realtime mesaj ve okundu olayları
    useEffect(() => {
        if (!conversationId) return;
        const unsubscribe = messageService.subscribeToConversation(conversationId, async (message, event) => {
            setMessages(prev => {
                if (event === 'DELETE') return prev.filter(item => item.id !== message.id);
                const existing = prev.findIndex(item => item.id === message.id);
                if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = message;
                    return next;
                }
                return [...prev.filter(item => !(item.id.startsWith('temp-') && item.content === message.content)), message];
            });
            if (message.senderId !== user?.id) {
                await messageService.markAsRead(conversationId);
                dispatch(markTypeAsRead({ type: ['new_message', 'MESSAGE_RECEIVED'], relatedId: conversationId }));
                dispatch(fetchUnreadCount());
            }
        });

        return () => {
            unsubscribe();
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
            // Local mock conversation fallback
            if (conversationId.includes('mock')) {
                // Optimistic user message addition
                const userMsg: Message = {
                    id: tempId,
                    conversationId,
                    senderId: user?.id || 'mock-current-user',
                    content: messageContent,
                    messageType: 'TEXT',
                    createdAt: new Date().toISOString(),
                    sender: {
                        id: user?.id || 'mock-current-user',
                        fullName: user?.fullName || 'Siz',
                        profileImageUrl: user?.profileImageUrl || null,
                    },
                };
                setMessages(prev => [...prev, userMsg]);
                
                // Show simulated 'typing...' state
                setTimeout(() => {
                    setIsTyping(true);
                }, 500);

                // Simulate quick usta response after 1.8 seconds!
                setTimeout(() => {
                    setIsTyping(false);
                    const ustaResponses = [
                        "Harika, detayları konuşalım. İlanınızdaki elektrik işi için ne zaman müsaitsiniz?",
                        "Tabii ki yardımcı olurum. Malzemeler sizde hazır mı yoksa ben mi getireyim?",
                        "Mesajınızı aldım, şu an başka bir iş üzerindeyim. En kısa sürede size geri dönüş yapacağım.",
                        "Anlaştık, bu iş için size en uygun fiyatı sunacağımdan emin olabilirsiniz.",
                        "Merhabalar, işin büyüklüğü nedir? Fotoğraf gönderebilir misiniz?"
                    ];
                    const randomResponse = ustaResponses[Math.floor(Math.random() * ustaResponses.length)];
                    
                    const systemMsg: Message = {
                        id: `mock-reply-${Date.now()}`,
                        conversationId,
                        senderId: otherUser?.id || 'mock-electrician-1',
                        content: randomResponse,
                        messageType: 'TEXT',
                        createdAt: new Date().toISOString(),
                        sender: {
                            id: otherUser?.id || 'mock-electrician-1',
                            fullName: otherUser?.fullName || 'Mustafa Yılmaz (Usta)',
                            profileImageUrl: null
                        }
                    };
                    setMessages(prev => [...prev, systemMsg]);
                }, 2000);
                
                setSending(false);
                return;
            }

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
            const sentMessage = await messageService.sendMessageToConversation(conversationId, messageContent);
            setMessages(prev => [...prev.filter(item => item.id !== tempId && item.id !== sentMessage.id), sentMessage]);
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
                            const { data: existing } = await supabase.from('blocks').select('id')
                                .eq('blocked_id', otherUser?.id || '').maybeSingle();
                            const result = existing
                                ? await supabase.from('blocks').delete().eq('id', existing.id)
                                : await supabase.from('blocks').insert({ blocker_id: user?.id, blocked_id: otherUser?.id });
                            if (!result.error) {
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
                                    {otherUser?.fullName ? otherUser.fullName.charAt(0).toUpperCase() : '?'}
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
                        colors={isMyMessage ? [colors.primary, colors.primaryDark || colors.primary] : (isElectrician ? ['#E2E8F0', '#E2E8F0'] : ['#FFFFFF', '#F8FAFC'])}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.messageBubble,
                            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                            !isMyMessage && isElectrician && { borderColor: '#E2E8F0', borderWidth: 0 },
                            !isFirstInGroup && (isMyMessage ? { borderTopRightRadius: 6 } : { borderTopLeftRadius: 6 }),
                            !isLastInGroup && (isMyMessage ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 })
                        ]}
                    >
                        <Text style={[
                            styles.messageText,
                            isMyMessage ? styles.myMessageText : (isElectrician ? { color: '#0F172A' } : styles.otherMessageText)
                        ]}>
                            {item.content}
                        </Text>
                        
                        <View style={styles.messageFooter}>
                            <Text style={[
                                styles.messageTime,
                                isMyMessage ? styles.myMessageTime : (isElectrician ? { color: '#64748B' } : styles.otherMessageTime)
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
                subtitle={isTyping ? 'yazıyor...' : (
                    otherUser?.userType === 'ADMIN' ? 'Sistem' : 
                    otherUser?.userType === 'ELECTRICIAN' ? 'Profesyonel' : 'Müşteri'
                )}
                showBackButton
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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >


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
        padding: 10,
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
        width: 30,
        marginRight: 6,
    },
    avatarMini: {
        width: 30,
        height: 30,
        borderRadius: 10,
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
        maxWidth: '85%',
    },
    myBubbleWrapper: {
        alignItems: 'flex-end',
    },
    otherBubbleWrapper: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
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
        fontSize: 14,
        lineHeight: 20,
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
        paddingHorizontal: 10,
        paddingTop: 6,
        backgroundColor: 'transparent',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        paddingHorizontal: 4,
        paddingVertical: 4,
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
        fontSize: 14,
        color: '#1E293B',
        paddingHorizontal: 8,
        paddingVertical: 6,
        maxHeight: 120,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
