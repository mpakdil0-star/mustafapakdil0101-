import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  View,
  StyleProp,
} from 'react-native';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';

import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  onPressIn?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  onPressIn,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}) => {
  const colors = useAppColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    onPressIn?.();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isElectrician = colors.background !== '#FFFFFF';

  const buttonStyles = [
    styles.button,
    variant === 'primary' && [styles.primary, { backgroundColor: colors.primary, shadowColor: colors.primary }],
    variant === 'secondary' && [styles.secondary, { backgroundColor: colors.secondary, shadowColor: colors.secondary }],
    variant === 'success' && [styles.success, { backgroundColor: colors.success, shadowColor: colors.success }],
    variant === 'danger' && [styles.danger, { backgroundColor: colors.error, shadowColor: colors.error }],
    variant === 'outline' && [styles.outline, { borderColor: colors.primary, backgroundColor: isElectrician ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.4)' }],
    variant === 'text' && styles.text,
    styles[`size_${size}` as keyof typeof styles],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ] as StyleProp<ViewStyle>;

  const textStyles = [
    styles.text,
    styles[`text_${variant}` as keyof typeof styles],
    variant === 'outline' && { color: colors.primary },
    variant === 'text' && { color: colors.primary },
    styles[`textSize_${size}` as keyof typeof styles],
    textStyle,
  ] as StyleProp<TextStyle>;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator
          color={(variant === 'primary' || variant === 'secondary' || variant === 'success' || variant === 'danger') ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && icon}
          <Text style={textStyles as any}>{title}</Text>
        </>
      )}
    </>
  );

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : 'auto' }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={{ width: fullWidth ? '100%' : 'auto' }}
      >
        {variant === 'primary' && !disabled ? (
          <LinearGradient
            colors={colors.primaryGradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={buttonStyles}
          >
            {renderContent()}
          </LinearGradient>
        ) : (
          <View style={buttonStyles}>
            {renderContent()}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
  },

  // Variants
  primary: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  secondary: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  success: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  danger: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  outline: {
    borderWidth: 1.5,
  },
  text: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },

  // Sizes - Modern & Balanced with spacing radius tokens
  size_small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: spacing.radius.sm,
  },
  size_medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: spacing.radius.md,
  },
  size_large: {
    paddingVertical: 14,
    paddingHorizontal: 26,
    minHeight: 54,
    borderRadius: spacing.radius.lg,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.5,
  },

  // Text styles - Refined Typography
  text_primary: {
    fontFamily: fonts.bold,
    color: staticColors.white,
    letterSpacing: -0.2,
  },
  text_secondary: {
    fontFamily: fonts.bold,
    color: staticColors.white,
    letterSpacing: -0.2,
  },
  text_success: {
    fontFamily: fonts.bold,
    color: staticColors.white,
  },
  text_danger: {
    fontFamily: fonts.bold,
    color: staticColors.white,
  },
  text_outline: {
    fontFamily: fonts.bold,
  },
  text_text: {
    fontFamily: fonts.bold,
  },

  textSize_small: {
    fontSize: 13,
  },
  textSize_medium: {
    fontSize: 15,
  },
  textSize_large: {
    fontSize: 16,
  },
});
