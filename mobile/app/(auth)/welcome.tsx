import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Dimensions,
    TouchableOpacity,
    Animated,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppDispatch } from '../../hooks/redux';
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 38,
        color: colors.white,
        letterSpacing: -1.5,
        textShadowColor: 'rgba(124, 58, 237, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 8,
    },
    buttonSection: {
        width: '100%',
    },
    mainButton: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    glassCard: {
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
    },
    citizenBorder: {
        borderColor: 'rgba(124, 58, 237, 0.3)',
    },
    electricianBorder: {
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        gap: 16,
    },
    buttonIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.white,
        marginBottom: 2,
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    buttonSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },
    authContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    loginButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    loginText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontFamily: 'Inter-Medium',
    },
    registerButton: {
        flex: 1,
        marginLeft: 8,
    },
    registerGradient: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    registerText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },
});
