export const colors = {
  background: '#FBFAFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F6F3FF',
  surfaceMuted: '#F0ECFA',
  surfaceGlass: 'rgba(255, 255, 255, 0.25)',
  primary: '#7C2DFF',
  primaryDark: '#3B08D9',
  primaryLight: '#B66CFF',
  primarySoft: '#EEE6FF',
  text: '#050B33',
  textMuted: '#8C8AA8',
  textSoft: '#A9A6C0',
  icon: '#77749D',
  border: '#ECE8F5',
  success: '#22C55E',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  overlay: 'rgba(5, 11, 51, 0.42)',
  overlayStrong: 'rgba(5, 11, 51, 0.62)',
  white: '#FFFFFF',
};

export const gradients = {
  mission: ['#9861FF', '#7B61FF'],
  primary: [colors.primaryLight, colors.primary],
  primaryDeep: ['#C13BFF', colors.primary, colors.primaryDark],
  danger: ['#FF6B8A', colors.danger],
  warning: ['#FBBF24', colors.warning],
  soft: [colors.white, colors.surfaceSoft],
  surface: [colors.white, colors.surfaceSoft],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
  },
  button: {
    fontSize: 16,
    fontWeight: '700',
  },
};

export const shadows = {
  soft: {
    shadowColor: '#7F6FB2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  card: {
    shadowColor: '#7F6FB2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const theme = {
  colors,
  gradients,
  spacing,
  radii,
  typography,
  shadows,
};
