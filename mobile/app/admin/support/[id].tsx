import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

export default function AdminTicketDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const colors = useAppColors();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Status Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [replyNote, setReplyNote] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);

    const fetchTicket = async () => {
        try {
            // Re-using the public endpoint, or we should use admin-specific if needed. 
            // Controller's getTicketDetail allows admin to see any ticket.
            const response = await api.get(`/support/${id}`);
            if (response.data.success) {
                setTicket(response.data.data);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Hata', 'Detaylar yüklenemedi');
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
            // Admin sending message via the same endpoint
            // Our backend addTicketMessage checks if user is ADMIN to allow posting to any ticket
            const response = await api.post(`/support/${id}/message`, { text: newMessage });
            if (response.data.success) {
                setNewMessage('');
                fetchTicket();
            }
        } catch (error) {
            Alert.alert('Hata', 'Mesaj gönderilemedi');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            const response = await api.put(`/support/${id}/status`, {
                status,
                replyMessage: replyNote.trim() || undefined
            });
            if (response.data.success) {
                Alert.alert('Başarılı', 'Durum güncellendi');
                setModalVisible(false);
                setReplyNote('');
                fetchTicket();
            }
        } catch (error) {
            Alert.alert('Hata', 'Durum güncellenemedi');
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
                <Text>Talep bulunamadı.</Text>
            </View>
        );
    }

    const messages = ticket.messages || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return '#3B82F6';
            case 'in_progress': return '#F59E0B';
            case 'resolved': return '#10B981';
            case 'closed': return '#64748B';
            default: return '#64748B';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'open': return 'Açık';
            case 'in_progress': return 'İnceleniyor';
            case 'resolved': return 'Çözüldü';
            case 'closed': return 'Kapandı';
            default: return status;
        }
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Talep Yönetimi" showBackButton />

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
                    {/* User Info & Ticket Status */}
                    <View style={styles.infoCard}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.userName}>{ticket.user?.fullName || 'Kullanıcı'}</Text>
                                <Text style={styles.userContact}>{ticket.user?.phone}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={styles.badgeText}>{getStatusText(ticket.status)}</Text>
                                <Ionicons name="chevron-down" size={12} color="#fff" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.subject}>{ticket.subject}</Text>
                        <Text style={styles.desc}>{ticket.description}</Text>
                        <Text style={styles.date}>{new Date(ticket.createdAt).toLocaleString('tr-TR')}</Text>
                    </View>

                    <View style={styles.sectionTitle}>
                        <Text style={styles.titleText}>Mesaj Geçmişi</Text>
                    </View>

                    {/* Messages List */}
                    {messages.length === 0 ? (
                        <Text style={styles.emptyText}>Henüz bir mesajlaşma yok.</Text>
                    ) : (
                        messages.map((msg: any) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageBubble,
                                    msg.isAdmin ? styles.adminBubble : styles.userBubble, // If admin, it's ME (right)
                                    msg.isAdmin && { backgroundColor: colors.primary },
                                    !msg.isAdmin && { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' }
                                ]}
                            >
                                <Text style={[styles.senderName, msg.isAdmin ? { color: '#fff' } : { color: staticColors.textSecondary }]}>
                                    {msg.isAdmin ? 'Siz' : (ticket.user?.fullName?.split(' ')[0] || 'Kullanıcı')}
                                </Text>
                                <Text style={[styles.messageText, msg.isAdmin ? { color: '#fff' } : { color: staticColors.text }]}>
                                    {msg.text}
                                </Text>
                                <Text style={[styles.messageTime, msg.isAdmin ? { color: 'rgba(255,255,255,0.8)' } : { color: staticColors.textLight }]}>
                                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Cevap yazın..."
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
            </KeyboardAvoidingView>

            {/* Status Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Durumu Değiştir</Text>

                        <View style={styles.actionButtons}>
                            <Text style={styles.label}>Admin Notu (isteğe bağlı)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Kullanıcıya iletmek istediğiniz notu yazın..."
                                value={replyNote}
                                onChangeText={setReplyNote}
                                multiline
                            />
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleUpdateStatus('open')}>
                                <Text style={styles.actionBtnText}>Açık</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleUpdateStatus('in_progress')}>
                                <Text style={styles.actionBtnText}>İnceleniyor</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleUpdateStatus('resolved')}>
                                <Text style={styles.actionBtnText}>Çözüldü</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#64748B' }]} onPress={() => handleUpdateStatus('closed')}>
                                <Text style={styles.actionBtnText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
        marginBottom: 12,
    },
    userName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
    },
    userContact: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 12,
    },
    subject: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        marginBottom: 4,
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
    sectionTitle: {
        marginBottom: 12,
        marginLeft: 4,
    },
    titleText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.textLight,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        maxWidth: '85%',
    },
    adminBubble: { // Me (Admin) -> Right
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    userBubble: { // User -> Left
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
    },
    senderName: {
        fontFamily: fonts.bold,
        fontSize: 11,
        marginBottom: 2,
    },
    messageText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        lineHeight: 20,
    },
    messageTime: {
        fontFamily: fonts.regular,
        fontSize: 10,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center'
    },
    actionButtons: {
        gap: 12,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.text,
        marginBottom: 4,
    },
    actionBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    actionBtnText: {
        color: '#fff',
        fontFamily: fonts.bold,
        fontSize: 14
    },
    cancelBtn: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center'
    },
    cancelBtnText: {
        fontFamily: fonts.medium,
        color: staticColors.textSecondary
    }
});
