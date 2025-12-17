import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import favoriteService, { FavoriteElectrician } from '../../services/favoriteService';

export default function FavoritesScreen() {
    const router = useRouter();
    const [favorites, setFavorites] = useState<FavoriteElectrician[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFavorites = useCallback(async () => {
        try {
            const data = await favoriteService.getFavorites();
            setFavorites(data);
        } catch (error: any) {
            console.error('Error fetching favorites:', error);
            // API henüz hazır değilse boş liste göster
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

    const handleRemoveFavorite = useCallback(async (electricianId: string, name: string) => {
        Alert.alert(
            'Favorilerden Çıkar',
            `${name} favorilerinizden çıkarılsın mı?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Çıkar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await favoriteService.removeFavorite(electricianId);
                            setFavorites(prev => prev.filter(f => f.electricianId !== electricianId));
                        } catch (error: any) {
                            Alert.alert('Hata', 'Favoriden çıkarılamadı.');
                        }
                    },
                },
            ]
        );
    }, []);

    const renderFavoriteItem = ({ item }: { item: FavoriteElectrician }) => (
        <Card style={styles.card} onPress={() => router.push(`/electricians/${item.electricianId}`)}>
            <View style={styles.row}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.electrician.fullName.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.electrician.fullName}</Text>
                    <View style={styles.stats}>
                        <Ionicons name="star" size={14} color={colors.warning} />
                        <Text style={styles.rating}> {Number(item.electrician.rating).toFixed(1)}</Text>
                        <Text style={styles.jobs}>• {item.electrician.completedJobs} İş</Text>
                    </View>
                    {item.electrician.specialties.length > 0 && (
                        <Text style={styles.specialties} numberOfLines={1}>
                            {item.electrician.specialties.slice(0, 2).join(', ')}
                        </Text>
                    )}
                </View>
                <Ionicons
                    name="heart"
                    size={24}
                    color={colors.error}
                    onPress={() => handleRemoveFavorite(item.electricianId, item.electrician.fullName)}
                />
            </View>
        </Card>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={favorites}
                renderItem={renderFavoriteItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>Henüz Favori Yok</Text>
                        <Text style={styles.emptyText}>
                            Beğendiğiniz elektrikçileri favorilere ekleyerek buradan kolayca ulaşabilirsiniz.
                        </Text>
                        <Button
                            title="Elektrikçileri Keşfet"
                            onPress={() => router.push('/electricians')}
                            style={styles.exploreButton}
                        />
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
    },
    listContent: {
        padding: spacing.md,
        flexGrow: 1,
    },
    card: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...typography.h3,
        color: colors.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        ...typography.h6,
        color: colors.text,
        marginBottom: 2,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        ...typography.caption,
        color: colors.warning,
        fontWeight: 'bold',
        marginRight: spacing.sm,
    },
    jobs: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    specialties: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    removeButton: {
        padding: 0,
        minWidth: 0,
    },
    emptyContainer: {
        flex: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl * 2,
    },
    emptyTitle: {
        ...typography.h5,
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.body1,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    exploreButton: {
        marginTop: spacing.md,
    },
});
