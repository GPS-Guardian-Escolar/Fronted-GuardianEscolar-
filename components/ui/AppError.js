import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { AppSpacing, AppTypography } from '../../theme/tokens';
import AppButton from './AppButton';

export default function AppError({ message, onRetry }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.error} />
      <Text style={[styles.message, AppTypography.md, { color: colors.text }]}>{message}</Text>
      {!!onRetry && <AppButton title="Reintentar" variant="secondary" onPress={onRetry} accessibilityLabel="Reintentar" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: AppSpacing.md,
    justifyContent: 'center',
    padding: AppSpacing.xl,
  },
  message: {
    textAlign: 'center',
  },
});
