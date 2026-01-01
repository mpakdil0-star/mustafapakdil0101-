import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Animated, StyleProp } from 'react-native';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { useAppSelector } from '../../hooks/redux';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
  variant?: 'default' | 'outlined' | 'accent' | 'glass';
  accentColor?: string;
  padding?: keyof typeof spacing | number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = true,
  variant = 'default',
  accentColor,
  padding = 'cardPadding',
}) => {
  const colors = useAppColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const finalAccentColor = accentColor || colors.primary;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const paddingValue = typeof padding === 'string' ? (spacing[padding] as any) : padding;

  const { user } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN';

  const cardStyles: any[] = [
    styles.card,
    { padding: paddingValue, borderColor: isElectrician ? 'rgba(255, 255, 255, 0.8)' : (colors as any).borderAmethyst || 'rgba(167, 139, 250, 0.3)' },
    elevated && [styles.elevated, { shadowColor: isElectrician ? colors.primary : (colors as any).shadowAmethyst || colors.primary }],
    variant === 'outlined' && [styles.outlined, { borderColor: colors.borderLight }],
    variant === 'glass' && [styles.glass, !isElectrician && { backgroundColor: (colors as any).glassWhitePurple || 'rgba(255, 255, 255, 0.92)' }],
    variant === 'accent' && [styles.accent, { borderLeftColor: finalAccentColor }],
    style,
  ];

  const content = (
    <View style={cardStyles as StyleProp<ViewStyle>}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {content}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: staticColors.white,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  elevated: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 1)',
    borderWidth: 1.5,
  },
  outlined: {
    borderWidth: 1.5,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  accent: {
    borderLeftWidth: 5,
    borderRadius: 24,
  },
});
