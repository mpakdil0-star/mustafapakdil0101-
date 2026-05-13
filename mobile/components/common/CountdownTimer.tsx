import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  size?: 'small' | 'large';
  minimal?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  onExpired,
  size = 'small',
  minimal = false,
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
      const targetDate = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (isNaN(targetDate) || difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpired && !isNaN(targetDate)) onExpired();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });

      if (days === 0 && hours === 0) {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
      } else {
        pulseAnim.setValue(1);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  if (timeLeft.isExpired) {
    if (isNaN(new Date(expiresAt).getTime())) return null; // Don't show anything for invalid dates
    return (
      <View style={[styles.container, size === 'large' && styles.containerLarge]}>
        <View style={[styles.badge, styles.expiredBadge]}>
          <Ionicons name="time" size={size === 'large' ? 12 : 10} color="#EF4444" />
          <Text style={[styles.badgeText, { color: '#EF4444' }, size === 'large' && styles.badgeTextLarge]}>
            SÜRESİ DOLDU
          </Text>
        </View>
      </View>
    );
  }

  const isCritical = timeLeft.days === 0 && timeLeft.hours < 24;

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  return (
    <View style={[styles.container, size === 'large' && styles.containerLarge]}>
      {!minimal && (
        <Animated.View style={[
          styles.badge,
          isCritical ? styles.criticalBadge : styles.activeBadge,
          { opacity: pulseAnim }
        ]}>
          <Ionicons 
            name="time" 
            size={size === 'large' ? 12 : 10} 
            color={isCritical ? '#DC2626' : colors.primary} 
          />
          <Text style={[
            styles.badgeText, 
            isCritical ? { color: '#DC2626' } : { color: colors.primary },
            size === 'large' && styles.badgeTextLarge
          ]}>
            SÜRELİ TEKLİF
          </Text>
        </Animated.View>
      )}

      <View style={[styles.timerBox, isCritical && { backgroundColor: '#FEF2F2' }, minimal && { backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 }]}>
        <Text style={[styles.timerText, size === 'large' && styles.timerTextLarge, isCritical && { color: '#DC2626' }, minimal && { fontSize: 10, fontFamily: fonts.bold }]}>
          {`${timeLeft.days} Gün ${formatNumber(timeLeft.hours)}:${formatNumber(timeLeft.minutes)}:${formatNumber(timeLeft.seconds)}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  containerLarge: {
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
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
    fontSize: 8,
    letterSpacing: 0.3,
  },
  badgeTextLarge: {
    fontSize: 9,
  },
  timerBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  timerText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: '#334155',
  },
  timerTextLarge: {
    fontSize: 13,
  },
});
