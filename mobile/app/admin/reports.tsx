import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput
} from 'react-native';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import api from '../../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Report {
    id: string;
    reporterId: string;
    reportedId: string;
    jobId?: string;
    reason: string;
    description: string;
    status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
    createdAt: string;
    reporter?: { fullName: string }; // Optional mock data support
    reported?: { fullName: string; userType: string };
}

const STATUS_CONFIG = {
    PENDING: { label: 'Bekliyor', color: '#F59E0B', icon: 'time' },
    UNDER_REVIEW: { label: 'İnceleniyor', color: '#3B82F6', icon: 'eye' },
    RESOLVED: { label: 'Çözüldü', color: '#10B981', icon: 'checkmark-circle' },
    DISMISSED: { label: 'Reddedildi', color: '#EF4444', icon: 'close-circle' }
};

const REASON_LABELS: Record<string, string> = {
    FRAUD: 'Dolandırıcılık',
    HARASSMENT: 'Taciz',
    NO_SHOW: 'Gelmedi',
    UNPROFESSIONAL: 'Profesyonellik Dışı',
    FAKE_PROFILE: 'Sahte Profil',
    SPAM: 'Spam',
    INAPPROPRIATE_CONTENT: 'Uygunsuz İçerik',
    OTHER: 'Diğer'
};

export default function AdminReportsScreen() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchReports = useCallback(async () => {
        try {
            console.log('📡 [REPORTS] Fetching all reports...');
            const response = await api.get('/reports/admin/all');

            if (response.data.success) {
                console.log(`✅ [REPORTS] Successfully fetched ${response.data.data?.length || 0} reports`);
                setReports(response.data.data);
            } else {
                console.warn('⚠️ [REPORTS] Fetch success but data invalid:', response.data);
                Alert.alert('Hata', response.data.message || 'Şikayetler yüklenirken bir sorun oluştu.');
            }
        } catch (error: any) {
            const statusCode = error.response?.status;
            const errorMsg = error.response?.data?.message || error.response?.data?.error?.message || error.message;

            console.error(`❌ [REPORTS] Failed to fetch reports:`, {
                status: statusCode,
                message: errorMsg,
                url: error.config?.url
            });

            Alert.alert(
                'Hata',
                `Şikayetler yüklenirken bir sorun oluştu.\n\nDurum: ${statusCode}\nHata: ${errorMsg}`
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, []);

    const handleUpdateStatus = async (status: string, banUser: boolean = false) => {
        if (!selectedReport) return;
        setProcessing(true);

        try {
            await api.patch(`/reports/admin/${selectedReport.id}`, {
                status,
                adminNotes: adminNote,
                banUser
            });

            Alert.alert('Başarılı', 'Şikayet durumu güncellendi.');
            setSelectedReport(null);
            setAdminNote('');
            fetchReports(); // Refresh list
        } catch (error: any) {
            Alert.alert('Hata', error.response?.data?.message || 'İşlem başarısız.');
        } finally {
            setProcessing(false);
        }
    };

    const renderItem = ({ item }: { item: Report }) => {
        const statusInfo = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
        const reasonLabel = REASON_LABELS[item.reason] || item.reason;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedReport(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                        <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                    <Text style={styles.dateText}>
                        {format(new Date(item.createdAt), 'd MMM HH:mm', { locale: tr })}
                    </Text>
                </View>

                <Text style={styles.reasonTitle}>{reasonLabel}</Text>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

                <View style={styles.userRow}>
                    <Ionicons name="person" size={14} color={colors.textLight} />
                    <Text style={styles.userInfo}>
                        Şikayet edilen: {item.reported?.fullName || item.reportedId.substring(0, 8) + '...'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Şikayet Yönetimi" showBackButton />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={reports}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchReports();
                    }}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textLight} />
                            <Text style={styles.emptyText}>Bekleyen şikayet yok</Text>
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <Modal
                visible={!!selectedReport}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedReport(null)}
            >
                {selectedReport && (
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Şikayet Detayı</Text>
                            <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Sebep:</Text>
                                <Text style={styles.detailValue}>{REASON_LABELS[selectedReport.reason] || selectedReport.reason}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Şikayet Eden:</Text>
                                <Text style={styles.detailValue}>{selectedReport.reporter?.fullName || selectedReport.reporterId.substring(0, 12) + '...'}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Şikayet Edilen:</Text>
                                <Text style={styles.detailValue}>{selectedReport.reported?.fullName || selectedReport.reportedId.substring(0, 12) + '...'}</Text>
                            </View>

                            <Text style={styles.detailLabel}>Açıklama:</Text>
                            <View style={styles.descriptionBox}>
                                <Text style={styles.descriptionText}>{selectedReport.description}</Text>
                            </View>

                            <Text style={styles.inputLabel}>Admin Notu (Opsiyonel):</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Not ekleyin..."
                                value={adminNote}
                                onChangeText={setAdminNote}
                                multiline
                            />

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                                    onPress={() => handleUpdateStatus('RESOLVED')}
                                    disabled={processing}
                                >
                                    <Text style={styles.btnText}>Çözüldü Olarak İşaretle</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                                    onPress={() => Alert.alert(
                                        'Kullanıcıyı Yasakla',
                                        'Bu kullanıcıyı yasaklamak istediğinize emin misiniz?',
                                        [
                                            { text: 'İptal', style: 'cancel' },
                                            { text: 'Evet, Yasakla', style: 'destructive', onPress: () => handleUpdateStatus('RESOLVED', true) }
                                        ]
                                    )}
                                    disabled={processing}
                                >
                                    <Text style={styles.btnText}>Çözüldü + Yasakla</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#6B7280', marginTop: 8 }]}
                                    onPress={() => handleUpdateStatus('DISMISSED')}
                                    disabled={processing}
                                >
                                    <Text style={styles.btnText}>Reddet (Asılsız)</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        padding: spacing.md,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6
    },
    statusText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    dateText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textLight,
    },
    reasonTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.text,
        marginBottom: 6,
    },
    description: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userInfo: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.textLight,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 12,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: colors.white,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.text,
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        padding: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    detailLabel: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
    },
    detailValue: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        maxWidth: '70%',
        textAlign: 'right'
    },
    descriptionBox: {
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    descriptionText: {
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
    },
    inputLabel: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        marginBottom: 24,
        textAlignVertical: 'top',
        fontFamily: fonts.regular,
    },
    actionButtons: {
        gap: 12,
    },
    actionBtn: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: 'white',
    }
});
