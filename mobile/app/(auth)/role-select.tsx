import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { SERVICE_CATEGORIES, ServiceCategory } from '../../constants/serviceCategories';

const { width } = Dimensions.get('window');

export default function RoleSelectScreen() {
    const router = useRouter();
    const { initialRole, redirectTo } = useLocalSearchParams<{ 
        initialRole?: 'CITIZEN' | 'ELECTRICIAN',
        redirectTo?: string 
    }>();
    const [userType, setUserType] = useState<'CITIZEN' | 'ELECTRICIAN' | null>(initialRole || null);
    const [serviceCategory, setServiceCategory] = useState<string | null>(null);

    const canProceed = userType === 'CITIZEN' || (userType === 'ELECTRICIAN' && serviceCategory);

    const handleContinue = () => {
        if (!canProceed) return;

        router.push({
            pathname: '/(auth)/register',
            params: {
                initialRole: userType,
                type: userType, // Compatibility with updated register screen
                serviceCategory: serviceCategory || undefined,
                redirectTo: redirectTo || undefined
            },
        });
    };

    return (
        <LinearGradient
            colors={['#07111E', '#09252A', '#07111E']}
            style={styles.container}
        >
            {/* Glow Blobs */}
            <View style={[styles.glowBlob, { top: -80, left: -80, backgroundColor: '#0D9488' }]} />
            <View style={[styles.glowBlob, { bottom: -100, right: -100, backgroundColor: '#4682B4', opacity: 0.15 }]} />

            <View style={styles.content}>
                {/* Upper Area */}
                <View style={{ flex: 1 }}>
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
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
                                userType === 'CITIZEN' && { borderColor: '#0D9488' },
                            ]}
                            onPress={() => {
                                setUserType('CITIZEN');
                                setServiceCategory(null);
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={userType === 'CITIZEN' ? ['#0D9488', '#0EA5E9'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                style={styles.roleIconBg}
                            >
                                <Ionicons name="person" size={28} color={userType === 'CITIZEN' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                            </LinearGradient>
                            <Text style={[styles.roleTitle, userType === 'CITIZEN' && { color: '#FFFFFF' }]}>Vatandaş</Text>
                            <Text style={styles.roleDesc}>Hizmet almak istiyorum</Text>
                            {userType === 'CITIZEN' && (
                                <View style={[styles.checkBadge, { backgroundColor: '#0D9488' }]}>
                                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Usta Card */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                userType === 'ELECTRICIAN' && styles.roleCardSelected,
                                userType === 'ELECTRICIAN' && { borderColor: '#4682B4' },
                            ]}
                            onPress={() => setUserType('ELECTRICIAN')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={userType === 'ELECTRICIAN' ? ['#4682B4', '#2E5C8A'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                style={styles.roleIconBg}
                            >
                                <Ionicons name="construct" size={28} color={userType === 'ELECTRICIAN' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
                            </LinearGradient>
                            <Text style={[styles.roleTitle, userType === 'ELECTRICIAN' && { color: '#FFFFFF' }]}>Usta</Text>
                            <Text style={styles.roleDesc}>Hizmet vermek istiyorum</Text>
                            {userType === 'ELECTRICIAN' && (
                                <View style={[styles.checkBadge, { backgroundColor: '#4682B4' }]}>
                                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
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
                                            serviceCategory === cat.id && { borderColor: cat.colors[0], backgroundColor: cat.colors[0] + '15' },
                                        ]}
                                        onPress={() => setServiceCategory(cat.id)}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={serviceCategory === cat.id 
                                                ? [`${cat.colors[0]}25`, `${cat.colors[1]}35`] 
                                                : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
                                            style={styles.professionIconBg}
                                        >
                                            <Ionicons 
                                                name={cat.icon as any} 
                                                size={22} 
                                                color={serviceCategory === cat.id ? '#FFFFFF' : cat.colors[0]} 
                                            />
                                        </LinearGradient>

                                        <Text style={[
                                            styles.professionName,
                                            serviceCategory === cat.id && { color: '#FFFFFF', fontFamily: fonts.bold }
                                        ]}>
                                            {cat.name}
                                        </Text>
                                        {serviceCategory === cat.id && (
                                            <View style={[styles.professionCheck, { backgroundColor: cat.colors[0] }]}>
                                                <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {/* Bottom Action Area */}
                <View style={{ gap: 8 }}>
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
                            colors={canProceed ? (userType === 'CITIZEN' ? ['#0D9488', '#0EA5E9'] : ['#4682B4', '#2E5C8A']) : ['#374151', '#374151']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.continueBtnGradient}
                        >
                            <Text style={styles.continueBtnText}>Devam Et</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={styles.loginLinkContainer}>
                        <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.loginLink}>Giriş Yap</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 35,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
        justifyContent: 'space-between',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 24,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    roleCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.08)',
        position: 'relative',
    },
    roleCardSelected: {
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    roleIconBg: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 2,
    },
    roleDesc: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    professionSection: {
        marginBottom: 12,
    },
    sectionLabel: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    professionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    professionCard: {
        width: (width - 40 - 16) / 3, // Subtract horizontal padding (40) and gap (16)
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
        position: 'relative',
    },
    professionIconBg: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    professionName: {
        fontFamily: fonts.semiBold,
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },
    professionCheck: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueBtn: {
        marginBottom: 4,
    },
    continueBtnDisabled: {
        opacity: 0.4,
    },
    continueBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
        borderRadius: 14,
    },
    continueBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: '#FFFFFF',
    },
    loginLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 4,
    },
    loginText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
    },
    loginLink: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: '#0D9488',
    },
});

