import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Button } from '../../../components/common/Button';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import api from '../../../services/api';

const TICKET_TYPES = [
    { id: 'complaint', label: 'Şikayet' },
    { id: 'technical', label: 'Teknik Sorun' },
    { id: 'question', label: 'Soru/Bilgi' },
    { id: 'refund', label: 'Ödeme/İade' },
];

const PRIORITIES = [
    { id: 'low', label: 'Düşük', color: '#10B981' },
    { id: 'medium', label: 'Normal', color: '#F59E0B' },
    { id: 'high', label: 'Yüksek', color: '#EF4444' },
];

export default function CreateSupportTicketScreen() {
    const router = useRouter();
    const colors = useAppColors();

    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [selectedType, setSelectedType] = useState('question');
    const [selectedPriority, setSelectedPriority] = useState('medium');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!subject.trim() || !description.trim()) {
            Alert.alert('Eksik Bilgi', 'Lütfen konu ve açıklama alanlarını doldurun.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/support', {
                subject,
                description,
                ticketType: selectedType,
                priority: selectedPriority
            });

            if (response.data.success) {
                Alert.alert(
                    'Başarılı',
                    'Destek talebiniz oluşturuldu. Ekibimiz en kısa sürede size dönüş yapacaktır.',
                    [{ text: 'Tamam', onPress: () => router.replace('/profile/support') }]
                );
            }
        } catch (error) {
            console.error('Create ticket error:', error);
            Alert.alert('Hata', 'Talep oluşturulurken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Yeni Destek Talebi" showBackButton />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    <Text style={styles.label}>Konu Başlığı</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: Ödeme işlemimde sorun var"
                        value={subject}
                        onChangeText={setSubject}
                    />

                    <Text style={styles.label}>Talep Türü</Text>
                    <View style={styles.chipContainer}>
                        {TICKET_TYPES.map(type => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.chip,
                                    selectedType === type.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setSelectedType(type.id)}
                            >
                                <Text style={[
                                    styles.chipText,
                                    selectedType === type.id && { color: '#fff' }
                                ]}>{type.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Öncelik</Text>
                    <View style={styles.chipContainer}>
                        {PRIORITIES.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.chip,
                                    selectedPriority === p.id && { backgroundColor: p.color + '20', borderColor: p.color }
                                ]}
                                onPress={() => setSelectedPriority(p.id)}
                            >
                                <View style={[styles.dot, { backgroundColor: p.color }]} />
                                <Text style={[
                                    styles.chipText,
                                    { color: p.color }
                                ]}>{p.label}</Text>
                                {selectedPriority === p.id && (
                                    <Ionicons name="checkmark-circle" size={16} color={p.color} style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Detaylı Açıklama</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Sorununuzu detaylı bir şekilde anlatın..."
                        multiline
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />

                    <View style={styles.footer}>
                        <Button
                            title="Talebi Gönder"
                            onPress={handleSubmit}
                            loading={loading}
                            fullWidth
                            variant="primary"
                        />
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.text,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.text,
    },
    textArea: {
        height: 120,
        paddingTop: 14,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chipText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    footer: {
        marginTop: 32,
        marginBottom: 40,
    }
});
