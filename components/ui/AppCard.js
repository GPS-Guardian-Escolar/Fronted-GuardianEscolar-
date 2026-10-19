import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppElevation, AppRadius, AppSpacing } from '../../theme/tokens';

export default function AppCard({ children, style, padding = 'md', elevation = 'sm' }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: AppSpacing[padding] ?? AppSpacing.md,
          elevation: AppElevation[elevation] ?? AppElevation.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
