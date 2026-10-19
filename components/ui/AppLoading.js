import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppSpacing, AppTypography } from '../../theme/tokens';

export default function AppLoading({ message }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!!message && <Text style={[AppTypography.sm, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: AppSpacing.md,
    justifyContent: 'center',
    padding: AppSpacing.lg,
  },
});
