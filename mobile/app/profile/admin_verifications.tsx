import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import api from '../../services/api';
import { getFileUrl } from '../../constants/api';

interface VerificationRequest {
    userId: string;
    serviceCategory?: string; // Added service category
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
    };
    verificationDocuments: {
        documentType: string;
        documentUrl: string;
        submittedAt: string;
    };
}

const { width } = Dimensions.get('window');

// Helper to get document label based on service category
const getServiceDocumentLabel = (category: string = 'elektrik') => {
    switch (category.toLowerCase()) {
        case 'tesisat': return 'Su Tesisatçısı Belgesi';
        case 'klima': return 'Klima Teknikerliği Belgesi';
        case 'beyaz-esya': return 'Beyaz Eşya Servis Belgesi';
        case 'cilingir': return 'Anahtarcı/Çilingir Belgesi';
        case 'boya': return 'Boya ve Badana Ustalık Belgesi';
        case 'nakliyat': return 'Nakliyat Yetki Belgesi';
        case 'temizlik': return 'Temizlik Şirketi Yetki Belgesi';
        case 'elektrik': default: return 'Elektrik Ustası Belgesi';
    }
};

const getDocumentDisplayLabel = (type: string, category?: string) => {
    if (type === 'ELEKTRIK_USTASI') return getServiceDocumentLabel(category);
    if (type === 'MYK_BELGESI') return 'MYK Yeterlilik Belgesi';
    if (type === 'ODA_KAYIT') return 'Oda Kayıt Belgesi';
    return type;
};

export default function AdminVerificationsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const colors = useAppColors();

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

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const response = await api.get('/admin/verifications');
            if (response.data.success) {
                setRequests(response.data.data);
            }
        } catch (error) {
            console.error('Load admin verifications error:', error);
            showAlert('Hata', 'Bekleyen başvurular yüklenemedi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProcess = async (userId: string, status: 'VERIFIED' | 'REJECTED') => {
        const action = status === 'VERIFIED' ? 'onaylamak' : 'reddetmek';

        showAlert(
            'Emin misiniz?',
            `Bu başvuruyu ${action} istediğinize emin misiniz?`,
            'confirm',
            [
                { text: 'Vazgeç', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
                {
                    text: status === 'VERIFIED' ? 'Onayla' : 'Reddet',
                    variant: status === 'REJECTED' ? 'danger' : 'primary',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        setProcessingId(userId);
                        try {
                            const response = await api.post('/admin/verifications/process', {
                                targetUserId: userId,
                                status,
                                reason: status === 'REJECTED' ? 'Belge uygun bulunmadı.' : undefined
                            });

                            if (response.data.success) {
                                showAlert('Başarılı', response.data.message, 'success');
                                setRequests(prev => prev.filter(r => r.userId !== userId));
                            }
                        } catch (error) {
                            showAlert('Hata', 'İşlem sırasında bir hata oluştu.', 'error');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: VerificationRequest }) => (
        <Card style={[styles.requestCard, { shadowColor: colors.primary }]}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.user.fullName}</Text>
                    <Text style={styles.userEmail}>{item.user.email}</Text>
                    <Text style={styles.userPhone}>{item.user.phone || 'Telefon yok'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {getDocumentDisplayLabel(item.verificationDocuments?.documentType || 'Belge Türü Yok', item.serviceCategory)}
                    </Text>
                </View>
            </View>

            {item.verificationDocuments?.documentUrl ? (
                <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setSelectedImage(getFileUrl(item.verificationDocuments?.documentUrl))}
                    activeOpacity={0.9}
                >
                    <Image
                        source={{ uri: getFileUrl(item.verificationDocuments?.documentUrl) || '' }}
                        style={styles.docImage}
                        resizeMode="cover"
                    />
                    <View style={styles.zoomOverlay}>
                        <Ionicons name="search-outline" size={24} color={staticColors.white} />
                        <Text style={styles.zoomText}>Büyütmek için tıkla</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <View style={styles.noImage}>
                    <Ionicons name="image-outline" size={48} color={colors.textLight} />
                    <Text style={styles.noImageText}>Belge görseli yok</Text>
                </View>
            )}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn, { borderColor: staticColors.error }]}
                    onPress={() => handleProcess(item.userId, 'REJECTED')}
                    disabled={processingId === item.userId}
                >
                    <Ionicons name="close-circle-outline" size={20} color={staticColors.error} />
                    <Text style={[styles.rejectText, { color: staticColors.error }]}>Reddet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleProcess(item.userId, 'VERIFIED')}
                    disabled={processingId === item.userId}
                >
                    {processingId === item.userId ? (
                        <ActivityIndicator size="small" color={staticColors.white} />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={staticColors.white} />
                            <Text style={[styles.approveText, { color: staticColors.white }]}>Onayla</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Doğrulama Havuzu" showBackButton />

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : requests.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="shield-checkmark-outline" size={64} color={staticColors.textLight} />
                    <Text style={styles.emptyText}>Bekleyen başvuru bulunmuyor.</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.userId}
                    contentContainerStyle={styles.list}
                />
            )}

            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalFullOverlay}>
                    <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close" size={32} color={staticColors.white} />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig((prev: any) => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    list: {
        padding: spacing.md,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    requestCard: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: staticColors.white,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
    },
    userEmail: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    userPhone: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textLight,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        height: 24,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: fonts.bold,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        backgroundColor: '#f1f1f1',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    docImage: {
        width: '100%',
        height: '100%',
    },
    noImage: {
        width: '100%',
        height: 150,
        backgroundColor: '#f1f1f1',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    zoomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    zoomText: {
        color: staticColors.white,
        fontFamily: fonts.medium,
        fontSize: 12,
    },
    modalFullOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullImage: {
        width: width,
        height: '80%',
    },
    noImageText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textLight,
        marginTop: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    rejectBtn: {
        backgroundColor: staticColors.white,
        borderWidth: 1,
    },
    approveBtn: {
    },
    rejectText: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    approveText: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
    },
});
