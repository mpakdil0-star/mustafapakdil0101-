export const spacing = {
  // Base spacing - Ultra Compact
  xs: 2,
  sm: 3,
  md: 6,
  lg: 10,
  xl: 14,
  xxl: 20,
  xxxl: 28,

  // Specific spacing - Ultra Compact
  screenPadding: 12,
  cardPadding: 10,
  inputPadding: 8,
  buttonPadding: 8,
  sectionGap: 12,
  itemGap: 6,

  // Border radius - Modern Softer Corners
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    round: 9999,
  },

  // Shadows - Sleek depth with softer gradients
  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};
