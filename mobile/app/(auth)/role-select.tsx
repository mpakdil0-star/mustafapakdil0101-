import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { SERVICE_CATEGORIES, ServiceCategory } from '../../constants/serviceCategories';

const { width } = Dimensions.get('window');

// Map category ID to 3D image asset (same as home screen)
const getCategoryImage = (id: string) => {
    // 3D image files are currently missing, fallback to null
    return null;
};

export default function RoleSelectScreen() {
    const router = useRouter();
    const { initialRole } = useLocalSearchParams<{ initialRole?: 'CITIZEN' | 'ELECTRICIAN' }>();
    const [userType, setUserType] = useState<'CITIZEN' | 'ELECTRICIAN' | null>(initialRole || null);
    const [serviceCategory, setServiceCategory] = useState<string | null>(null);

    const canProceed = userType === 'CITIZEN' || (userType === 'ELECTRICIAN' && serviceCategory);

    const handleContinue = () => {
        if (!canProceed) return;

        router.push({
            pathname: '/(auth)/register',
            params: {
                initialRole: userType,
                serviceCategory: serviceCategory || undefined,
            },
        });
    };

    return (
        <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.container}
        >
            {/* Glow Blobs */}
            <View style={[styles.glowBlob, { top: -80, left: -80, backgroundColor: '#7C3AED' }]} />
            <View style={[styles.glowBlob, { bottom: -100, right: -100, backgroundColor: '#3B82F6' }]} />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Nasıl Kayıt Olacaksınız?</Text>
                    <Text style={styles.subtitle}>Rolünüzü seçerek başlayın</Text>
                </View>

                {/* Role Selection */}
                <View style={styles.roleContainer}>
                    {/* Vatandaş Card */}
                    <TouchableOpacity
                        style={[
                            styles.roleCard,
                            userType === 'CITIZEN' && styles.roleCardSelected,
                            userType === 'CITIZEN' && { borderColor: '#7C3AED' },
                        ]}
                        onPress={() => {
                            setUserType('CITIZEN');
                            setServiceCategory(null);
                        }}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={userType === 'CITIZEN' ? ['#7C3AED', '#6D28D9'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                            style={styles.roleIconBg}
                        >
                            <Ionicons name="person" size={32} color={userType === 'CITIZEN' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                        </LinearGradient>
                        <Text style={[styles.roleTitle, userType === 'CITIZEN' && { color: '#FFFFFF' }]}>Vatandaş</Text>
                        <Text style={styles.roleDesc}>Hizmet almak istiyorum</Text>
                        {userType === 'CITIZEN' && (
                            <View style={[styles.checkBadge, { backgroundColor: '#7C3AED' }]}>
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Usta Card */}
                    <TouchableOpacity
                        style={[
                            styles.roleCard,
                            userType === 'ELECTRICIAN' && styles.roleCardSelected,
                            userType === 'ELECTRICIAN' && { borderColor: '#3B82F6' },
                        ]}
                        onPress={() => setUserType('ELECTRICIAN')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={userType === 'ELECTRICIAN' ? ['#3B82F6', '#2563EB'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                            style={styles.roleIconBg}
                        >
                            <Ionicons name="construct" size={32} color={userType === 'ELECTRICIAN' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                        </LinearGradient>
                        <Text style={[styles.roleTitle, userType === 'ELECTRICIAN' && { color: '#FFFFFF' }]}>Usta</Text>
                        <Text style={styles.roleDesc}>Hizmet vermek istiyorum</Text>
                        {userType === 'ELECTRICIAN' && (
                            <View style={[styles.checkBadge, { backgroundColor: '#3B82F6' }]}>
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Profession Selection (only for Usta) */}
                {userType === 'ELECTRICIAN' && (
                    <View style={styles.professionSection}>
                        <Text style={styles.sectionLabel}>Mesleğinizi Seçin</Text>
                        <View style={styles.professionGrid}>
                            {SERVICE_CATEGORIES.map((cat: ServiceCategory) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.professionCard,
                                        serviceCategory === cat.id && { borderColor: cat.colors[0], backgroundColor: cat.colors[0] + '20' },
                                    ]}
                                    onPress={() => setServiceCategory(cat.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[
                                        styles.professionIconBg,
                                        serviceCategory === cat.id && { backgroundColor: cat.colors[0] + '30' }
                                    ]}>
                                        <Image
                                            source={getCategoryImage(cat.id)}
                                            style={styles.professionImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={[
                                        styles.professionName,
                                        serviceCategory === cat.id && { color: '#FFFFFF', fontFamily: fonts.bold }
                                    ]}>
                                        {cat.name}
                                    </Text>
                                    {serviceCategory === cat.id && (
                                        <View style={[styles.professionCheck, { backgroundColor: cat.colors[0] }]}>
                                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Continue Button */}
                <TouchableOpacity
                    style={[
                        styles.continueBtn,
                        !canProceed && styles.continueBtnDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!canProceed}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={canProceed ? (userType === 'CITIZEN' ? ['#7C3AED', '#6D28D9'] : ['#3B82F6', '#2563EB']) : ['#374151', '#374151']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.continueBtnGradient}
                    >
                        <Text style={styles.continueBtnText}>Devam Et</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginLinkContainer}>
                    <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={styles.loginLink}>Giriş Yap</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    glowBlob: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        opacity: 0.15,
    },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 28,
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    roleCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    roleCardSelected: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    roleIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    roleTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4,
    },
    roleDesc: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    },
    checkBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    professionSection: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    professionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    professionCard: {
        width: (width - 48 - 24) / 3,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.08)',
        position: 'relative',
    },
    professionIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    professionImage: {
        width: 36,
        height: 36,
    },
    professionName: {
        fontFamily: fonts.semiBold,
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },
    professionCheck: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueBtn: {
        marginBottom: 24,
    },
    continueBtnDisabled: {
        opacity: 0.5,
    },
    continueBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
    },
    continueBtnText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#FFFFFF',
    },
    loginLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    loginText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    loginLink: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: '#7C3AED',
    },
});
