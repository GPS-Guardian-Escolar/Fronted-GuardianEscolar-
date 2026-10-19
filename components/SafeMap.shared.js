import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { COLORS } from '../constants/colors';

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  || Constants.expoConfig?.android?.config?.googleMaps?.apiKey
  || Constants.expoConfig?.ios?.config?.googleMapsApiKey
  || '';

export const DEFAULT_REGION = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export function normalizeCoordinate(value) {
  if (!value) return null;
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function normalizeRegion(initialRegion, currentLocation, markers = []) {
  const markerCoordinate = markers.map(normalizeCoordinate).find(Boolean);
  const center = normalizeCoordinate(currentLocation)
    || normalizeCoordinate(initialRegion)
    || markerCoordinate
    || DEFAULT_REGION;

  return {
    ...DEFAULT_REGION,
    ...initialRegion,
    latitude: center.latitude,
    longitude: center.longitude,
  };
}

export function normalizeMarkers(markers = []) {
  return markers
    .map((marker, index) => {
      const coordinate = normalizeCoordinate(marker);
      if (!coordinate) return null;
      return {
        ...marker,
        id: marker.id ?? `marker-${index}`,
        color: marker.color || COLORS.PRIMARIO,
        label: marker.label || marker.title?.slice(0, 2).toUpperCase() || '',
        coordinate,
      };
    })
    .filter(Boolean);
}

export function normalizeZones(zones = []) {
  return zones
    .map((zone, index) => {
      const center = normalizeCoordinate(zone.center || zone);
      if (!center) return null;
      return {
        ...zone,
        id: zone.id ?? `zone-${index}`,
        center,
        radius: Number(zone.radiusMeters ?? zone.radius ?? 100),
        color: zone.color || COLORS.ACENTO,
      };
    })
    .filter(Boolean);
}

export function normalizeRoute(coordinates = []) {
  return coordinates.map(normalizeCoordinate).filter(Boolean);
}

export function ErrorState({ message }) {
  return (
    <View style={sharedStyles.errorContainer}>
      <Text style={sharedStyles.errorTitle}>Mapa no disponible</Text>
      <Text style={sharedStyles.errorText}>{message}</Text>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.FONDO_PRINCIPAL,
    flex: 1,
    overflow: 'hidden',
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    color: COLORS.PRIMARIO,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.TEXTO_SECUNDARIO,
    fontSize: 13,
    textAlign: 'center',
  },
});
