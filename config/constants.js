import { lightColors } from '../theme/tokens'

export const COLORS = {
  primary: lightColors.primary,
  secondary: '#0D47A1',
  accent: '#42A5F5',
  danger: lightColors.error,
  warning: '#FB8C00',
  success: '#43A047',
  white: lightColors.surface,
  black: '#000000',
  gray: lightColors.muted,
  lightGray: '#F5F5F5',
  background: lightColors.background,
}

export const TRACKING = {
  DEVIATION_RADIUS_METERS: 100,
  STOPPED_ALERT_MINUTES: 5,
  UPDATE_INTERVAL_MS: 5000,
}

export const ROLES = {
  PARENT: 'PARENT',
  ADMIN: 'ADMIN',
}

export const STORAGE_KEYS = {
  TOKEN: '@gps_guardian_token',
  USER: '@gps_guardian_user',
  ROLE: '@gps_guardian_role',
}
