import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

export default function AdminReportsScreen() {
    return (
        <View style={styles.container}>
            <PremiumHeader title="Sistem Raporları" showBackButton />

            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="bar-chart" size={48} color={colors.primary} />
                </View>
                <Text style={styles.title}>Hazırlanıyor</Text>
                <Text style={styles.subtitle}>
                    Detaylı sistem raporları ve analizleri çok yakında burada olacak.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
