import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppRadius, AppSpacing, AppTouch, AppTypography } from '../../theme/tokens';

const sizes = {
  sm: { minHeight: AppTouch.min, paddingHorizontal: AppSpacing.md, text: AppTypography.sm },
  md: { minHeight: 52, paddingHorizontal: AppSpacing.lg, text: AppTypography.md },
  lg: { minHeight: 56, paddingHorizontal: AppSpacing.xl, text: AppTypography.md },
};

export default function AppButton({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const sizeStyle = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      color: colors.textOnPrimary,
    },
    secondary: {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.border,
      color: colors.text,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: colors.primary,
    },
    danger: {
      backgroundColor: colors.error,
      borderColor: colors.error,
      color: colors.onError || colors.textOnPrimary,
    },
  }[variant] || {};

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: sizeStyle.minHeight,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: isDisabled ? 0.54 : pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.color} /> : (
        <Text style={[styles.label, sizeStyle.text, { color: palette.color }, textStyle]}>
          {title || children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
