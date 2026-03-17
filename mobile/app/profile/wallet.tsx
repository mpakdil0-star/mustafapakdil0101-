import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    Platform,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { getMe } from '../../store/slices/authSlice';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

interface Transaction {
    id: string;
    amount: number;
    transactionType: 'PURCHASE' | 'BID_SPENT' | 'REFUND' | 'BONUS';
    description: string;
    createdAt: string;
    balanceAfter: number;
}

export default function WalletScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const colors = useAppColors();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<Transaction[]>([]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const cardScale = useRef(new Animated.Value(0.92)).current;

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/payments/history');
            if (response.data.success) {
                setHistory(response.data.data);
            }
            await dispatch(getMe());

            // Start entrance animation
            Animated.parallel([
                Animated.spring(cardScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                })
            ]).start();

        } catch (error) {
            console.error('Wallet data fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Refresh data when screen gains focus (e.g., after buying credits)
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const groupTransactions = (transactions: Transaction[]) => {
        const groups: { [key: string]: Transaction[] } = {};
        transactions.forEach(t => {
            const date = new Date(t.createdAt);
            let dateStr = format(date, 'd MMMM yyyy', { locale: tr });
            if (isToday(date)) dateStr = 'Bugün';
            else if (isYesterday(date)) dateStr = 'Dün';

            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(t);
        });
        return groups;
    };

    const getTransactionMeta = (item: Transaction) => {
        const isPositive = item.amount > 0;
        switch (item.transactionType) {
            case 'PURCHASE':
                return { icon: 'arrow-down-circle', color: '#10B981', label: 'Kredi Yükleme', bgColor: '#ECFDF5' };
            case 'BID_SPENT':
                return { icon: 'flash', color: '#3B82F6', label: 'Teklif Harcaması', bgColor: '#EFF6FF' };
            case 'REFUND':
                return { icon: 'refresh-circle', color: '#F59E0B', label: 'İade', bgColor: '#FFFBEB' };
            case 'BONUS':
                return { icon: 'gift', color: '#8B5CF6', label: 'Bonus', bgColor: '#F5F3FF' };
            default:
                return { icon: 'swap-horizontal', color: '#64748B', label: 'İşlem', bgColor: '#F8FAFC' };
        }
    };

    const renderTransaction = (item: Transaction, index: number) => {
        const isPositive = item.amount > 0;
        const meta = getTransactionMeta(item);

        return (
            <Animated.View
                key={item.id}
                style={[
                    styles.transactionCard,
                    {
                        backgroundColor: colors.card || '#FFF',
                        opacity: fadeAnim,
                        transform: [{ translateY: Animated.multiply(slideAnim, (index + 1) * 0.15) }]
                    }
                ]}
            >
                <View style={[styles.transactionIconWrapper, { backgroundColor: meta.bgColor }]}>
                    <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                </View>

                <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                    <View style={styles.transactionMetaRow}>
                        <Text style={[styles.transactionSubtitle, { color: colors.textSecondary }]}>
                            {format(new Date(item.createdAt), 'HH:mm')}
                        </Text>
                        <View style={[styles.transactionTypeBadge, { backgroundColor: meta.bgColor }]}>
                            <Text style={[styles.transactionTypeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.transactionValue}>
                    <Text style={[styles.transactionAmount, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                        {isPositive ? '+' : ''}{item.amount}
                    </Text>
                    <Text style={[styles.transactionUnit, { color: colors.textSecondary }]}>Kredi</Text>
                </View>
            </Animated.View>
        );
    };

    const balance = user?.electricianProfile?.creditBalance || 0;
    const totalLoaded = history.filter(t => Number(t.amount) > 0).reduce((acc, t) => acc + Number(t.amount), 0);
    const totalSpent = Math.abs(history.filter(t => Number(t.amount) < 0).reduce((acc, t) => acc + Number(t.amount), 0));
    const totalTransactions = history.length;

    const groupedHistory = groupTransactions(history);

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <StatusBar barStyle="light-content" />

            <PremiumHeader
                title="Cüzdanım"
                subtitle="Kredi ve İşlem Yönetimi"
                showBackButton
                variant="transparent"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Premium Balance Card */}
                <Animated.View style={[styles.cardContainer, { transform: [{ scale: cardScale }] }]}>
                    <LinearGradient
                        colors={['#1A1A2E', '#16213E', '#0F3460']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.creditCard}
                    >
                        {/* Decorative Orbs */}
                        <View style={styles.cardOrb1} />
                        <View style={styles.cardOrb2} />
                        <View style={styles.cardOrb3} />

                        <View style={styles.cardInternal}>
                            {/* Card Top */}
                            <View style={styles.cardHeader}>
                                <View style={styles.cardBrand}>
                                    <LinearGradient
                                        colors={['#F59E0B', '#EF4444']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.brandIcon}
                                    >
                                        <Ionicons name="flash" size={14} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={styles.brandText}>İŞBİTİR</Text>
                                </View>
                                <View style={styles.cardTypeBadge}>
                                    <Ionicons name="diamond" size={12} color="#F59E0B" />
                                    <Text style={styles.cardTypeText}>PREMIUM</Text>
                                </View>
                            </View>

                            {/* Balance Display */}
                            <View style={styles.balanceSection}>
                                <Text style={styles.balanceLabel}>MEVCUT BAKİYE</Text>
                                <View style={styles.balanceRow}>
                                    <Text style={styles.balanceText}>{balance}</Text>
                                    <View style={styles.currencyBadge}>
                                        <Ionicons name="flash" size={12} color="#F59E0B" />
                                        <Text style={styles.balanceCurrency}>KREDİ</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Card Bottom */}
                            <View style={styles.cardBottom}>
                                <View>
                                    <Text style={styles.cardHolderLabel}>HESAP SAHİBİ</Text>
                                    <Text style={styles.cardHolderName}>{user?.fullName?.toUpperCase() || 'DEĞERLİ USTA'}</Text>
                                </View>
                                <View style={styles.contactlessIcon}>
                                    <Ionicons name="wifi-outline" size={20} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '90deg' }] }} />
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Quick Stats Row */}
                <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={[styles.statCard, { backgroundColor: colors.card || '#FFF' }]}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="arrow-up-circle" size={20} color="#10B981" />
                        </View>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>{totalLoaded}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Yüklenen</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: colors.card || '#FFF' }]}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="arrow-down-circle" size={20} color="#3B82F6" />
                        </View>
                        <Text style={[styles.statValue, { color: '#3B82F6' }]}>{totalSpent}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Harcanan</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: colors.card || '#FFF' }]}>
                        <View style={[styles.statIconCircle, { backgroundColor: '#F5F3FF' }]}>
                            <Ionicons name="receipt" size={20} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{totalTransactions}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>İşlem</Text>
                    </View>
                </Animated.View>

                {/* Buy Credits CTA */}
                <TouchableOpacity
                    style={styles.buyBtn}
                    onPress={() => router.push('/profile/buy-credits')}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#7C3AED', '#6D28D9']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buyBtnGradient}
                    >
                        <View style={styles.buyBtnIconCircle}>
                            <Ionicons name="add" size={22} color="#7C3AED" />
                        </View>
                        <View style={styles.buyBtnContent}>
                            <Text style={styles.buyBtnText}>Kredi Yükle</Text>
                            <Text style={styles.buyBtnSubtext}>Paketi seç, hemen başla</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Transaction History Section */}
                <View style={styles.historyContainer}>
                    <View style={styles.historyHeaderRow}>
                        <View style={styles.historyTitleGroup}>
                            <View style={styles.historyIndicator} />
                            <Text style={[styles.historyHeader, { color: colors.text }]}>İşlem Geçmişi</Text>
                        </View>
                        {history.length > 0 && (
                            <Text style={[styles.historyCount, { color: colors.textSecondary }]}>{history.length} kayıt</Text>
                        )}
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
                        </View>
                    ) : history.length === 0 ? (
                        <View style={[styles.emptyContainer, { backgroundColor: colors.card || '#FFF' }]}>
                            <LinearGradient
                                colors={['#F8FAFC', '#EEF2FF']}
                                style={styles.emptyIconCircle}
                            >
                                <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
                            </LinearGradient>
                            <Text style={[styles.emptyHeader, { color: colors.text }]}>Henüz İşlem Yok</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                İlk kredinizi yükleyerek iş teklifi vermeye başlayın.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => router.push('/profile/buy-credits')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.emptyBtnText}>İlk Kredini Yükle</Text>
                                <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        Object.keys(groupedHistory).map((date) => (
                            <View key={date} style={styles.dateGroup}>
                                <View style={styles.dateLabelRow}>
                                    <View style={styles.dateDot} />
                                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{date}</Text>
                                </View>
                                {groupedHistory[date].map((t, idx) => renderTransaction(t, idx))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },

    // ── Credit Card ──
    cardContainer: {
        marginBottom: 20,
        shadowColor: '#0F3460',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.35,
        shadowRadius: 30,
        elevation: 15,
    },
    creditCard: {
        borderRadius: 24,
        height: 210,
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardInternal: {
        padding: 22,
        flex: 1,
        justifyContent: 'space-between',
    },
    cardOrb1: {
        position: 'absolute',
        top: -60,
        right: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#7C3AED',
        opacity: 0.12,
    },
    cardOrb2: {
        position: 'absolute',
        bottom: -80,
        left: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#3B82F6',
        opacity: 0.08,
    },
    cardOrb3: {
        position: 'absolute',
        top: 60,
        left: width * 0.4,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F59E0B',
        opacity: 0.06,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    brandIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandText: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: fonts.bold,
        letterSpacing: 3,
    },
    cardTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    cardTypeText: {
        color: '#F59E0B',
        fontSize: 10,
        fontFamily: fonts.bold,
        letterSpacing: 1,
    },
    balanceSection: {
        marginTop: 8,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 10,
        fontFamily: fonts.bold,
        letterSpacing: 2,
        marginBottom: 6,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    balanceText: {
        color: '#FFF',
        fontSize: 42,
        fontFamily: fonts.black,
        letterSpacing: -1,
    },
    currencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    balanceCurrency: {
        color: '#F59E0B',
        fontSize: 12,
        fontFamily: fonts.bold,
        letterSpacing: 1,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardHolderLabel: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 8,
        fontFamily: fonts.bold,
        letterSpacing: 1,
        marginBottom: 3,
    },
    cardHolderName: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontFamily: fonts.semiBold,
        letterSpacing: 1.5,
    },
    contactlessIcon: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        padding: 6,
        borderRadius: 8,
    },

    // ── Stats Row ──
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontFamily: fonts.black,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: fonts.medium,
    },

    // ── Buy Button ──
    buyBtn: {
        marginBottom: 24,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    buyBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 18,
        gap: 14,
    },
    buyBtnIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buyBtnContent: {
        flex: 1,
    },
    buyBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: fonts.bold,
    },
    buyBtnSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: fonts.medium,
        marginTop: 1,
    },

    // ── History ──
    historyContainer: {
        flex: 1,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyIndicator: {
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: '#7C3AED',
    },
    historyHeader: {
        fontSize: 18,
        fontFamily: fonts.bold,
    },
    historyCount: {
        fontSize: 12,
        fontFamily: fonts.medium,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 50,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: fonts.medium,
    },
    dateGroup: {
        marginBottom: 20,
    },
    dateLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        marginLeft: 2,
    },
    dateDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
    },
    dateLabel: {
        fontSize: 13,
        fontFamily: fonts.bold,
        letterSpacing: 0.5,
    },

    // ── Transaction Cards ──
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    transactionIconWrapper: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
        marginLeft: 14,
    },
    transactionTitle: {
        fontSize: 14,
        fontFamily: fonts.semiBold,
        marginBottom: 4,
    },
    transactionMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    transactionSubtitle: {
        fontSize: 12,
        fontFamily: fonts.medium,
    },
    transactionTypeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    transactionTypeText: {
        fontSize: 10,
        fontFamily: fonts.bold,
    },
    transactionValue: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 18,
        fontFamily: fonts.black,
    },
    transactionUnit: {
        fontSize: 10,
        fontFamily: fonts.bold,
        marginTop: 1,
    },

    // ── Empty State ──
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 30,
        borderRadius: 20,
        marginTop: 8,
    },
    emptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    emptyHeader: {
        fontSize: 18,
        fontFamily: fonts.bold,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: fonts.medium,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.7,
        marginBottom: 20,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#7C3AED',
    },
    emptyBtnText: {
        color: '#7C3AED',
        fontSize: 14,
        fontFamily: fonts.bold,
    },
});
