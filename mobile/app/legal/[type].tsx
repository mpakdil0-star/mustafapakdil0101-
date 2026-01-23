import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors } from '../../constants/colors';
import { useAppSelector } from '../../hooks/redux';
import { getLegalDocuments, LegalDocument } from '../../services/legalService';

export default function LegalPolicyScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [doc, setDoc] = useState<LegalDocument | null>(null);
    const { user } = useAppSelector((state) => state.auth);

    const colors = getThemeColors(user?.userType);
    const themeColor = colors.primary;

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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{doc?.title || 'Yasal Metin'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColor} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {doc ? (
                        <>
                            <Text style={styles.versionText}>Versiyon: {doc.version} - Son Güncelleme: {new Date(doc.updatedAt).toLocaleDateString('tr-TR')}</Text>
                            <Text style={styles.content}>{doc.content}</Text>
                        </>
                    ) : (
                        <Text style={styles.errorText}>Metin yüklenemedi.</Text>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    versionText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    content: {
        fontSize: 15,
        lineHeight: 24,
        color: '#444',
    },
    errorText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
    }
});
