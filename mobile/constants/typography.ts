import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

// Font family names for use in styles
export const fonts = {
  thin: 'Inter_100Thin',
  extraLight: 'Inter_200ExtraLight',
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};

// Font files for loading
export const fontFiles = {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
};

// Typography - Premium Dynamic Design Theme
export const typography = {
  // Font Sizes - Premium Scale
  h1: 28,          // Page titles
  h2: 24,          // Section titles
  h3: 20,          // Card titles
  h4: 18,          // Sub-headers

  large: 16,       // Large body text
  body: 14,        // Normal body text
  small: 12,       // Small text
  tiny: 11,        // Captions, labels

  // Line Heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.7,

  // Legacy Object Structure (keeping for compatibility with existing styles)
  h1Style: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  h2Style: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h3Style: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  h4Style: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body1: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body2: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  button: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.1,
  }
};
