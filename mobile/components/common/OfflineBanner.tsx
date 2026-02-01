import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useEffect, useRef } from 'react';

/**
 * Banner component that appears when device is offline
 * Slides down from top when offline, slides up when back online
 */
export const OfflineBanner: React.FC = () => {
    const { isOffline } = useNetworkStatus();
    const slideAnim = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isOffline ? 0 : -60,
            duration: 300,
            useNativeDriver: true
        }).start();
    }, [isOffline, slideAnim]);

    // Always render, animation handles visibility

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] }
            ]}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline-outline" size={18} color={colors.white} />
                <Text style={styles.text}>İnternet bağlantınız yok</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444',
        paddingTop: 50, // Account for status bar
        paddingBottom: 12,
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    text: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.white
    }
});

export default OfflineBanner;
