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

  const isLight = colors.background === '#FFFFFF' || colors.background === '#F8FAFC';

  const cardStyles: any[] = [
    styles.card,
    { 
      padding: paddingValue, 
      backgroundColor: colors.surface,
      borderColor: isLight ? 'rgba(13, 148, 136, 0.08)' : 'rgba(255, 255, 255, 0.08)',
      borderRadius: spacing.radius.xl,
    },
    elevated && [
      styles.elevated, 
      { 
        shadowColor: isLight ? colors.primary : '#000000',
        shadowOpacity: isLight ? 0.06 : 0.28,
        shadowRadius: 16,
      }
    ],
    variant === 'outlined' && [styles.outlined, { borderColor: colors.border }],
    variant === 'glass' && {
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(30, 41, 59, 0.82)',
      borderColor: isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.06)',
      borderWidth: 1.5,
    },
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  elevated: {
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
  },
});
