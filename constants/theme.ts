import { Platform } from 'react-native';

export const Colors = {
  cream: '#F7F4EF',
  white: '#FFFFFF',
  textPrimary: '#1A1814',
  textSecondary: '#6B6560',
  textMuted: '#A09A94',
  border: '#E8E3DC',

  done: '#3D7A5E',
  doneLight: '#E8F3ED',
  tiny: '#5B9E8A',
  tinyLight: '#E5F4F0',
  momentum: '#3E6FA3',
  momentumLight: '#E8EFF8',
  missed: '#B85450',
  missedLight: '#F5E8E8',
  rest: '#7B6FA0',
  restLight: '#EEE9F8',
  skip: '#9E9E9E',
  skipLight: '#F0F0F0',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Shadows = {
  card: {
    shadowColor: '#1A1814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardOuter: {
    shadowColor: '#1A1814',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  sheet: {
    shadowColor: '#1A1814',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 100,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
