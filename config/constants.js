import { lightColors } from '../theme/tokens'
import { palette } from '../theme/colors'

export const COLORS = {
  primary: lightColors.primary,
  secondary: palette.blue900,
  accent: palette.blue700,
  danger: lightColors.error,
  warning: '#1A4F8A',
  success: palette.green500,
  white: lightColors.surface,
  black: '#000000',
  gray: lightColors.muted,
  lightGray: palette.slate100,
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
