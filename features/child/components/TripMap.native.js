import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text } from 'react-native-paper';
import { useTheme } from '../../../contexts/ThemeContext';
import { AppSpacing, AppTypography } from '../../../theme/tokens';

export default function TripMap({ coordinates = [] }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const last = coordinates[coordinates.length - 1];
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    || Constants.expoConfig?.android?.config?.googleMaps?.apiKey
    || '';

  if (!last) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="map-marker-path" size={28} color={colors.primary} />
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>El mapa aparecerá cuando haya coordenadas del trayecto.</Text>
      </View>
    );
  }

  if (!mapsKey) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="map-alert-outline" size={28} color={colors.error} />
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Google Maps no está configurado en esta build.</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: last.latitude,
        longitude: last.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      accessibilityLabel="Mapa del trayecto actual"
    >
      <Polyline coordinates={coordinates} strokeColor={colors.primary} strokeWidth={4} />
      <Marker coordinate={last} title="Ubicación actual" />
    </MapView>
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
