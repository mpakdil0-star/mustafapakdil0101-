import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { getLegalDocuments, recordConsent, LegalDocument } from '../../services/legalService';

interface LegalUpdateModalProps {
    visible: boolean;
    onAccept: (version: string) => void;
    requiredVersion: string;
}

export default function LegalUpdateModal({ visible, onAccept, requiredVersion }: LegalUpdateModalProps) {
    const [docs, setDocs] = useState<LegalDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const { user } = useAppSelector(state => state.auth);

    const accentColor = user?.userType === 'ELECTRICIAN' ? '#3B82F6' : '#7C3AED';

    useEffect(() => {
        if (visible) {
            fetchDocs();
        }
    }, [visible]);

    const fetchDocs = async () => {
        try {
            setLoading(true);
            const data = await getLegalDocuments();
            setDocs(data);
        } catch (error) {
            console.error('Failed to fetch legal docs for update:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        try {
            setAccepting(true);
            // Record consent for the main policies
            for (const d of docs) {
                if (d.type === 'KVKK' || d.type === 'TERMS') {
                    await recordConsent({
                        documentType: d.type,
                        documentVersion: d.version,
                        action: 'ACCEPTED'
                    });
                }
            }
            onAccept(requiredVersion);
        } catch (error) {
            console.error('Failed to accept new policies:', error);
        } finally {
            setAccepting(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={[styles.header, { backgroundColor: accentColor }]}>
                        <Ionicons name="document-text-outline" size={32} color="#fff" />
                        <Text style={styles.title}>Sözleşme Güncellendi</Text>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.description}>
                            Devam edebilmek için güncellenen Kullanıcı Sözleşmesi ve KVKK metinlerini onaylamanız gerekmektedir.
                        </Text>

                        {loading ? (
                            <ActivityIndicator size="large" color={accentColor} style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView style={styles.docList} showsVerticalScrollIndicator={false}>
                                {docs.map(doc => (
                                    <View key={doc.id} style={styles.docItem}>
                                        <Text style={styles.docTitle}>{doc.title}</Text>
                                        <Text style={styles.docPreview}>
                                            {doc.content.replace(/\\n/g, '\n')}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: accentColor }]}
                            onPress={handleAccept}
                            disabled={loading || accepting}
                        >
                            {accepting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Okudum, Onaylıyorum</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    header: {
        padding: 24,
        alignItems: 'center',
        gap: 10,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: fonts.bold,
    },
    body: {
        padding: 24,
    },
    description: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
        fontFamily: fonts.medium,
    },
    docList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    docItem: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    docTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 6,
        fontFamily: fonts.bold,
    },
    docPreview: {
        fontSize: 12,
        color: '#777',
        lineHeight: 18,
        fontFamily: fonts.regular,
    },
    button: {
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: fonts.bold,
    }
});
