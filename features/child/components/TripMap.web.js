import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../../contexts/ThemeContext';
import { AppSpacing, AppTypography } from '../../../theme/tokens';

export default function TripMap() {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <MaterialCommunityIcons name="map-marker-path" size={28} color={colors.primary} />
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>El mapa del trayecto está disponible en la app móvil.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: AppSpacing.sm,
    justifyContent: 'center',
    marginBottom: AppSpacing.md,
    minHeight: 160,
    padding: AppSpacing.md,
  },
  placeholderText: {
    ...AppTypography.sm,
    textAlign: 'center',
  },
});
