import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { getLegalDocuments, LegalDocument } from '../../services/legalService';

export default function LegalPolicyScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const router = useRouter();
    const colors = useAppColors();
    const [loading, setLoading] = useState(true);
    const [doc, setDoc] = useState<LegalDocument | null>(null);

    useEffect(() => {
        fetchDoc();
    }, [type]);

    const fetchDoc = async () => {
        try {
            setLoading(true);
            const docs = await getLegalDocuments();
            const found = docs.find(d => d.type.toLowerCase() === type?.toLowerCase());
            if (found) {
                setDoc(found);
            }
        } catch (error) {
            console.error('Failed to fetch legal doc:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        // Force navigation to profile tab to ensure we don't drop to home or login
        router.navigate('/(tabs)/profile');
    };

    return (
        <View style={styles.container}>
            <PremiumHeader
                title={doc?.title || 'Yasal Metin'}
                subtitle={doc ? `Versiyon: ${doc.version}` : ''}
                showBackButton
                onBackPress={handleBack}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {doc ? (
                        <>
                            <View style={[styles.card, { shadowColor: colors.primary }]}>
                                <Text style={styles.lastUpdate}>Son Güncelleme: {new Date(doc.updatedAt).toLocaleDateString('tr-TR')}</Text>
                                <Text style={styles.text}>{doc.content.replace(/\\n/g, '\n')}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.closeButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                                onPress={handleBack}
                            >
                                <Text style={styles.closeButtonText}>Okudum, Anladım</Text>
                                <Ionicons name="checkmark-circle" size={20} color={staticColors.white} style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.center}>
                            <Ionicons name="alert-circle-outline" size={48} color={staticColors.textLight} />
                            <Text style={styles.errorText}>Metin yüklenemedi.</Text>
                            <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
                                <Text style={styles.errorButtonText}>Geri Dön</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
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
        padding: spacing.lg,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: staticColors.white,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 32,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    lastUpdate: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textLight,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    text: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        lineHeight: 26,
    },
    closeButton: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20
    },
    closeButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.white,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 16,
    },
    errorText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: staticColors.textSecondary,
    },
    errorButton: {
        padding: 10,
    },
    errorButtonText: {
        fontFamily: fonts.bold,
        color: staticColors.primary,
    }
});
