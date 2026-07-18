import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Dimensions } from 'react-native';
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
import favoriteService from '../../services/favoriteService';
import { ReportButton } from '../../components/common/ReportButton';
import { communityService } from '../../services/communityService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    if (cat === 'temizlik') return 'Temizlik Hizmeti';
    if (cat === 'nakliyat') return 'Nakliyat';
    if (cat === 'boya-badana') return 'Boya Badana';
    if (cat === 'koltuk-hali') return 'Koltuk/Halı Yıkama';
    if (cat === 'mobilya-montaj') return 'Mobilya Montaj';
    if (cat === 'kucuk-nakliye') return 'Küçük Nakliye';
    if (cat === 'kombi-servis') return 'Kombi Servisi';
    if (cat === 'asansor') return 'Asansör Bakım';
    if (cat === 'bocek-ilaclama') return 'Böcek İlaçlama';
    if (cat === 'guvenlik-kamera') return 'Güvenlik Kamera';
    return 'Usta';
};

export default function ElectricianDetailScreen() {
    const router = useRouter();
    const { id, scrollToGallery } = useLocalSearchParams<{ id: string; scrollToGallery?: string }>();
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
    const [showAllReviews, setShowAllReviews] = useState(false);

    // Showcase Gallery States
    const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
    const [selectedShowcase, setSelectedShowcase] = useState<any>(null);
    const [isShowcaseModalVisible, setIsShowcaseModalVisible] = useState(false);
    const [showcaseImageIndex, setShowcaseImageIndex] = useState(0);
    const [galleryY, setGalleryY] = useState(0);
    const [showFullscreenImage, setShowFullscreenImage] = useState<string | null>(null);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
    }>({ visible: false, title: '', message: '' });

    const scrollRef = useRef<ScrollView>(null);
    const mainScrollRef = useRef<ScrollView>(null);

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

                // Vitrin / Hüner verilerini çek
                let loadedShowcases: any[] = [];
                try {
                    const showcase = await communityService.showcase();
                    if (Array.isArray(showcase)) {
                        loadedShowcases = showcase.filter((item: any) => {
                            return item.ustaId === id;
                        });
                    }
                } catch (scErr) {
                    console.log('Error fetching showcase in detail:', scErr);
                }

                setShowcaseItems(loadedShowcases);

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

    // Auto-scroll to showcase gallery if requested
    useEffect(() => {
        if (scrollToGallery === 'true' && !isLoading && galleryY > 0 && mainScrollRef.current) {
            const timer = setTimeout(() => {
                mainScrollRef.current?.scrollTo({ y: galleryY - 20, animated: true });
            }, 400); // 400ms delay for screen render transition to be absolutely smooth
            return () => clearTimeout(timer);
        }
    }, [scrollToGallery, isLoading, galleryY]);

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

    let locationStr = 'Konum belirtilmemiş';
    if (electrician.locations && electrician.locations.length > 0) {
        const cityMap: Record<string, string[]> = {};
        electrician.locations.forEach((loc: any) => {
            const city = loc.city || 'Şehir Yok';
            if (!cityMap[city]) cityMap[city] = [];
            if (loc.district && !cityMap[city].includes(loc.district)) {
                cityMap[city].push(loc.district);
            }
        });

        locationStr = Object.entries(cityMap).map(([city, districts]) => {
            if (districts.length > 0) {
                return `${districts.join(', ')} (${city})`;
            }
            return city;
        }).join(' • ');
    }

    // Güven skoru hesaplama (demo mantığı)
    // Güven skoru hesaplama (demo mantığı)
    // const trustScore = 85 + (electrician.isVerified ? 10 : 0) + (profile.ratingAverage >= 4.5 ? 5 : 0);

    const serviceName = profile.serviceCategory ? getServiceLabel(profile.serviceCategory) : (electrician.specialty || (profile.specialties && profile.specialties.length > 0 ? profile.specialties[0] : 'Usta'));
    const badgeColor = getServiceBadgeColor(profile.serviceCategory || serviceName);

    return (
        <ScrollView
            ref={mainScrollRef}
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
                                    profile.isAuthorizedEngineer ? "Yetkili Mühendis" : "Onaylı Usta",
                                    profile.isAuthorizedEngineer
                                        ? "Bu usta, elektrik projeleri çizimi ve onayı için resmi EMO ve SMM belgelerine sahip bir mühendistir."
                                        : "Bu ustanın mesleki belgeleri ve kimliği platformumuz tarafından doğrulanmıştır. Güvenle hizmet alabilirsiniz.",
                                    "success"
                                )}
                                activeOpacity={0.7}
                            >
                                <VerificationBadge
                                    status={profile.verificationStatus || "APPROVED"}
                                    licenseVerified={true}
                                    isEngineer={!!profile.isAuthorizedEngineer}
                                    size="small"
                                    showLabel={true}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginRight: 8 }}>
                                <Text style={styles.name}>
                                    {electrician.fullName}{profile.isAuthorizedEngineer ? ' (Mühendis)' : ''}
                                </Text>

                                {profile.isAuthorizedEngineer && (
                                    <View style={styles.engineerBadge}>
                                        <View style={styles.engineerBadgeInner}>
                                            <Ionicons name="ribbon" size={10} color={colors.white} />
                                            <Text style={styles.engineerBadgeText}>MÜHENDİS</Text>
                                        </View>
                                    </View>
                                )}

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
                    <View style={[styles.statItem, styles.statItemRating]}>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color="#D97706" />
                            <Text style={[styles.statValue, { color: '#B45309' }]}>
                                {profile.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : '0.0'}
                            </Text>
                        </View>
                        <Text style={[styles.statLabel, { color: '#78350F' }]}>{profile.totalReviews || 0} Yorum</Text>
                    </View>
                    
                    <View style={[styles.statItem, styles.statItemJobs]}>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="checkmark-circle-sharp" size={14} color="#059669" />
                            <Text style={[styles.statValue, { color: '#047857' }]}>{profile.completedJobsCount || 0}</Text>
                        </View>
                        <Text style={[styles.statLabel, { color: '#065F46' }]}>Biten İş</Text>
                    </View>

                    <View style={[styles.statItem, styles.statItemExp]}>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="ribbon-sharp" size={14} color="#0284C7" />
                            <Text style={[styles.statValue, { color: '#0369A1' }]}>{profile.experienceYears || 0} Yıl</Text>
                        </View>
                        <Text style={[styles.statLabel, { color: '#075985' }]}>Deneyim</Text>
                    </View>
                </View>
            </Card>




            {/* Engineer Certificates */}
            {profile.isAuthorizedEngineer && (
                <View style={[styles.sectionCard, { borderColor: '#DBEAFE', borderWidth: 1, backgroundColor: '#EFF6FF', paddingVertical: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'center' }}>
                        <Ionicons name="ribbon" size={24} color="#3B82F6" />
                        <Text style={[styles.sectionTitle, { color: '#1E40AF', marginBottom: 0, marginLeft: 10, fontSize: 18, fontFamily: fonts.bold }]}>Yetki Belgeleri</Text>
                    </View>
                    <View style={styles.certRow}>
                        <View style={styles.certItem}>
                            <Text style={styles.certLabel}>EMO Sicil No</Text>
                            <Text style={[styles.certValue, { fontSize: 20 }]}>{profile.emoNumber || '-'}</Text>
                        </View>
                        <View style={styles.certDivider} />
                        <View style={styles.certItem}>
                            <Text style={styles.certLabel}>SMM Belge No</Text>
                            <Text style={[styles.certValue, { fontSize: 20 }]}>{profile.smmNumber || '-'}</Text>
                        </View>
                    </View>
                    <View style={[styles.certFooter, { borderTopColor: '#DBEAFE' }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#059669" />
                        <Text style={[styles.certFooterText, { fontSize: 13, fontFamily: fonts.semiBold }]}>Resmi projeler için imza yetkisi doğrulanmıştır</Text>
                    </View>
                </View>
            )}

            {/* Services */}
            <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Sunduğu Hizmetler</Text>
                <View style={styles.servicesContainer}>
                    {profile.specialties?.map((service: string, index: number) => (
                        <View key={index} style={styles.serviceRow}>
                            <View style={styles.serviceIconBox}>
                                <Ionicons name="checkmark-sharp" size={12} color={colors.primary} />
                            </View>
                            <Text style={styles.serviceTextDetail}>{service}</Text>
                        </View>
                    )) || (
                        <Text style={styles.emptyText}>Hizmet detayları henüz girilmemiş.</Text>
                    )}
                </View>
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

            {/* Hünerler & Portfolyo Galerisi */}
            {showcaseItems.length > 0 && (
                <View 
                    onLayout={(event: any) => setGalleryY(event.nativeEvent.layout.y)}
                >
                    <Card style={styles.sectionCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                <View style={styles.showcaseHeaderIcon}>
                                    <Ionicons name="images" size={16} color={colors.primary} />
                                </View>
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Hünerleri & Portfolyo</Text>
                            </View>
                            <Text style={styles.showcaseCountText}>{showcaseItems.length} Çalışma</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingRight: 12 }}
                        >
                            {showcaseItems.map((item, index) => {
                                const scImages = item.images && item.images.length > 0
                                    ? item.images
                                    : [item.image].filter(Boolean);
                                const imagesCount = scImages.length;

                                return (
                                    <TouchableOpacity
                                        key={item.id || index}
                                        style={styles.galleryCard}
                                        onPress={() => {
                                            setSelectedShowcase(item);
                                            setShowcaseImageIndex(0);
                                            setIsShowcaseModalVisible(true);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Image
                                            source={{ uri: getFileUrl(item.image) || '' }}
                                            style={styles.galleryImage}
                                            resizeMode="cover"
                                        />
                                        {imagesCount > 1 && (
                                            <View style={styles.imageBadge}>
                                                <Ionicons name="copy" size={10} color="#FFF" style={{ marginRight: 2 }} />
                                                <Text style={styles.imageBadgeText}>{imagesCount}</Text>
                                            </View>
                                        )}
                                        <LinearGradient
                                            colors={['transparent', 'rgba(15, 23, 42, 0.85)']}
                                            style={styles.galleryCardOverlay}
                                        >
                                            <Text style={styles.galleryCardTitle} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.galleryCardDesc} numberOfLines={1}>
                                                {item.description || 'Usta Çalışması'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Card>
                </View>
            )}

            {/* Recent Reviews */}
            <View style={styles.reviewsHeaderSection}>
                <Text style={styles.sectionTitle}>Müşteri Yorumları ({electrician.reviewsReceived?.length || 0})</Text>
                {electrician.reviewsReceived?.length > 5 && !showAllReviews && (
                    <TouchableOpacity onPress={() => setShowAllReviews(true)}>
                        <Text style={styles.seeAllText}>Tümünü Gör</Text>
                    </TouchableOpacity>
                )}
                {showAllReviews && (
                    <TouchableOpacity onPress={() => setShowAllReviews(false)}>
                        <Text style={styles.seeAllText}>Daha Az Gör</Text>
                    </TouchableOpacity>
                )}
            </View>

            {
                electrician.reviewsReceived?.length > 0 ? (
                    (showAllReviews ? electrician.reviewsReceived : electrician.reviewsReceived.slice(0, 5)).map((review: any, index: number) => (
                        <Card key={index} style={styles.reviewCardSmall}>
                            <Ionicons 
                                name={"quote" as any} 
                                size={32} 
                                color="rgba(13, 148, 136, 0.03)" 
                                style={{ position: 'absolute', right: 12, bottom: 8, zIndex: 0 }} 
                            />
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

                {/* Report Button - Visible to everyone, guarded by auth */}
                <ReportButton
                    userId={electrician.id}
                    userName={electrician.fullName}
                    variant="full"
                    onPress={() => {
                        if (!user) {
                            setPendingAction(`/profile/report?userId=${electrician.id}&userName=${electrician.fullName}`);
                            setShowAuthModal(true);
                            return;
                        }
                        // If logged in, don't show the button for their own profile
                        if (user.id === electrician.id) return;
                        
                        router.push({
                            pathname: '/profile/report',
                            params: { userId: electrician.id, userName: electrician.fullName }
                        });
                    }}
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
                title="Devam Etmek İçin Giriş Yapın"
                message="Bu işlemi gerçekleştirebilmek için giriş yapmanız veya yeni bir hesap oluşturmanız gerekmektedir."
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

            {/* Showcase Detail Modal (Unified design) */}
            <Modal
                visible={isShowcaseModalVisible && !!selectedShowcase}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsShowcaseModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[
                    styles.showcaseDetailModal,
                    {
                        backgroundColor: '#FFFFFF',
                        paddingBottom: 0,
                        maxHeight: Dimensions.get('window').height * 0.92,
                        padding: 0,
                        borderColor: '#E2E8F0',
                        borderRadius: 28,
                        overflow: 'hidden',
                        height: undefined,
                    }
                ]}>
                        {selectedShowcase && (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={{ width: '100%' }}
                                contentContainerStyle={{ paddingBottom: 28 }}
                                bounces={false}
                            >
                                {/* ── HERO FOTOĞRAF BÖLÜMÜ ── */}
                                {(() => {
                                    const scImages = selectedShowcase.images && selectedShowcase.images.length > 0
                                        ? selectedShowcase.images
                                        : [selectedShowcase.image].filter(Boolean);

                                    const cardWidth = Dimensions.get('window').width - 48;

                                    return (
                                        <View style={{ position: 'relative' }}>
                                            {scImages.length > 0 ? (
                                                <ScrollView
                                                    horizontal
                                                    pagingEnabled
                                                    showsHorizontalScrollIndicator={false}
                                                    snapToInterval={cardWidth}
                                                    decelerationRate="fast"
                                                    onScroll={(e) => {
                                                        const offset = e.nativeEvent.contentOffset.x;
                                                        const activeIdx = Math.floor((offset + cardWidth / 2) / cardWidth);
                                                        setShowcaseImageIndex(activeIdx);
                                                    }}
                                                    scrollEventThrottle={16}
                                                    style={{ width: '100%', height: 280 }}
                                                >
                                                    {scImages.map((imgUrl: string, idx: number) => (
                                                        <TouchableOpacity
                                                            key={idx}
                                                            activeOpacity={0.97}
                                                            onPress={() => setShowFullscreenImage(imgUrl)}
                                                            style={{ width: cardWidth, height: 280, overflow: 'hidden' }}
                                                        >
                                                            <Image
                                                                source={{ uri: getFileUrl(imgUrl) || '' }}
                                                                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                                                            />
                                                            <LinearGradient
                                                                colors={['transparent', 'rgba(0,0,0,0.72)']}
                                                                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
                                                            />
                                                            <View style={{
                                                                position: 'absolute', bottom: 14, right: 14,
                                                                backgroundColor: 'rgba(255,255,255,0.18)',
                                                                borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                                                                paddingHorizontal: 10, paddingVertical: 5,
                                                                borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5,
                                                            }}>
                                                                <Ionicons name="expand-outline" size={13} color="#FFF" />
                                                                <Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.bold }}>Büyüt</Text>
                                                            </View>
                                                            {scImages.length > 1 && (
                                                                <View style={{
                                                                    position: 'absolute', top: 14, right: 14,
                                                                    backgroundColor: 'rgba(0,0,0,0.55)',
                                                                    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
                                                                    paddingHorizontal: 9, paddingVertical: 4,
                                                                    borderRadius: 12,
                                                                }}>
                                                                    <Text style={{ color: '#FFF', fontSize: 11, fontFamily: fonts.bold }}>{idx + 1} / {scImages.length}</Text>
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            ) : (
                                                <View style={{ height: 200, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                                                    <Ionicons name="image-outline" size={44} color="#CBD5E1" />
                                                </View>
                                            )}

                                            {/* Kapat butonu üstte */}
                                            <TouchableOpacity
                                                onPress={() => setIsShowcaseModalVisible(false)}
                                                activeOpacity={0.8}
                                                style={{
                                                    position: 'absolute', top: 14, left: 14,
                                                    backgroundColor: 'rgba(0,0,0,0.52)',
                                                    width: 36, height: 36, borderRadius: 18,
                                                    justifyContent: 'center', alignItems: 'center',
                                                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                                                }}
                                            >
                                                <Ionicons name="close" size={19} color="#FFF" />
                                            </TouchableOpacity>

                                            {/* Carousel dots */}
                                            {scImages.length > 1 && (
                                                <View style={{
                                                    position: 'absolute', bottom: 14, left: 0, right: 0,
                                                    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5,
                                                }}>
                                                    {scImages.map((_: any, idx: number) => (
                                                        <View
                                                            key={idx}
                                                            style={{
                                                                width: showcaseImageIndex === idx ? 20 : 6,
                                                                height: 6, borderRadius: 3,
                                                                backgroundColor: showcaseImageIndex === idx ? '#FFF' : 'rgba(255,255,255,0.45)',
                                                            }}
                                                        />
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()}

                                {/* ── İÇERİK BÖLÜMÜ ── */}
                                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>

                                    {/* Badge + Başlık */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <LinearGradient
                                            colors={['#FFFBEB', '#FEF3C7']}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center', gap: 5,
                                                paddingHorizontal: 11, paddingVertical: 5,
                                                borderRadius: 20, borderWidth: 0.5, borderColor: '#FDE68A',
                                            }}
                                        >
                                            <Ionicons name="sparkles" size={11} color="#D97706" />
                                            <Text style={{ color: '#B45309', fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>Usta Vitrini</Text>
                                        </LinearGradient>
                                    </View>

                                    <Text style={{ fontSize: 22, fontFamily: fonts.bold, color: '#0F172A', lineHeight: 30, marginBottom: 16 }}>
                                        {selectedShowcase.title}
                                    </Text>

                                    <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 }} />

                                    {/* Usta Açıklaması */}
                                    <View style={{
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: 16, padding: 16,
                                        marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0',
                                    }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                                            <View style={{
                                                width: 28, height: 28, borderRadius: 14,
                                                backgroundColor: colors.primary + '18',
                                                justifyContent: 'center', alignItems: 'center',
                                            }}>
                                                <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                                            </View>
                                            <Text style={{ color: '#475569', fontSize: 11, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                                Usta Açıklaması
                                            </Text>
                                        </View>
                                        <Text style={{ color: '#334155', fontSize: 14, lineHeight: 22, fontFamily: fonts.regular }}>
                                            {selectedShowcase.description || 'Usta tarafından gerçekleştirilen profesyonel ve titiz bir çalışma.'}
                                        </Text>
                                    </View>

                                    <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 }} />

                                    {/* Eserin Sahibi - Profil Kartı */}
                                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                                        ESERİN SAHİBİ
                                    </Text>

                                    <View style={{
                                        borderRadius: 20, overflow: 'hidden', marginBottom: 20,
                                        shadowColor: '#0F172A',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
                                    }}>
                                        <LinearGradient
                                            colors={['#F8FAFF', '#EEF2FF']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center',
                                                padding: 16, gap: 14,
                                                borderWidth: 1, borderColor: '#E0E7FF', borderRadius: 20,
                                            }}
                                        >
                                            <View style={{
                                                width: 56, height: 56, borderRadius: 28,
                                                backgroundColor: '#E0E7FF',
                                                justifyContent: 'center', alignItems: 'center',
                                                borderWidth: 2.5, borderColor: colors.primary,
                                                overflow: 'hidden',
                                            }}>
                                                {electrician.profileImageUrl ? (
                                                    <Image
                                                        source={{ uri: getFileUrl(electrician.profileImageUrl) || '' }}
                                                        style={{ width: '100%', height: '100%' }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Ionicons name="person" size={24} color={colors.primary} />
                                                )}
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                {(() => {
                                                    const ustaCity = electrician.city || (electrician.locations && electrician.locations[0]?.city);
                                                    return (
                                                        <>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                                                <Text style={{ color: '#0F172A', fontSize: 16, fontFamily: fonts.bold }} numberOfLines={1}>
                                                                    {electrician.fullName}
                                                                </Text>
                                                                {electrician.isVerified && <Ionicons name="checkmark-circle" size={15} color="#10B981" />}
                                                            </View>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                {profile?.ratingAverage != null && (
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                                        <Ionicons name="star" size={12} color="#F59E0B" />
                                                                        <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: '#374151' }}>
                                                                            {Number(profile.ratingAverage).toFixed(1)}
                                                                        </Text>
                                                                        {profile?.totalReviews != null && (
                                                                            <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: '#9CA3AF' }}>
                                                                                ({profile.totalReviews} yorum)
                                                                            </Text>
                                                                        )}
                                                                    </View>
                                                                )}
                                                                {profile?.ratingAverage != null && ustaCity && (
                                                                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' }} />
                                                                )}
                                                                {ustaCity && (
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                                        <Ionicons name="location-outline" size={11} color="#6B7280" />
                                                                        <Text style={{ fontSize: 11, fontFamily: fonts.medium, color: '#6B7280' }}>
                                                                            {ustaCity}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </>
                                                    );
                                                })()}
                                            </View>

                                            <View style={{
                                                width: 36, height: 36, borderRadius: 18,
                                                backgroundColor: colors.primary,
                                                justifyContent: 'center', alignItems: 'center',
                                                shadowColor: colors.primary,
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.4, shadowRadius: 5, elevation: 3,
                                            }}>
                                                <Ionicons name="person-outline" size={17} color="#FFF" />
                                            </View>
                                        </LinearGradient>
                                    </View>

                                    {/* Alt CTA - Geri Dön */}
                                    <TouchableOpacity
                                        onPress={() => setIsShowcaseModalVisible(false)}
                                        activeOpacity={0.85}
                                        style={{ borderRadius: 18, overflow: 'hidden' }}
                                    >
                                        <LinearGradient
                                            colors={[colors.primary, colors.primaryDark || colors.primary]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{
                                                flexDirection: 'row', gap: 10,
                                                justifyContent: 'center', alignItems: 'center',
                                                height: 56, borderRadius: 18,
                                                shadowColor: colors.primary,
                                                shadowOffset: { width: 0, height: 6 },
                                                shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
                                            }}
                                        >
                                            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: fonts.bold, letterSpacing: 0.3 }}>
                                                Tamam
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ==================== FOTOĞRAF TAM EKRAN GÖSTERİCİ MODAL ==================== */}
            <Modal
                visible={!!showFullscreenImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFullscreenImage(null)}
            >
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' }} 
                    activeOpacity={1}
                    onPress={() => setShowFullscreenImage(null)}
                >
                    {showFullscreenImage && (
                        <Image 
                            source={{ uri: getFileUrl(showFullscreenImage) || '' }} 
                            style={{ width: '100%', height: '80%', resizeMode: 'contain' }} 
                        />
                    )}
                    
                    {/* Close Button at top right */}
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 25, zIndex: 100 }}
                        onPress={() => setShowFullscreenImage(null)}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
        paddingBottom: 100, // Navigation bar overlap fix
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
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
    },
    profileHeader: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
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
        fontSize: 18,
        color: colors.text,
        marginRight: 6,
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
        fontSize: 10,
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
        flexShrink: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    statItemRating: {
        backgroundColor: '#FFFBEB', // premium warm amber background
        borderColor: '#FEF3C7',
    },
    statItemJobs: {
        backgroundColor: '#ECFDF5', // premium taze green background
        borderColor: '#D1FAE5',
    },
    statItemExp: {
        backgroundColor: '#EFF6FF', // premium electric blue background
        borderColor: '#DBEAFE',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    statValue: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.text,
    },
    statLabel: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 2,
    },
    statDivider: {
        width: 0,
    },
    sectionCard: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
    },
    sectionTitle: {
        fontFamily: fonts.semiBold,
        fontSize: 15,
        color: colors.text,
        marginBottom: 12,
    },
    aboutText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    servicesContainer: {
        marginTop: 4,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    serviceIconBox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(13, 148, 136, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceTextDetail: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: '#334155',
        flex: 1,
    },
    responseTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    responseTimeText: {
        flex: 1,
    },
    responseTimeLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 0,
    },
    responseTimeValue: {
        fontFamily: fonts.semiBold,
        fontSize: 15,
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
        marginTop: spacing.sm,
        fontFamily: fonts.medium,
        color: colors.textSecondary,
    },
    certRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    certItem: {
        flex: 1,
        alignItems: 'center',
    },
    certLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    certValue: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: '#1E293B',
    },
    certDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#CBD5E1',
        marginHorizontal: 8,
    },
    certFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#DBEAFE',
        gap: 6,
    },
    certFooterText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: '#059669',
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
        fontSize: 15,
        color: colors.success,
    },
    reviewsHeaderSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    seeAllText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.primary,
    },
    reviewCardSmall: {
        padding: 14,
        marginBottom: 10,
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewerAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.border,
    },
    reviewerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    reviewerName: {
        fontFamily: fonts.bold,
        fontSize: 13,
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

    engineerBadge: {
        marginLeft: 6,
        paddingVertical: 2,
    },
    engineerBadgeInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 3,
    },
    engineerBadgeText: {
        color: 'white',
        fontSize: 10,
        fontFamily: fonts.bold,
        textTransform: 'uppercase',
    },
    // Showcase styles
    showcaseHeaderIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
    },
    showcaseCountText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.primary,
        backgroundColor: colors.primary + '08',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    galleryCard: {
        width: 140,
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    imageBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: '#FFF',
    },
    galleryCardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 10,
        height: 80,
        justifyContent: 'flex-end',
    },
    galleryCardTitle: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: '#FFF',
        marginBottom: 2,
    },
    galleryCardDesc: {
        fontFamily: fonts.regular,
        fontSize: 9.5,
        color: '#E2E8F0',
    },
    // Showcase Modal Styles
    showcaseDetailModal: {
        width: '100%',
        height: 520,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 24,
    },
    showcaseCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalCarouselContainer: {
        width: '100%',
        height: 260,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0F172A',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    swipeBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    carouselDotsContainer: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    carouselDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    carouselDotActive: {
        width: 14,
        backgroundColor: colors.primary,
    },
    showcaseModalTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#FFF',
        marginBottom: 8,
    },
    showcaseModalDesc: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: '#94A3B8',
        lineHeight: 19,
    },
    showcaseModalBtn: {
        width: '100%',
        height: 48,
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 12,
    },
    showcaseModalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    showcaseModalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.white,
    },
});
