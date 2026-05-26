// Aurora Teal & Cyan Theme - Fresh, Reliable & Sophisticated 🌊✨ (For Citizens)
export const CITIZEN_COLORS = {
  // Core Teal Palette
  primary: '#0D9488',              // Teal 600 (Primary core)
  primaryDark: '#115E59',          // Teal 700 (Deep ocean)
  primaryLight: '#2DD4BF',         // Teal 400 (Bright mint/teal)
  primaryGradient: ['#0D9488', '#2DD4BF'] as [string, string],

  // Secondary Blue/Sky Shades
  secondary: '#0EA5E9',            // Sky 500
  secondaryDark: '#0284C7',        // Sky 600
  secondaryLight: '#38BDF8',       // Sky 400
  secondaryGradient: ['#0EA5E9', '#38BDF8'] as [string, string],

  // Spectrum Shades (Mapped for backward compatibility)
  amethystDeep: '#115E59',         // Deep teal for rich accents
  amethystMedium: '#0D9488',       // Teal primary
  amethystLight: '#2DD4BF',        // Mint/Teal highlight
  amethystPale: '#99F6E4',         // Pale mint
  amethystUltraLight: '#CCFBF1',   // Ultra light teal border

  // Backgrounds
  background: '#FFFFFF',
  backgroundLight: '#FAFAFA',
  backgroundDark: '#F0FDFA',       // Light teal-tinted white
  backgroundAmethyst: '#F0FDFA',   // Light teal tint
  surface: '#FFFFFF',
  surfaceElevated: '#F0FDFA',

  // Text
  text: '#0F172A',                 // Slate 900
  textSecondary: '#475569',        // Slate 600
  textLight: '#94A3B8',            // Slate 400
  textDisabled: '#CBD5E1',
  textInverse: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  error: '#F43F5E',                // Rose 500
  errorLight: '#FFE4E6',
  errorDark: '#E11D48',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',
  infoDark: '#0369A1',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  divider: '#E2E8F0',
  borderAccent: '#99F6E4',         // Mint accent
  borderAmethyst: 'rgba(45, 212, 191, 0.3)',  // Soft mint border

  // Shadows
  shadow: 'rgba(13, 148, 136, 0.12)',
  shadowDark: 'rgba(13, 148, 136, 0.22)',
  shadowLight: 'rgba(13, 148, 136, 0.06)',
  shadowAmethyst: 'rgba(13, 148, 136, 0.15)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  overlayAmethyst: 'rgba(13, 148, 136, 0.08)',

  // Job Status Colors
  jobOpen: '#0EA5E9',
  jobInProgress: '#0D9488',
  jobCompleted: '#10B981',
  jobCancelled: '#F43F5E',
  jobBidding: '#38BDF8',

  // Rating
  rating: '#F59E0B',
  ratingDark: '#D97706',

  // Accent Colors
  accent: '#06B6D4',
  accentLight: '#67E8F9',
  accentDark: '#0891B2',

  // Skeleton Loading
  skeleton: '#F0FDFA',
  skeletonHighlight: '#CCFBF1',

  // Glow Effects (Teal & Cyan Glows)
  glow: 'rgba(13, 148, 136, 0.2)',
  glowPurple: 'rgba(13, 148, 136, 0.25)',
  glowLavender: 'rgba(6, 182, 212, 0.2)',
  glowAmethyst: 'rgba(13, 148, 136, 0.3)',
  glowAmethystStrong: 'rgba(13, 148, 136, 0.5)',
  glowAmethystSoft: 'rgba(6, 182, 212, 0.15)',

  // Glassmorphism (Premium Glass Effects)
  glassPurple: 'rgba(6, 182, 212, 0.15)',
  glassAmethyst: 'rgba(13, 148, 136, 0.12)',
  glassWhitePurple: 'rgba(255, 255, 255, 0.92)',
  glassLavender: 'rgba(240, 253, 250, 0.85)',

  // Gradients
  gradientPrimary: ['#0D9488', '#2DD4BF'] as [string, string],
  gradientSecondary: ['#0EA5E9', '#38BDF8'] as [string, string],
  gradientDark: ['#115E59', '#0D9488'] as [string, string],
  gradientSuccess: ['#10B981', '#059669'] as [string, string],
  gradientError: ['#F43F5E', '#E11D48'] as [string, string],
  gradientLavender: ['#F0FDFA', '#FFFFFF'] as [string, string],
  gradientEmergency: ['#F43F5E', '#F97316'] as [string, string],

  // Advanced Gradients (Mapped to Teal/Cyan/Sky)
  gradientAmethystDark: ['#0F172A', '#115E59', '#0D9488'] as [string, string, string],
  gradientAmethystLight: ['#F0FDFA', '#CCFBF1', '#99F6E4'] as [string, string, string],
  gradientAmethystGlow: ['rgba(13, 148, 136, 0)', 'rgba(45, 212, 191, 0.2)', 'rgba(13, 148, 136, 0)'] as [string, string, string],
  gradientAmethystRich: ['#115E59', '#0D9488', '#0EA5E9', '#38BDF8'] as [string, string, string, string],
  gradientHeaderAmethyst: ['rgba(17, 94, 89, 0.85)', 'rgba(13, 148, 136, 0.95)'] as [string, string],

  // Base Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Midnight Amber & Gold Theme - Energetic, Light & Premium ⚡ (For Electricians)
export const ELECTRICIAN_COLORS = {
  // Core Gold/Amber Palette (Updated to Corporate Blue / COLOR_BRAND_BLUE)
  primary: '#0284C7',              // Brand Blue 600
  primaryDark: '#0369A1',          // Brand Blue 700
  primaryLight: '#38BDF8',
  primaryGradient: ['#0284C7', '#38BDF8'] as [string, string],

  // Light Theme Header Architecture Variables (Faz 25 RFC)
  headerLight: '#F0F4F8',
  textMain: '#1E293B',
  dividerLight: '#CBD5E1',
  brandBlue: '#0284C7',

  // Secondary Deep Charcoal Slate Shades (Corporate Navy / COLOR_PRIMARY_DARK)
  secondary: '#1E293B',            // Slate 800 (Header BG)
  secondaryDark: '#0F172A',        // Slate 900
  secondaryLight: '#334155',       // Slate 700
  secondaryGradient: ['#1E293B', '#334155'] as [string, string],

  // Spectrum Shades (Mapped for backward compatibility to Brand Blue)
  amethystDeep: '#0369A1',
  amethystMedium: '#0284C7',
  amethystLight: '#38BDF8',
  amethystPale: '#E0F2FE',
  amethystUltraLight: '#F0F9FF',

  // Backgrounds (Light & Clean)
  background: '#F8FAFC',           // COLOR_BG_MAIN (Clean slate 50 background)
  backgroundLight: '#FFFFFF',      // COLOR_CARD_WHITE (Pure White cards)
  backgroundDark: '#F1F5F9',       // Cool Gray
  backgroundAmethyst: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  text: '#0F172A',                 // Dark Slate (high contrast)
  textSecondary: '#64748B',        // COLOR_TEXT_MUTED
  textLight: '#94A3B8',            // Medium Gray
  textDisabled: '#CBD5E1',
  textInverse: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  error: '#F43F5E',
  errorLight: '#FFE4E6',
  errorDark: '#E11D48',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningDark: '#D97706',
  info: '#0EA5E9',
  infoLight: '#DBEAFE',
  infoDark: '#1E40AF',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  divider: '#E2E8F0',
  borderAccent: '#38BDF8',
  borderAmethyst: 'rgba(2, 132, 199, 0.2)',

  // Shadows (Soft depth shadows)
  shadow: 'rgba(0, 0, 0, 0.05)',
  shadowDark: 'rgba(0, 0, 0, 0.08)',
  shadowLight: 'rgba(0, 0, 0, 0.03)',
  shadowAmethyst: 'rgba(2, 132, 199, 0.08)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  overlayAmethyst: 'rgba(2, 132, 199, 0.05)',

  // Job Status Colors
  jobOpen: '#0EA5E9',
  jobInProgress: '#0284C7',
  jobCompleted: '#10B981',
  jobCancelled: '#F43F5E',
  jobBidding: '#38BDF8',

  // Rating
  rating: '#F59E0B',
  ratingDark: '#D97706',

  // Accent Colors (COLOR_TEAL_ACCENT)
  accent: '#0D9488',
  accentLight: '#2DD4BF',
  accentDark: '#115E59',

  // Skeleton Loading
  skeleton: '#F1F5F9',
  skeletonHighlight: '#E2E8F0',

  // Glow Effects (Blue/Teal Glows)
  glow: 'rgba(2, 132, 199, 0.08)',
  glowPurple: 'rgba(2, 132, 199, 0.1)',
  glowLavender: 'rgba(2, 132, 199, 0.08)',
  glowAmethyst: 'rgba(2, 132, 199, 0.12)',
  glowAmethystStrong: 'rgba(2, 132, 199, 0.2)',
  glowAmethystSoft: 'rgba(2, 132, 199, 0.05)',

  // Glassmorphism (Light Gold Glass Effects)
  glassPurple: 'rgba(2, 132, 199, 0.06)',
  glassAmethyst: 'rgba(2, 132, 199, 0.05)',
  glassWhitePurple: 'rgba(255, 255, 255, 0.95)',
  glassLavender: 'rgba(255, 255, 255, 0.85)',

  // Gradients
  gradientPrimary: ['#0284C7', '#38BDF8'] as [string, string],       // Blue Gradient
  gradientSecondary: ['#1E293B', '#0F172A'] as [string, string],     // Charcoal Gradient
  gradientDark: ['#1E293B', '#0F172A'] as [string, string],          // Charcoal Gradient
  gradientSuccess: ['#10B981', '#059669'] as [string, string],
  gradientError: ['#F43F5E', '#E11D48'] as [string, string],
  gradientLavender: ['#F8FAFC', '#FFFFFF'] as [string, string],
  gradientEmergency: ['#F43F5E', '#C2410C'] as [string, string],

  // Advanced Gradients (Mapped to Gold and Charcoal)
  gradientAmethystDark: ['#1E293B', '#0F172A', '#020617'] as [string, string, string],
  gradientAmethystLight: ['#FFFFFF', '#F8FAFC', '#F1F5F9'] as [string, string, string],
  gradientAmethystGlow: ['rgba(2, 132, 199, 0)', 'rgba(56, 189, 248, 0.08)', 'rgba(2, 132, 199, 0)'] as [string, string, string],
  gradientAmethystRich: ['#0369A1', '#0284C7', '#38BDF8', '#E0F2FE'] as [string, string, string, string],
  gradientHeaderAmethyst: ['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.98)'] as [string, string],

  // Base Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Default export for backward compatibility
export const colors = CITIZEN_COLORS;

export const getThemeColors = (userType?: string) => {
  return userType === 'ELECTRICIAN' ? ELECTRICIAN_COLORS : CITIZEN_COLORS;
};


