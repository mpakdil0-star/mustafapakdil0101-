import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Linking,
    Modal,
    Alert as RNAlert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { getFileUrl, API_BASE_URL } from '../../constants/api';
import { useAppSelector } from '../../hooks/redux';
import api from '../../services/api';

export default function ElectricianProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const colors = useAppColors();

    const [electrician, setElectrician] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
    const { user } = useAppSelector((state) => state.auth);
    const isOwnProfile = user?.id === electrician?.id;

    useEffect(() => {
        fetchElectricianProfile();
    }, [id]);

    const fetchElectricianProfile = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}users/electricians/${id}`);
            const data = await response.json();

            if (data.success) {
                setElectrician(data.data);
            } else {
                setError('Usta profili yüklenemedi');
            }
        } catch (err) {
            console.error('Error fetching electrician:', err);
            setError('Bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCall = () => {
        if (electrician?.phone) {
            Linking.openURL(`tel:${electrician.phone}`);
        }
    };

    const handleReport = () => {
        setIsActionMenuVisible(false);
        router.push({
            pathname: '/profile/report',
            params: {
                userId: id,
                userName: electrician.fullName
            }
        });
    };

    const handleBlock = () => {
        setIsActionMenuVisible(false);
        RNAlert.alert(
            'Kullanıcıyı Engelle',
            'Bu kullanıcıyı engellediğinizde birbirinizin ilanlarını ve mesajlarını görmezsiniz. Devam etmek istiyor musunuz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Engelle',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await api.post('/blocks/toggle', { blockedId: id });
                            if (response.data.success) {
                                RNAlert.alert('Başarılı', 'Kullanıcı engellendi.', [
                                    { text: 'Tamam', onPress: () => router.back() }
                                ]);
                            }
                        } catch (err) {
                            RNAlert.alert('Hata', 'İşlem gerçekleştirilemedi.');
                        }
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <PremiumHeader title="Profil" showBackButton />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: staticColors.textSecondary }]}>Yükleniyor...</Text>
                </View>
            </View>
        );
    }

    if (error || !electrician) {
        return (
            <View style={styles.container}>
                <PremiumHeader title="Profil" showBackButton />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color={staticColors.error} />
                    <Text style={[styles.errorText, { color: staticColors.text }]}>{error || 'Profil bulunamadı'}</Text>
                    <Button title="Geri Dön" onPress={() => router.back()} variant="primary" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Usta Profili"
                showBackButton
                rightElement={
                    !isOwnProfile && user && (
                        <TouchableOpacity
                            onPress={() => setIsActionMenuVisible(true)}
                            style={styles.headerActionBtn}
                        >
                            <Ionicons name="ellipsis-vertical" size={24} color={staticColors.white} />
                        </TouchableOpacity>
                    )
                }
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Profile Header Card */}
                <Card style={styles.profileCard}>
                    <View style={styles.headerRow}>
                        <View style={styles.avatarAndInfo}>
                            <View style={styles.avatarSection}>
                                {electrician.profileImageUrl && getFileUrl(electrician.profileImageUrl) ? (
                                    <Image
                                        source={{ uri: getFileUrl(electrician.profileImageUrl)! }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="person" size={48} color={colors.primary} />
                                    </View>
                                )}
                            </View>

                            <View style={styles.nameAndSpecialties}>
                                <Text style={[styles.name, { color: colors.text }]}>{electrician.fullName}</Text>

                                {electrician.electricianProfile?.specialties && electrician.electricianProfile.specialties.length > 0 && (
                                    <Text style={[styles.specialtiesSubtitle, { color: staticColors.textSecondary }]}>
                                        {electrician.electricianProfile.specialties.slice(0, 3).join(', ')}
                                    </Text>
                                )}

                                {electrician.city && (
                                    <View style={styles.locationRow}>
                                        <Ionicons name="location" size={14} color={staticColors.textSecondary} />
                                        <Text style={[styles.locationText, { color: staticColors.textSecondary }]}>
                                            {electrician.city}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.favoriteButton} activeOpacity={0.7}>
                            <Ionicons name="heart-outline" size={24} color={staticColors.error} />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <View style={styles.statIconText}>
                                <Ionicons name="star" size={18} color="#F59E0B" />
                                <Text style={[styles.statValue, { color: colors.text }]}>
                                    {electrician.electricianProfile?.ratingAverage || '0.0'}
                                </Text>
                            </View>
                            <Text style={[styles.statLabel, { color: staticColors.textSecondary }]}>
                                {electrician.electricianProfile?.totalReviews || 0} değerlendirme
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {electrician.electricianProfile?.completedJobsCount || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: staticColors.textSecondary }]}>
                                Tamamlanan İş
                            </Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {electrician.electricianProfile?.experienceYears || 0}
                            </Text>
                            <Text style={[styles.statLabel, { color: staticColors.textSecondary }]}>
                                Deneyim (Yıl)
                            </Text>
                        </View>
                    </View>
                </Card>

                {/* Services Offered */}
                {electrician.electricianProfile?.specialties && electrician.electricianProfile.specialties.length > 0 && (
                    <Card style={styles.servicesCard}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sunduğu Hizmetler</Text>
                        <View style={styles.servicesList}>
                            {electrician.electricianProfile.specialties.map((service: string, index: number) => (
                                <View key={index} style={styles.serviceItem}>
                                    <View style={[styles.checkIcon, { backgroundColor: '#10B981' }]}>
                                        <Ionicons name="checkmark" size={16} color={staticColors.white} />
                                    </View>
                                    <Text style={[styles.serviceText, { color: colors.text }]}>{service}</Text>
                                </View>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Bio Section */}
                {electrician.electricianProfile?.bio && (
                    <Card style={styles.bioCard}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hakkında</Text>
                        <Text style={[styles.bioText, { color: staticColors.textSecondary }]}>
                            {electrician.electricianProfile.bio}
                        </Text>
                    </Card>
                )}

                {/* Customer Reviews */}
                {electrician.reviewsReceived && electrician.reviewsReceived.length > 0 && (
                    <Card style={styles.reviewsCard}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Müşteri Yorumları ({electrician.reviewsReceived.length})
                        </Text>
                        {electrician.reviewsReceived.map((review: any, index: number) => (
                            <View key={review.id || index} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewerInfo}>
                                        {review.reviewer?.profileImageUrl ? (
                                            <Image
                                                source={{ uri: getFileUrl(review.reviewer.profileImageUrl) || '' }}
                                                style={styles.reviewerAvatarImage}
                                            />
                                        ) : (
                                            <View style={[styles.reviewerAvatar, { backgroundColor: colors.primary + '20' }]}>
                                                <Ionicons name="person" size={16} color={colors.primary} />
                                            </View>
                                        )}
                                        <Text style={[styles.reviewerName, { color: colors.text }]}>
                                            {review.reviewer?.fullName || 'Müşteri'}
                                        </Text>
                                    </View>
                                    <View style={styles.reviewRating}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Ionicons
                                                key={star}
                                                name={star <= review.rating ? "star" : "star-outline"}
                                                size={14}
                                                color="#F59E0B"
                                            />
                                        ))}
                                    </View>
                                </View>
                                {review.comment && (
                                    <Text style={[styles.reviewComment, { color: staticColors.textSecondary }]}>
                                        "{review.comment}"
                                    </Text>
                                )}
                                <Text style={styles.reviewDate}>
                                    {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                                </Text>
                            </View>
                        ))}
                    </Card>
                )}

            </ScrollView>

            {/* Action Menu Modal */}
            <Modal
                visible={isActionMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsActionMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsActionMenuVisible(false)}
                >
                    <View style={styles.actionMenu}>
                        <TouchableOpacity style={styles.actionMenuItem} onPress={handleReport}>
                            <Ionicons name="flag-outline" size={20} color={colors.text} />
                            <Text style={[styles.actionMenuText, { color: colors.text }]}>Şikayet Et</Text>
                        </TouchableOpacity>
                        <View style={styles.actionMenuSeparator} />
                        <TouchableOpacity style={styles.actionMenuItem} onPress={handleBlock}>
                            <Ionicons name="ban-outline" size={20} color={staticColors.error} />
                            <Text style={[styles.actionMenuText, { color: staticColors.error }]}>Engelle</Text>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    profileCard: {
        padding: spacing.lg,
        marginTop: -20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    avatarAndInfo: {
        flexDirection: 'row',
        flex: 1,
        gap: spacing.md,
    },
    avatarSection: {
        flexShrink: 0,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: staticColors.white,
    },
    avatarPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: staticColors.white,
    },
    nameAndSpecialties: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontFamily: fonts.extraBold,
        fontSize: 20,
    },
    specialtiesSubtitle: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    locationText: {
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    favoriteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: staticColors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: staticColors.borderLight,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: staticColors.borderLight,
    },
    statBox: {
        alignItems: 'center',
        gap: 6,
    },
    statIconText: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: staticColors.borderLight,
    },
    statValue: {
        fontFamily: fonts.extraBold,
        fontSize: 18,
    },
    statLabel: {
        fontFamily: fonts.medium,
        fontSize: 11,
        textAlign: 'center',
    },
    trustCard: {
        marginTop: spacing.md,
        padding: spacing.lg,
    },
    trustHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    trustTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B981' + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    trustBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#10B981',
    },
    trustScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.sm,
    },
    trustPercentage: {
        fontFamily: fonts.extraBold,
        fontSize: 36,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: staticColors.borderLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        width: '100%',
        height: '100%',
    },
    servicesCard: {
        marginTop: spacing.md,
        padding: spacing.lg,
    },
    servicesList: {
        gap: spacing.sm,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceText: {
        fontFamily: fonts.medium,
        fontSize: 15,
    },
    bioCard: {
        marginTop: spacing.md,
        padding: spacing.lg,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        marginBottom: spacing.sm,
    },
    bioText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 21,
    },
    statsCard: {
        marginTop: spacing.md,
        padding: spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        gap: 8,
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtons: {
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    actionButton: {
        height: 56,
    },
    reviewsCard: {
        marginTop: spacing.md,
        padding: spacing.lg,
    },
    reviewItem: {
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    reviewerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewerAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    reviewerName: {
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    reviewRating: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewComment: {
        fontFamily: fonts.regular,
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    reviewDate: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: '#94A3B8',
        marginTop: spacing.xs,
    },
    headerActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    actionMenu: {
        backgroundColor: staticColors.white,
        borderRadius: 16,
        width: '100%',
        maxWidth: 300,
        overflow: 'hidden',
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    actionMenuText: {
        fontFamily: fonts.bold,
        fontSize: 15,
    },
    actionMenuSeparator: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
});
