import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../../contexts/ThemeContext';
import { AppSpacing, AppTypography } from '../../../theme/tokens';
import SafeMap from '../../../components/SafeMap';

export default function TripMap({ coordinates = [] }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const last = coordinates[coordinates.length - 1];

  if (last) {
    return (
      <SafeMap
        currentLocation={last}
        initialRegion={{ latitude: last.latitude, longitude: last.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        journeyCoordinates={coordinates}
        style={styles.map}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <MaterialCommunityIcons name="map-marker-path" size={28} color={colors.primary} />
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>El mapa aparecerá cuando haya coordenadas del trayecto.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: 12,
    height: 220,
    marginBottom: AppSpacing.md,
    overflow: 'hidden',
  },
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
