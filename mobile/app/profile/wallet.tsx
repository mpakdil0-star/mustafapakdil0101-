import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
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
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { getMe } from '../../store/slices/authSlice';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width, height } = Dimensions.get('window');

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

    const renderTransaction = (item: Transaction, index: number) => {
        const isPositive = item.amount > 0;
        const iconName = item.transactionType === 'PURCHASE' ? 'card-outline' :
            item.transactionType === 'BID_SPENT' ? 'flash-outline' :
                item.transactionType === 'REFUND' ? 'refresh-outline' : 'gift-outline';

        const accentColor = isPositive ? '#10B981' : item.transactionType === 'BID_SPENT' ? '#3B82F6' : '#EF4444';

        return (
            <Animated.View
                key={item.id}
                style={[
                    styles.transactionCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: Animated.multiply(slideAnim, (index + 1) * 0.2) }]
                    }
                ]}
            >
                <View style={[styles.transactionIconWrapper, { backgroundColor: accentColor + '15' }]}>
                    <Ionicons name={iconName as any} size={20} color={accentColor} />
                </View>

                <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionTitle, { color: colors.text }]}>{item.description}</Text>
                    <Text style={[styles.transactionSubtitle, { color: colors.textSecondary }]}>
                        {format(new Date(item.createdAt), 'HH:mm')} • {item.transactionType === 'PURCHASE' ? 'Yükleme' : 'Harcama'}
                    </Text>
                </View>

                <View style={styles.transactionValue}>
                    <Text style={[styles.transactionAmount, { color: isPositive ? '#10B981' : colors.text }]}>
                        {isPositive ? '+' : ''}{item.amount}
                    </Text>
                    <Text style={[styles.transactionUnit, { color: colors.textSecondary }]}>Kredi</Text>
                </View>
            </Animated.View>
        );
    };

    const balance = user?.electricianProfile?.creditBalance || 0;
    const totalLoaded = history.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const totalSpent = Math.abs(history.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0));

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
                {/* Premium Credit Card Section */}
                <Animated.View style={[styles.cardContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
                    <LinearGradient
                        colors={['#1E293B', '#0F172A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.creditCard}
                    >
                        {/* Decorative Patterns */}
                        <View style={styles.cardMesh} />
                        <View style={styles.cardGlow} />

                        <View style={styles.cardInternal}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardBrand}>
                                    <View style={styles.brandCircle1} />
                                    <View style={styles.brandCircle2} />
                                    <Text style={styles.brandText}>ELEKTRİKCİM</Text>
                                </View>
                                <Ionicons name="wifi-outline" size={24} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '90deg' }] }} />
                            </View>

                            <View style={styles.chipWrapper}>
                                <LinearGradient
                                    colors={['#F59E0B', '#D97706']}
                                    style={styles.cardChip}
                                />
                                <View style={styles.chipLines}>
                                    <View style={styles.chipLine} />
                                    <View style={styles.chipLine} />
                                    <View style={styles.chipLine} />
                                </View>
                            </View>

                            <View style={styles.balanceSection}>
                                <Text style={styles.balanceLabel}>MEVCUT BAKİYE</Text>
                                <View style={styles.balanceRow}>
                                    <Text style={styles.balanceText}>{balance}</Text>
                                    <Text style={styles.balanceCurrency}>KREDİ</Text>
                                </View>
                            </View>

                            <View style={styles.cardBottom}>
                                <View>
                                    <Text style={styles.cardHolderLabel}>KART SAHİBİ</Text>
                                    <Text style={styles.cardHolderName}>{user?.fullName?.toUpperCase() || 'DEĞERLİ USTA'}</Text>
                                </View>
                                <View style={styles.cardType}>
                                    <Ionicons name="flash" size={16} color="#F59E0B" />
                                    <Text style={styles.cardTypeText}>PREMIUM</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Stats Summary Panel */}
                <Animated.View style={[styles.statsPanel, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="trending-up" size={18} color="#10B981" />
                        </View>
                        <View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Yüklenen</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{totalLoaded}</Text>
                        </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={itemStyles.statItem}>
                        <View style={[styles.statIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                            <Ionicons name="trending-down" size={18} color="#3B82F6" />
                        </View>
                        <View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Harcanan</Text>
                            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{totalSpent}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Main Action Button */}
                <TouchableOpacity
                    style={styles.buyBtn}
                    onPress={() => router.push('/profile/buy-credits')}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buyBtnGradient}
                    >
                        <Ionicons name="add-circle" size={24} color="#FFF" />
                        <Text style={styles.buyBtnText}>Kredi Yükle</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Transaction History Section */}
                <View style={styles.historyContainer}>
                    <Text style={[styles.historyHeader, { color: colors.text }]}>İşlem Geçmişi</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : history.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="receipt-outline" size={32} color={colors.textSecondary + '40'} />
                            </View>
                            <Text style={[styles.emptyHeader, { color: colors.text }]}>Kayıt Bulunamadı</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Henüz bir kredi yüklemesi veya harcaması yapmadınız.</Text>
                        </View>
                    ) : (
                        Object.keys(groupedHistory).map((date) => (
                            <View key={date} style={styles.dateGroup}>
                                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{date}</Text>
                                {groupedHistory[date].map((t, idx) => renderTransaction(t, idx))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const itemStyles = {
    statItem: {
        flex: 1,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 12,
        paddingLeft: 20,
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    cardContainer: {
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    creditCard: {
        borderRadius: 24,
        height: 240,
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardInternal: {
        padding: 24,
        flex: 1,
        justifyContent: 'space-between',
    },
    cardMesh: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.05,
        backgroundColor: 'transparent',
    },
    cardGlow: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#7C3AED',
        opacity: 0.1,
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
    brandCircle1: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        opacity: 0.8,
    },
    brandCircle2: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F59E0B',
        marginLeft: -10,
        opacity: 0.8,
    },
    brandText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: fonts.bold,
        letterSpacing: 2,
        marginLeft: 4,
    },
    chipWrapper: {
        marginVertical: 10,
    },
    cardChip: {
        width: 45,
        height: 35,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    chipLines: {
        position: 'absolute',
        top: 0, left: 0, width: 45, height: 35,
        justifyContent: 'space-evenly',
        paddingHorizontal: 8,
    },
    chipLine: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        width: '100%',
    },
    balanceSection: {
        marginTop: 10,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontFamily: fonts.bold,
        letterSpacing: 1,
        marginBottom: 4,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    balanceText: {
        color: '#FFF',
        fontSize: 42,
        fontFamily: fonts.black,
    },
    balanceCurrency: {
        color: '#F59E0B',
        fontSize: 16,
        fontFamily: fonts.bold,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardHolderLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 8,
        fontFamily: fonts.bold,
        marginBottom: 2,
    },
    cardHolderName: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: fonts.semiBold,
        letterSpacing: 1,
    },
    cardType: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cardTypeText: {
        color: '#F59E0B',
        fontSize: 10,
        fontFamily: fonts.bold,
    },
    statsPanel: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        fontFamily: fonts.medium,
    },
    statValue: {
        fontSize: 18,
        fontFamily: fonts.bold,
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E2E8F0',
    },
    buyBtn: {
        marginBottom: 32,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: staticColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    buyBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
    },
    buyBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: fonts.bold,
    },
    historyContainer: {
        flex: 1,
    },
    historyHeader: {
        fontSize: 20,
        fontFamily: fonts.bold,
        marginBottom: 20,
    },
    dateGroup: {
        marginBottom: 24,
    },
    dateLabel: {
        fontSize: 13,
        fontFamily: fonts.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    transactionIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
        marginLeft: 16,
    },
    transactionTitle: {
        fontSize: 15,
        fontFamily: fonts.semiBold,
        marginBottom: 2,
    },
    transactionSubtitle: {
        fontSize: 12,
        fontFamily: fonts.medium,
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
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
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
        paddingHorizontal: 40,
        opacity: 0.7,
    },
});

