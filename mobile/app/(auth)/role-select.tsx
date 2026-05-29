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
            colors={['#091321', '#061D24', '#040B14']}
            style={styles.container}
        >
            {/* Soft Ambient Light Blobs */}
            <View style={[styles.glowBlob, { top: -60, left: -60, backgroundColor: '#0D9488', opacity: 0.12 }]} />
            <View style={[styles.glowBlob, { bottom: -80, right: -80, backgroundColor: '#3B82F6', opacity: 0.1 }]} />

            <View style={styles.content}>
                {/* Upper Section */}
                <View style={{ flex: 1 }}>
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={20} color="#E2E8F0" />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Nasıl Kayıt Olacaksınız?</Text>
                        <Text style={styles.subtitle}>Devam etmek için bir rol belirleyin</Text>
                    </View>

                    {/* Role Cards Container */}
                    <View style={styles.roleContainer}>
                        {/* Vatandaş (Citizen) Card */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                userType === 'CITIZEN' && styles.roleCardSelected,
                                userType === 'CITIZEN' && { borderColor: '#0D9488', shadowColor: '#0D9488' },
                            ]}
                            onPress={() => {
                                setUserType('CITIZEN');
                                setServiceCategory(null);
                            }}
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    styles.roleIconBg,
                                    userType === 'CITIZEN' 
                                        ? { backgroundColor: '#0D9488' } 
                                        : { backgroundColor: 'rgba(255,255,255,0.06)' }
                                ]}
                            >
                                <Ionicons name="person-outline" size={26} color={userType === 'CITIZEN' ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
                            </View>
                            <Text style={[styles.roleTitle, userType === 'CITIZEN' && { color: '#FFF' }]}>Vatandaş</Text>
                            <Text style={styles.roleDesc}>Hizmet almak istiyorum</Text>
                            
                            {userType === 'CITIZEN' && (
                                <View style={[styles.checkBadge, { backgroundColor: '#0D9488' }]}>
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Usta (Professional) Card */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                userType === 'ELECTRICIAN' && styles.roleCardSelected,
                                userType === 'ELECTRICIAN' && { borderColor: '#3B82F6' },
                            ]}
                            onPress={() => setUserType('ELECTRICIAN')}
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    styles.roleIconBg,
                                    userType === 'ELECTRICIAN' 
                                        ? { backgroundColor: '#3B82F6' } 
                                        : { backgroundColor: 'rgba(255,255,255,0.06)' }
                                ]}
                            >
                                <Ionicons name="construct-outline" size={26} color={userType === 'ELECTRICIAN' ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
                            </View>
                            <Text style={[styles.roleTitle, userType === 'ELECTRICIAN' && { color: '#FFF' }]}>Usta</Text>
                            <Text style={styles.roleDesc}>Hizmet vermek istiyorum</Text>
                            
                            {userType === 'ELECTRICIAN' && (
                                <View style={[styles.checkBadge, { backgroundColor: '#3B82F6' }]}>
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Profession Selection (Visible when Usta is selected) */}
                    {userType === 'ELECTRICIAN' && (
                        <View style={styles.professionSection}>
                            <View style={styles.sectionHeaderRow}>
                                <Ionicons name="sparkles" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                                <Text style={styles.sectionLabel}>Uzmanlık Alanınızı Seçin</Text>
                            </View>
                            
                            <View style={styles.professionGrid}>
                                {SERVICE_CATEGORIES.map((cat: ServiceCategory) => {
                                    const isSelected = serviceCategory === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.professionCard,
                                                isSelected && { 
                                                    borderColor: cat.colors[0], 
                                                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                                                },
                                            ]}
                                            onPress={() => setServiceCategory(cat.id)}
                                            activeOpacity={0.85}
                                        >
                                            {isSelected ? (
                                                <View
                                                    style={[
                                                        styles.professionIconBgSelected,
                                                        { backgroundColor: cat.colors[0] }
                                                    ]}
                                                >
                                                    <Ionicons 
                                                        name={cat.icon as any} 
                                                        size={26} 
                                                        color="#FFFFFF" 
                                                    />
                                                </View>
                                            ) : (
                                                <View style={styles.professionIconBgUnselected}>
                                                    <Ionicons 
                                                        name={cat.icon as any} 
                                                        size={26} 
                                                        color={cat.colors[0]} 
                                                    />
                                                </View>
                                            )}

                                            <Text style={[
                                                styles.professionName,
                                                isSelected && { color: '#FFFFFF', fontFamily: fonts.bold }
                                            ]}>
                                                {cat.name}
                                            </Text>
                                            {isSelected && (
                                                <View style={[styles.professionCheck, { backgroundColor: cat.colors[0] }]}>
                                                    <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>

                {/* Bottom Action Area */}
                <View style={styles.bottomArea}>
                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[
                            styles.continueBtn,
                            !canProceed && styles.continueBtnDisabled,
                        ]}
                        onPress={handleContinue}
                        disabled={!canProceed}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={canProceed ? (userType === 'CITIZEN' ? ['#0D9488', '#0D9488'] : ['#3B82F6', '#1D4ED8']) : ['#334155', '#1E293B']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.continueBtnGradient}
                        >
                            <Text style={styles.continueBtnText}>Devam Et</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Login Navigation Link */}
                    <View style={styles.loginLinkContainer}>
                        <Text style={styles.loginText}>Zaten bir hesabınız var mı? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
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
        width: 250,
        height: 250,
        borderRadius: 125,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 52 : 36,
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 26,
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 20,
    },
    roleCard: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.07)',
        position: 'relative',
    },
    roleCardSelected: {
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderWidth: 2,
    },
    roleIconBg: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    roleTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 2,
    },
    roleDesc: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        lineHeight: 14,
    },
    checkBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    professionSection: {
        marginBottom: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionLabel: {
        fontFamily: fonts.bold,
        fontSize: 12.5,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    professionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    professionCard: {
        width: (width - 40 - 20) / 3, // dynamic calculate 3-column grid width
        backgroundColor: 'rgba(15, 23, 42, 0.3)', // Beautiful dark glassmorphic card base background!
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.06)', // Beautiful thin border for unselected card!
        position: 'relative',
    },
    professionIconBgSelected: {
        width: 44,
        height: 44,
        borderRadius: 22, // Perfect circle!
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        overflow: 'hidden', // Crucial fix for Android LinearGradient black square overflow bug!
    },
    professionIconBgUnselected: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: 'transparent', // Transparent unselected background!
    },
    professionName: {
        fontFamily: fonts.semiBold,
        fontSize: 10.5,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
    professionCheck: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomArea: {
        gap: 12,
    },
    continueBtn: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    continueBtnDisabled: {
        opacity: 0.35,
    },
    continueBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    continueBtnText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#FFFFFF',
    },
    loginLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 2,
    },
    loginText: {
        fontFamily: fonts.medium,
        fontSize: 13.5,
        color: 'rgba(255,255,255,0.4)',
    },
    loginLink: {
        fontFamily: fonts.bold,
        fontSize: 13.5,
        color: '#0D9488',
        textDecorationLine: 'underline',
    },
});
