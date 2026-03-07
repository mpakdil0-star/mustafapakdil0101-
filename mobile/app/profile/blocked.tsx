import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';
import { getFileUrl } from '../../constants/api';

interface BlockedUser {
    id: string;
    fullName: string;
    profileImageUrl?: string;
    userType: string;
}

export default function BlockedUsersScreen() {
    const router = useRouter();
    const appColors = useAppColors();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchBlockedUsers = async () => {
        try {
            const response = await api.get('/blocks');
            if (response.data.success) {
                setBlockedUsers(response.data.data);
            }
        } catch (error) {
            console.error('🚨 Fetch Blocks Error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const handleToggleBlock = (blockedId: string, userName: string) => {
        Alert.alert(
            'Engeli Kaldır',
            `${userName} isimli kullanıcının engelini kaldırmak istediğinize emin misiniz?`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Engeli Kaldır',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await api.post('/blocks/toggle', { blockedId });
                            if (response.data.success && !response.data.isBlocked) {
                                setBlockedUsers(prev => prev.filter(u => u.id !== blockedId));
                            }
                        } catch (error) {
                            Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: BlockedUser }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                {item.profileImageUrl ? (
                    <Image
                        source={{ uri: getFileUrl(item.profileImageUrl) || '' }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: appColors.primary + '10' }]}>
                        <Text style={[styles.avatarText, { color: appColors.primary }]}>
                            {item.fullName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.userName}>{item.fullName}</Text>
                    <Text style={styles.userType}>
                        {item.userType === 'ELECTRICIAN' ? 'Usta' : 'Bireysel Kullanıcı'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.unblockButton, { borderColor: colors.error }]}
                onPress={() => handleToggleBlock(item.id, item.fullName)}
            >
                <Text style={[styles.unblockButtonText, { color: colors.error }]}>Engeli Kaldır</Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={appColors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Engellenen Kullanıcılar"
                subtitle="Engellediğiniz kişileri yönetin"
                showBackButton
            />

            <FlatList
                data={blockedUsers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            setIsRefreshing(true);
                            fetchBlockedUsers();
                        }}
                        tintColor={appColors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shield-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>Henüz kimseyi engellemediniz</Text>
                        <Text style={styles.emptySub}>
                            Rahatsız edici bulduğunuz kullanıcıları şikayet formundan engelleyebilirsiniz.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    listContent: {
        padding: 12,
        paddingBottom: 20,
        flexGrow: 1
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        padding: 10,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 16
    },
    textContainer: {
        flex: 1
    },
    userName: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text
    },
    userType: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textSecondary
    },
    unblockButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1
    },
    unblockButtonText: {
        fontFamily: fonts.bold,
        fontSize: 11
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 24
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.text,
        marginTop: 12,
        textAlign: 'center'
    },
    emptySub: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18
    }
});
