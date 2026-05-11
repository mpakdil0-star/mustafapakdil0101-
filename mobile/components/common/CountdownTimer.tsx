import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  size?: 'small' | 'large';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  onExpired,
  size = 'small',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpired) onExpired();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });

      // If less than 1 hour, pulse animation
      if (days === 0 && hours === 0) {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.7, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
      }
    };

    calculateTimeLeft(); // Initial calculation
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired, pulseAnim]);

  if (timeLeft.isExpired) {
    return (
      <View style={[styles.container, size === 'large' && styles.containerLarge]}>
        <View style={[styles.badge, styles.expiredBadge]}>
          <Ionicons name="time" size={size === 'large' ? 14 : 12} color="#EF4444" />
          <Text style={[styles.badgeText, { color: '#EF4444' }, size === 'large' && styles.badgeTextLarge]}>
            SÜRESİ DOLDU
          </Text>
        </View>
      </View>
    );
  }

  const isCritical = timeLeft.days === 0 && timeLeft.hours < 24;
  const isVeryCritical = timeLeft.days === 0 && timeLeft.hours === 0;

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <View style={[styles.container, size === 'large' && styles.containerLarge]}>
      <Animated.View style={[
        styles.badge,
        isCritical ? styles.criticalBadge : styles.activeBadge,
        isVeryCritical && { opacity: pulseAnim }
      ]}>
        <Ionicons 
          name="time" 
          size={size === 'large' ? 14 : 12} 
          color={isCritical ? '#DC2626' : colors.primary} 
        />
        <Text style={[
          styles.badgeText, 
          isCritical ? { color: '#DC2626' } : { color: colors.primary },
          size === 'large' && styles.badgeTextLarge
        ]}>
          SÜRELİ FİYATLANDIRMA
        </Text>
      </Animated.View>

      <View style={styles.timerBox}>
        {timeLeft.days > 0 ? (
          <Text style={[styles.timerText, size === 'large' && styles.timerTextLarge]}>
            {timeLeft.days} Gün Kaldı
          </Text>
        ) : (
          <Text style={[styles.timerText, size === 'large' && styles.timerTextLarge]}>
            {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    gap: 4,
  },
  containerLarge: {
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: colors.primary + '15',
  },
  criticalBadge: {
    backgroundColor: '#FEF2F2',
  },
  expiredBadge: {
    backgroundColor: '#FEF2F2',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  badgeTextLarge: {
    fontSize: 10,
  },
  timerBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: '#334155',
  },
  timerTextLarge: {
    fontSize: 14,
  },
});
