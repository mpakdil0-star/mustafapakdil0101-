import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../../hooks/redux';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';

// Vatandaş için tek adres (mock)
const CITIZEN_ADDRESS = {
    id: '1',
    title: 'Ev Adresim',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Caferağa',
    details: 'Moda Caddesi No:123 D:4',
};

// Elektrikçi için birden fazla adres (mock)
const ELECTRICIAN_ADDRESSES = [
    {
        id: '1',
        title: 'Ev',
        city: 'İstanbul',
        district: 'Kadıköy',
        neighborhood: 'Caferağa',
        details: 'Moda Caddesi No:123 D:4',
    },
    {
        id: '2',
        title: 'İş',
        city: 'İstanbul',
        district: 'Beşiktaş',
        neighborhood: 'Levent',
        details: 'Büyükdere Caddesi No:456 Plaza Kat:3',
    },
];

export default function AddressesScreen() {
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);
    const isElectrician = user?.userType === 'ELECTRICIAN';

    const handleEdit = (id: string) => {
        router.push({ pathname: '/profile/addresses/edit', params: { id } });
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Adresi Sil',
            'Bu adresi silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => console.log('Delete address:', id)
                },
            ]
        );
    };

    // Vatandaş için tek adres görünümü
    if (!isElectrician) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.singleAddressContent}>
                <Card style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.icon}>📍</Text>
                            <Text style={styles.addressTitle}>{CITIZEN_ADDRESS.title}</Text>
                        </View>
                    </View>

                    <Text style={styles.addressText}>
                        {CITIZEN_ADDRESS.details}
                    </Text>
                    <Text style={styles.locationText}>
                        {CITIZEN_ADDRESS.neighborhood}, {CITIZEN_ADDRESS.district} / {CITIZEN_ADDRESS.city}
                    </Text>

                    <Button
                        title="Adresi Düzenle"
                        onPress={() => handleEdit(CITIZEN_ADDRESS.id)}
                        variant="outline"
                        fullWidth
                        style={styles.editButton}
                    />
                </Card>
            </ScrollView>
        );
    }

    // Elektrikçi için çoklu adres görünümü
    const renderAddressItem = ({ item }: { item: typeof ELECTRICIAN_ADDRESSES[0] }) => (
        <Card style={styles.addressCard}>
            <View style={styles.addressHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.icon}>📍</Text>
                    <Text style={styles.addressTitle}>{item.title}</Text>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={() => handleEdit(item.id)}
                        style={styles.actionButton}
                    >
                        <Text style={styles.editIcon}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={styles.actionButton}
                    >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.addressText}>
                {item.details}
            </Text>
            <Text style={styles.locationText}>
                {item.neighborhood}, {item.district} / {item.city}
            </Text>
        </Card>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={ELECTRICIAN_ADDRESSES}
                renderItem={renderAddressItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz kayıtlı bir adresiniz yok.</Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <Button
                    title="Yeni Adres Ekle"
                    onPress={() => router.push('/profile/addresses/add')}
                    fullWidth
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxl + 80, // Space for footer
    },
    addressCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 20,
        marginRight: spacing.xs,
    },
    addressTitle: {
        ...typography.h4,
        color: colors.text,
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: spacing.xs,
        marginLeft: spacing.xs,
    },
    editIcon: {
        fontSize: 18,
        color: colors.primary,
    },
    deleteIcon: {
        fontSize: 18,
        color: colors.error,
    },
    addressText: {
        ...typography.body1,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    locationText: {
        ...typography.body2,
        color: colors.textSecondary,
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.body1,
        color: colors.textSecondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
        backgroundColor: colors.backgroundLight,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: spacing.xl, // Safe area for bottom
    },
    singleAddressContent: {
        padding: spacing.md,
        flexGrow: 1,
    },
    editButton: {
        marginTop: spacing.lg,
    },
});
