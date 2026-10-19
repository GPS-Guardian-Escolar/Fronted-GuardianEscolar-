import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppSpacing, AppTypography } from '../../theme/tokens';

export default function AppEmptyState({ icon = 'information-outline', title, description, action }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={64} color={colors.border} />
      <Text style={[styles.title, AppTypography.lg, { color: colors.text }]}>{title}</Text>
      {!!description && <Text style={[styles.description, AppTypography.sm, { color: colors.textSecondary }]}>{description}</Text>}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: AppSpacing.sm,
    justifyContent: 'center',
    padding: AppSpacing.xl,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
});
