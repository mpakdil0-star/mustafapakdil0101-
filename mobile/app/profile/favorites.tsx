import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import favoriteService, { FavoriteElectrician } from '../../services/favoriteService';

export default function FavoritesScreen() {
    const router = useRouter();
    const [favorites, setFavorites] = useState<FavoriteElectrician[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const colors = useAppColors();

    // Modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: any }>({ visible: false, title: '', message: '', type: 'error' });
    const [selectedElectrician, setSelectedElectrician] = useState<{ id: string; name: string } | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const fetchFavorites = useCallback(async () => {
        try {
            const data = await favoriteService.getFavorites();
            setFavorites(data);
        } catch (error: any) {
            console.error('Error fetching favorites:', error);
            setFavorites([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFavorites();
    }, [fetchFavorites]);

    const handleRemoveFavorite = (electricianId: string, name: string) => {
        setSelectedElectrician({ id: electricianId, name });
        setShowConfirmModal(true);
    };

    const confirmRemove = async () => {
        if (!selectedElectrician) return;

        setIsRemoving(true);
        try {
            await favoriteService.removeFavorite(selectedElectrician.id);
            setFavorites(prev => prev.filter(f => f.electricianId !== selectedElectrician.id));
            setShowConfirmModal(false);
            setShowSuccessModal(true);
        } catch (error: any) {
            setAlertConfig({ visible: true, title: 'Hata', message: 'Favoriden çıkarılamadı.', type: 'error' });
        } finally {
            setIsRemoving(false);
        }
    };

    const renderFavoriteItem = ({ item }: { item: FavoriteElectrician }) => (
        <TouchableOpacity
            style={[styles.card, { shadowColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/electricians/${item.electricianId}` as any)}
        >
            <View style={styles.cardContent}>
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatarGlow, { backgroundColor: colors.primary + '10' }]} />
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{item.electrician.fullName.charAt(0)}</Text>
                    </View>
                </View>

                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.electrician.fullName}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statLabel}>
                            <Ionicons name="star" size={14} color={staticColors.warning} />
                            <Text style={[styles.ratingText, { color: staticColors.warning }]}> {Number(item.electrician.rating).toFixed(1)}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <Text style={styles.completedJobsText}>{item.electrician.completedJobs} İş</Text>
                    </View>
                    {item.electrician.specialties.length > 0 && (
                        <View style={styles.specialtiesWrapper}>
                            {item.electrician.specialties.slice(0, 1).map((s, idx) => (
                                <View key={idx} style={styles.specialtyBadge}>
                                    <Text style={styles.specialtyText}>{s}</Text>
                                </View>
                            ))}
                            {item.electrician.specialties.length > 1 && (
                                <Text style={styles.moreText}>+{item.electrician.specialties.length - 1}</Text>
                            )}
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => handleRemoveFavorite(item.electricianId, item.electrician.fullName)}
                    style={styles.favoriteButton}
                    activeOpacity={0.6}
                >
                    <Ionicons name="heart" size={24} color={staticColors.error} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Favori Ustalarım" showBackButton />

            <FlatList
                data={favorites}
                renderItem={renderFavoriteItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconContainer, { shadowColor: colors.primary }]}>
                            <Ionicons name="heart-outline" size={60} color={colors.primary + '40'} />
                        </View>
                        <Text style={styles.emptyTitle}>Henüz Favori Yok</Text>
                        <Text style={styles.emptyText}>
                            Beğendiğiniz ustaları favorilere ekleyerek burada listeleyebilirsiniz.
                        </Text>
                        <Button
                            title="Ustaları Keşfet"
                            onPress={() => router.push('/electricians')}
                            style={styles.exploreButton}
                            variant="outline"
                        />
                    </View>
                }
            />

            {/* Confirmation Modal - Glass Glow Theme */}
            <Modal visible={showConfirmModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={[styles.confirmModal, { borderColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <View style={styles.confirmIconWrapper}>
                            <View style={styles.confirmIconGlow} />
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.confirmIconBox}
                            >
                                <Ionicons name="heart-dislike" size={32} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.confirmTitle, { color: staticColors.white }]}>Favorilerden Çıkar?</Text>
                        <Text style={[styles.confirmMessage, { color: 'rgba(255,255,255,0.6)' }]}>
                            {selectedElectrician?.name} favorilerinizden çıkarılacak. Devam etmek istiyor musunuz?
                        </Text>

                        <View style={styles.confirmBtnGroup}>
                            <TouchableOpacity
                                style={[styles.confirmCancelBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                onPress={() => setShowConfirmModal(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.confirmCancelBtnText, { color: 'rgba(255,255,255,0.6)' }]}>Vazgeç</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmRemoveBtn}
                                onPress={confirmRemove}
                                disabled={isRemoving}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#EF4444', '#DC2626']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.confirmRemoveBtnGradient}
                                >
                                    {isRemoving ? (
                                        <ActivityIndicator size="small" color={staticColors.white} />
                                    ) : (
                                        <Text style={styles.confirmRemoveBtnText}>Çıkar</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </Modal>

            {/* Success Modal - Glass Glow Theme */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={[styles.successModal, { borderColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <View style={styles.successIconWrapper}>
                            <View style={styles.successIconGlow} />
                            <LinearGradient
                                colors={['#64748B', '#475569']}
                                style={styles.successIconBox}
                            >
                                <Ionicons name="checkmark" size={32} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.successTitle, { color: staticColors.white }]}>Kaldırıldı</Text>
                        <Text style={[styles.successMessage, { color: 'rgba(255,255,255,0.6)' }]}>
                            {selectedElectrician?.name} favorilerinizden çıkarıldı.
                        </Text>

                        <TouchableOpacity
                            style={styles.successBtn}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setSelectedElectrician(null);
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.successBtnGradient}
                            >
                                <Text style={styles.successBtnText}>Tamam</Text>
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
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        padding: spacing.lg,
        flexGrow: 1,
    },
    card: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatarGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 24,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 24,
    },
    info: {
        flex: 1,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: staticColors.text,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: staticColors.borderLight,
        marginHorizontal: 10,
    },
    completedJobsText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    specialtiesWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    specialtyBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    specialtyText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textSecondary,
    },
    moreText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textLight,
    },
    favoriteButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: staticColors.error + '08',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: staticColors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: staticColors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    exploreButton: {
        minWidth: 160,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmModal: {
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
    confirmIconWrapper: {
        width: 90,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmIconGlow: {
        position: 'absolute',
        width: 70,
        height: 70,
        backgroundColor: '#F59E0B',
        borderRadius: 35,
        opacity: 0.25,
        transform: [{ scale: 1.5 }],
    },
    confirmIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    confirmTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 22,
        color: staticColors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    confirmBtnGroup: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmCancelBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.textSecondary,
    },
    confirmRemoveBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
    },
    confirmRemoveBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmRemoveBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.white,
    },
    successModal: {
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
    successIconWrapper: {
        width: 90,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successIconGlow: {
        position: 'absolute',
        width: 70,
        height: 70,
        backgroundColor: '#64748B',
        borderRadius: 35,
        opacity: 0.25,
        transform: [{ scale: 1.5 }],
    },
    successIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    successTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 22,
        color: staticColors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    successMessage: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    successBtn: {
        width: '100%',
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
    },
    successBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.white,
    },
});
