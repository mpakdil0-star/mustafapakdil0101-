import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../hooks/redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { userService } from '../../services/userService';
import { getFileUrl } from '../../constants/api';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { MOCK_ELECTRICIANS } from '../../data/mockElectricians';
import favoriteService from '../../services/favoriteService';



// Helper for badge color
const getServiceBadgeColor = (service: string) => {
    const s = service?.toLowerCase() || '';
    if (s.includes('elektrik')) return '#F59E0B'; // Amber
    if (s.includes('klima')) return '#3B82F6'; // Blue
    if (s.includes('güvenlik') || s.includes('alarm')) return '#EF4444'; // Red
    if (s.includes('uydu') || s.includes('anten')) return '#8B5CF6'; // Violet
    if (s.includes('akıllı') || s.includes('otomasyon')) return '#10B981'; // Emerald
    return '#6B7280'; // Gray
};

const getServiceLabel = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat === 'elektrik') return 'Elektrikçi';
    if (cat === 'cilingir') return 'Çilingir';
    if (cat === 'klima') return 'Klima Ustası';
    if (cat === 'beyaz-esya') return 'Beyaz Eşya Servisi';
    if (cat === 'tesisat') return 'Su Tesisatçısı';
    if (cat === 'kombi') return 'Kombi Servisi';
    if (cat === 'boya') return 'Boya Badana';
    if (cat === 'temizlik') return 'Temizlik';
    if (cat === 'nakliyat') return 'Nakliyat';
    if (cat === 'montaj') return 'Montaj Ustası';
    return 'Usta'; // Default fallback
};

export default function ElectricianDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAppSelector((state) => state.auth);

    const [electrician, setElectrician] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);
    const [showFavoriteModal, setShowFavoriteModal] = useState(false);
    const [favoriteModalType, setFavoriteModalType] = useState<'added' | 'removed'>('added');

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
    }>({ visible: false, title: '', message: '' });

    const scrollRef = useRef<ScrollView>(null);

    // Auto-scroll effect for specialties
    const contentWidthRef = useRef(0);
    const containerWidthRef = useRef(0);
    const scrollPosRef = useRef(0);
    const directionRef = useRef(1); // 1 = right, -1 = left
    const isPausedRef = useRef(false);

    // Smooth Auto-Scroll Implementation
    useEffect(() => {
        if (isLoading) return;

        const intervalId = setInterval(() => {
            if (!scrollRef.current || isPausedRef.current) return;

            const maxScroll = contentWidthRef.current - containerWidthRef.current;
            if (maxScroll <= 0) return; // No need to scroll if content fits

            // Move 1 pixel per tick (slow smooth scroll)
            scrollPosRef.current += directionRef.current * 1;

            // Boundary checks
            if (scrollPosRef.current >= maxScroll) {
                scrollPosRef.current = maxScroll;
                isPausedRef.current = true;
                setTimeout(() => {
                    directionRef.current = -1;
                    isPausedRef.current = false;
                }, 1000); // Pause at end
            } else if (scrollPosRef.current <= 0) {
                scrollPosRef.current = 0;
                isPausedRef.current = true;
                setTimeout(() => {
                    directionRef.current = 1;
                    isPausedRef.current = false;
                }, 1000); // Pause at start
            }

            scrollRef.current.scrollTo({ x: scrollPosRef.current, animated: false });
        }, 40); // 25fps update rate for smoothness

        return () => clearInterval(intervalId);
    }, [isLoading]);

    const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) return;
            try {
                setIsLoading(true);

                // MOCK VERI KONTROLÜ
                // Önce ID'ye göre mock var mı kontrol et
                let mockItem = MOCK_ELECTRICIANS.find(e => e.id === id);

                // Eğer id 'local-mock-' ile başlıyorsa index üzerinden bul (fallback)
                if (!mockItem && id.startsWith('local-mock-')) {
                    const mockIndex = parseInt(id.replace('local-mock-', ''));
                    mockItem = MOCK_ELECTRICIANS[mockIndex % MOCK_ELECTRICIANS.length];
                }

                if (mockItem) {
                    // Mock veriyi backend yapısına benzet
                    const transformedMock = {
                        id: mockItem.id, // Use the correct ID
                        fullName: mockItem.name,
                        profileImageUrl: mockItem.imageUrl,
                        isVerified: mockItem.isVerified,
                        electricianProfile: {
                            specialties: mockItem.services || [],
                            ratingAverage: mockItem.rating,
                            totalReviews: mockItem.reviewCount,
                            experienceYears: parseInt(mockItem.experience) || 5,
                            bio: mockItem.about,
                            responseTimeAvg: mockItem.responseTime,
                            completedJobsCount: mockItem.completedJobs,
                            verificationStatus: mockItem.isVerified ? 'VERIFIED' : 'PENDING',
                            serviceCategory: (mockItem as any).category || 'elektrik'
                        },
                        locations: [{ city: mockItem.city, district: mockItem.location.split(',')[0] }],
                        reviewsReceived: mockItem.latestReview ? [{
                            id: 'mock-review-1',
                            rating: 5,
                            comment: mockItem.latestReview.comment,
                            createdAt: new Date().toISOString(),
                            reviewer: {
                                fullName: mockItem.latestReview.user,
                                profileImageUrl: null
                            }
                        }] : []
                    };
                    setElectrician(transformedMock);
                    setIsLoading(false);
                    return;
                }

                const response = await userService.getElectricianById(id);
                if (response.success) {
                    setElectrician(response.data);
                } else {
                    setError(response.error?.message || 'Veri yüklenemedi');
                }
            } catch (err: any) {
                setError(err.message || 'Bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    // Check if electrician is in favorites
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (!id || !user) return;
            try {
                const result = await favoriteService.checkFavorite(id);
                setIsFavorite(result.isFavorite);
            } catch (error) {
                console.log('Error checking favorite status:', error);
            }
        };
        checkFavoriteStatus();
    }, [id, user]);

    const handleToggleFavorite = async () => {
        if (!user) {
            setPendingAction('favorite');
            setShowAuthModal(true);
            return;
        }

        if (!id) return;

        setFavoriteLoading(true);
        try {
            if (isFavorite) {
                await favoriteService.removeFavorite(id);
                setIsFavorite(false);
                setFavoriteModalType('removed');
                setShowFavoriteModal(true);
            } else {
                await favoriteService.addFavorite(id);
                setIsFavorite(true);
                setFavoriteModalType('added');
                setShowFavoriteModal(true);
            }
        } catch (error: any) {
            showAlert('Hata', error.message || 'İşlem başarısız oldu.', 'error');
        } finally {
            setFavoriteLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Profil yükleniyor...</Text>
            </View>
        );
    }

    if (error || !electrician) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>{error || 'Usta Bulunamadı'}</Text>
                <Button
                    title="Geri Dön"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const profile = electrician.electricianProfile || {};
    const locationStr = electrician.locations?.length > 0
        ? `${electrician.locations[0].district}, ${electrician.locations[0].city}`
        : 'Konum belirtilmemiş';

    // Güven skoru hesaplama (demo mantığı)
    // Güven skoru hesaplama (demo mantığı)
    // const trustScore = 85 + (electrician.isVerified ? 10 : 0) + (profile.ratingAverage >= 4.5 ? 5 : 0);

    const serviceName = profile.serviceCategory ? getServiceLabel(profile.serviceCategory) : (electrician.specialty || (profile.specialties && profile.specialties.length > 0 ? profile.specialties[0] : 'Usta'));
    const badgeColor = getServiceBadgeColor(profile.serviceCategory || serviceName);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >


            {/* Profile Card */}
            <Card style={styles.profileCard} elevated>
                <View style={styles.profileHeader}>
                    <View style={{ alignItems: 'center', marginRight: spacing.md }}>
                        <View style={styles.avatar}>
                            {electrician.profileImageUrl ? (
                                <Image
                                    source={{ uri: getFileUrl(electrician.profileImageUrl) || '' }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <Text style={styles.avatarText}>{electrician.fullName.charAt(0)}</Text>
                            )}
                        </View>
                        {electrician.isVerified && (
                            <TouchableOpacity
                                style={{ marginTop: 8 }}
                                onPress={() => showAlert(
                                    "Onaylı Usta",
                                    "Bu ustanın mesleki belgeleri ve kimliği platformumuz tarafından doğrulanmıştır. Güvenle hizmet alabilirsiniz.",
                                    "success"
                                )}
                                activeOpacity={0.7}
                            >
                                <VerificationBadge
                                    status={profile.verificationStatus || "APPROVED"}
                                    licenseVerified={true}
                                    size="small"
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginRight: 8 }}>
                                <Text style={styles.name}>
                                    {electrician.fullName}
                                </Text>

                                <View style={[styles.serviceBadge, { backgroundColor: badgeColor + '20' }]}>
                                    <Text style={[styles.serviceBadgeText, { color: badgeColor }]}>
                                        {serviceName}
                                    </Text>
                                </View>
                            </View>

                            {/* Verification Badge & Favorite (Keep aligned right or flowing? Favorite fits better top right absolute or flex-end) */}
                            {/* The original layout had favorite button in nameRow. Let's keep it but maybe absolute or separate flex item? */}
                            {/* With flex-wrap, the favorite button might get pushed. Let's make the wrapper flex:1 and favorite button separate. */}

                            <TouchableOpacity
                                style={[styles.headerFavoriteBtn, isFavorite && styles.headerFavoriteBtnActive]}
                                onPress={handleToggleFavorite}
                                disabled={favoriteLoading}
                                activeOpacity={0.7}
                            >
                                {favoriteLoading ? (
                                    <ActivityIndicator size="small" color={isFavorite ? colors.white : colors.error} />
                                ) : (
                                    <Ionicons
                                        name={isFavorite ? "heart" : "heart-outline"}
                                        size={18}
                                        color={isFavorite ? colors.white : colors.error}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>



                        <View style={{ height: 34, marginBottom: 4 }}>
                            <ScrollView
                                ref={scrollRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 20, gap: 6 }}
                                onContentSizeChange={(w) => contentWidthRef.current = w}
                                onLayout={(e) => containerWidthRef.current = e.nativeEvent.layout.width}
                                scrollEventThrottle={16}
                            >
                                {(profile.specialties || ['Elektrik Ustası']).map((specialty: string, index: number) => (
                                    <View key={index} style={styles.specialtyChip}>
                                        <Text style={styles.specialtyChipText}>{specialty}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.metaRow}>
                            <Ionicons name="location" size={14} color={colors.textSecondary} />
                            <Text style={styles.location}>{locationStr}</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={16} color={colors.warning} />
                            <Text style={styles.statValue}>
                                {profile.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : '0.0'}
                            </Text>
                        </View>
                        <Text style={styles.statLabel}>{profile.totalReviews || 0} değerlendirme</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile.completedJobsCount || 0}</Text>
                        <Text style={styles.statLabel}>Tamamlanan İş</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile.experienceYears || 0}</Text>
                        <Text style={styles.statLabel}>Deneyim (Yıl)</Text>
                    </View>
                </View>
            </Card>




            {/* Services */}
            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Sunduğu Hizmetler</Text>
                {profile.specialties?.map((service: string, index: number) => (
                    <View key={index} style={styles.serviceItem}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <Text style={styles.serviceText}>{service}</Text>
                    </View>
                )) || (
                        <Text style={styles.emptyText}>Hizmet detayları henüz girilmemiş.</Text>
                    )}
            </Card>

            {/* Response Time & Availability */}
            <Card style={styles.sectionCard}>
                <View style={styles.responseTimeContainer}>
                    <View style={styles.responseItem}>
                        <Ionicons name="time-outline" size={20} color={colors.info} />
                        <View>
                            <Text style={styles.responseTimeLabel}>Ortalama Yanıt</Text>
                            <Text style={styles.responseTimeValue}>
                                {profile.responseTimeAvg || '2'} saat
                            </Text>
                        </View>
                    </View>
                    <View style={styles.statDividerVertical} />
                    <View style={styles.responseItem}>
                        <Ionicons name="flash-outline" size={20} color={colors.warning} />
                        <View>
                            <Text style={styles.responseTimeLabel}>Hızlı Servis</Text>
                            <Text style={styles.availabilityValue}>Aktif</Text>
                        </View>
                    </View>
                </View>
            </Card>

            {/* Recent Reviews */}
            <View style={styles.reviewsHeaderSection}>
                <Text style={styles.sectionTitle}>Müşteri Yorumları</Text>
                {electrician.reviewsReceived?.length > 0 && (
                    <TouchableOpacity onPress={() => {/* Tümünü gör */ }}>
                        <Text style={styles.seeAllText}>Tümünü Gör</Text>
                    </TouchableOpacity>
                )}
            </View>

            {
                electrician.reviewsReceived?.length > 0 ? (
                    electrician.reviewsReceived.map((review: any, index: number) => (
                        <Card key={index} style={styles.reviewCardSmall}>
                            <View style={styles.reviewHeader}>
                                <Image
                                    source={{ uri: getFileUrl(review.reviewer?.profileImageUrl) || '' }}
                                    style={styles.reviewerAvatar}
                                />
                                <View style={styles.reviewerInfo}>
                                    <Text style={styles.reviewerName}>{review.reviewer?.fullName || 'Anonim Kullanıcı'}</Text>
                                    <View style={styles.reviewRatingStars}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Ionicons
                                                key={s}
                                                name={s <= review.rating ? "star" : "star-outline"}
                                                size={12}
                                                color={colors.warning}
                                            />
                                        ))}
                                    </View>
                                </View>
                                <Text style={styles.reviewDate}>
                                    {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                                </Text>
                            </View>
                            <Text style={styles.reviewComment} numberOfLines={3}>
                                {review.comment}
                            </Text>
                        </Card>
                    ))
                ) : (
                    <Card style={styles.emptyReviewsCard}>
                        <Ionicons name="chatbubbles-outline" size={32} color={colors.textLight} />
                        <Text style={styles.emptyReviewsText}>Henüz değerlendirme yapılmamış.</Text>
                    </Card>
                )
            }

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <Button
                    title="İş Teklifi Gönder"
                    onPress={() => {
                        if (!user) {
                            setPendingAction(`/jobs/create?electricianId=${electrician.id}`);
                            setShowAuthModal(true);
                            return;
                        }
                        router.push({ pathname: '/jobs/create', params: { electricianId: electrician.id } });
                    }}
                    variant="primary"
                    fullWidth
                    icon={<Ionicons name="briefcase" size={20} color={colors.white} />}
                />
            </View>

            <AuthGuardModal
                visible={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onLogin={() => {
                    setShowAuthModal(false);
                    if (pendingAction) {
                        router.push({
                            pathname: '/(auth)/login',
                            params: { redirectTo: pendingAction }
                        });
                    }
                }}
                onRegister={() => {
                    setShowAuthModal(false);
                    if (pendingAction) {
                        router.push({
                            pathname: '/(auth)/register',
                            params: { redirectTo: pendingAction }
                        });
                    }
                }}
                title="Giriş Gerekiyor"
                message="Usta ile iletişime geçebilmek için giriş yapmanız veya kayıt olmanız gerekmektedir."
            />

            {/* Favorite Success Modal - Glass Glow Theme */}
            <Modal visible={showFavoriteModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.98)', 'rgba(248, 250, 252, 0.95)']}
                        style={styles.favoriteModal}
                    >
                        <View style={styles.favoriteIconWrapper}>
                            <View style={[styles.favoriteIconGlow, favoriteModalType === 'removed' && { backgroundColor: '#94A3B8' }]} />
                            <LinearGradient
                                colors={favoriteModalType === 'added' ? ['#EF4444', '#DC2626'] : ['#64748B', '#475569']}
                                style={styles.favoriteIconBox}
                            >
                                <Ionicons
                                    name={favoriteModalType === 'added' ? "heart" : "heart-dislike"}
                                    size={32}
                                    color={colors.white}
                                />
                            </LinearGradient>
                        </View>

                        <Text style={styles.favoriteModalTitle}>
                            {favoriteModalType === 'added' ? 'Favorilere Eklendi! ❤️' : 'Favorilerden Kaldırıldı'}
                        </Text>
                        <Text style={styles.favoriteModalMessage}>
                            {favoriteModalType === 'added'
                                ? `${electrician?.fullName} favorilerinize eklendi. Profil > Favori Ustalarım'dan ulaşabilirsiniz.`
                                : `${electrician?.fullName} favorilerinizden çıkarıldı.`
                            }
                        </Text>

                        <TouchableOpacity
                            style={styles.favoriteModalBtn}
                            onPress={() => setShowFavoriteModal(false)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={favoriteModalType === 'added' ? [colors.primary, colors.primaryDark] : ['#64748B', '#475569']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.favoriteModalBtnGradient}
                            >
                                <Text style={styles.favoriteModalBtnText}>Tamam</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    content: {
        padding: spacing.screenPadding,
        paddingBottom: spacing.xxl,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    errorTitle: {
        fontFamily: fonts.semiBold,
        fontSize: 18,
        color: colors.text,
        marginBottom: spacing.xl,
    },
    profileCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    profileHeader: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 32,
        color: colors.white,
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        width: '100%',
        paddingRight: 4,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.text,
        marginRight: 8,
    },

    serviceBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    serviceBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    specialtyChip: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        backgroundColor: colors.primary + '15',
        borderRadius: 12,
        marginRight: 4,
    },
    specialtyChipText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.primary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    location: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.textSecondary,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    statValue: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    sectionCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontFamily: fonts.semiBold,
        fontSize: 16,
        color: colors.text,
        marginBottom: spacing.md,
    },
    aboutText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    serviceText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    responseTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    responseTimeText: {
        flex: 1,
    },
    responseTimeLabel: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    responseTimeValue: {
        fontFamily: fonts.semiBold,
        fontSize: 16,
        color: colors.info,
    },
    actionButtons: {
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    messageButton: {
        borderColor: colors.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
    },
    loadingText: {
        marginTop: spacing.md,
        fontFamily: fonts.medium,
        color: colors.textSecondary,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
    },

    statDividerVertical: {
        width: 1,
        height: '60%',
        backgroundColor: colors.border,
    },
    responseItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    availabilityValue: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.success,
    },
    reviewsHeaderSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        paddingHorizontal: 4,
    },
    seeAllText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.primary,
    },
    reviewCardSmall: {
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.border,
    },
    reviewerInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    reviewerName: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        marginBottom: 2,
    },
    reviewRatingStars: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewDate: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.textLight,
    },
    reviewComment: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: spacing.sm,
        lineHeight: 18,
    },
    emptyReviewsCard: {
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    emptyReviewsText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textLight,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.textLight,
        fontStyle: 'italic',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    favoriteButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.error + '10',
        borderWidth: 2,
        borderColor: colors.error + '30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButtonActive: {
        backgroundColor: colors.error,
        borderColor: colors.error,
    },
    mainActionButton: {
        flex: 1,
    },
    // Header favorite button (next to name)
    headerFavoriteBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.error + '10',
        borderWidth: 1.5,
        borderColor: colors.error + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 'auto',
    },
    headerFavoriteBtnActive: {
        backgroundColor: colors.error,
        borderColor: colors.error,
    },
    // Favorite Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    favoriteModal: {
        width: '100%',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 20,
    },
    favoriteIconWrapper: {
        width: 90,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    favoriteIconGlow: {
        position: 'absolute',
        width: 70,
        height: 70,
        backgroundColor: '#EF4444',
        borderRadius: 35,
        opacity: 0.25,
        transform: [{ scale: 1.5 }],
    },
    favoriteIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    favoriteModalTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 22,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    favoriteModalMessage: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    favoriteModalBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
    },
    favoriteModalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteModalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.white,
    },

});
