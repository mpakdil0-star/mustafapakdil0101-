import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

export default function TicketDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colors = useAppColors();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const fetchTicket = async () => {
        try {
            const response = await api.get(`/support/${id}`);
            if (response.data.success) {
                setTicket(response.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTicket();
        }, [id])
    );

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setSending(true);
        try {
            const response = await api.post(`/support/${id}/message`, { text: newMessage });
            if (response.data.success) {
                setNewMessage('');
                fetchTicket(); // Reload to show new message
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!ticket) {
        return (
            <View style={styles.center}>
                <Text>Destek talebi bulunamadı.</Text>
            </View>
        );
    }

    const messages = ticket.messages || [];

    return (
        <View style={styles.container}>
            <PremiumHeader title="Talep Detayı" showBackButton />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.content}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {/* Ticket Info Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.header}>
                            <Text style={styles.subject}>{ticket.subject}</Text>
                            <View style={[styles.badge, { backgroundColor: ticket.status === 'resolved' ? '#10B981' : '#3B82F6' }]}>
                                <Text style={styles.badgeText}>
                                    {ticket.status === 'open' ? 'Açık' :
                                        ticket.status === 'in_progress' ? 'İnceleniyor' :
                                            ticket.status === 'resolved' ? 'Çözüldü' : 'Kapandı'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.desc}>{ticket.description}</Text>
                        <Text style={styles.date}>{new Date(ticket.createdAt).toLocaleString('tr-TR')}</Text>
                    </View>

                    <View style={styles.divider}>
                        <Text style={styles.dividerText}>Mesajlar</Text>
                    </View>

                    {/* Messages List */}
                    {messages.length === 0 ? (
                        <Text style={styles.emptyText}>Henüz bir cevap yok.</Text>
                    ) : (
                        messages.map((msg: any) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageBubble,
                                    msg.isAdmin ? styles.adminBubble : styles.userBubble,
                                    msg.isAdmin && { backgroundColor: '#F3F4F6' },
                                    !msg.isAdmin && { backgroundColor: colors.primary + '15' }
                                ]}
                            >
                                <Text style={styles.senderName}>{msg.isAdmin ? 'Destek Ekibi' : 'Siz'}</Text>
                                <Text style={styles.messageText}>{msg.text}</Text>
                                <Text style={styles.messageTime}>{new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Input Area */}
                {ticket.status !== 'closed' && (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Bir mesaj yazın..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSendMessage}
                            disabled={sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="send" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: spacing.md,
        paddingBottom: 20,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    subject: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        flex: 1,
        marginRight: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#fff',
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    desc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: staticColors.textSecondary,
        marginBottom: 12,
    },
    date: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textLight,
        textAlign: 'right',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dividerText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.textLight,
        marginLeft: 8,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        maxWidth: '85%',
    },
    adminBubble: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    senderName: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: staticColors.textSecondary,
        marginBottom: 2,
    },
    messageText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.text,
        lineHeight: 20,
    },
    messageTime: {
        fontFamily: fonts.regular,
        fontSize: 10,
        color: staticColors.textLight,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: staticColors.textLight,
        fontFamily: fonts.medium,
        marginTop: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 40,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
