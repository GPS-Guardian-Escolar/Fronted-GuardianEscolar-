import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS } from '../constants/colors';
import {
  ErrorState,
  GOOGLE_MAPS_API_KEY,
  normalizeCoordinate,
  normalizeMarkers,
  normalizeRegion,
  normalizeRoute,
  normalizeZones,
  sharedStyles,
} from './SafeMap.shared';

function StudentMarker({ marker }) {
  return (
    <Marker coordinate={marker.coordinate} title={marker.title}>
      <View style={[styles.markerBubble, { backgroundColor: marker.color }]}>
        <Text style={styles.markerLabel}>{marker.label}</Text>
      </View>
    </Marker>
  );
}

function SafeZoneCircle({ zone }) {
  return (
    <Circle
      center={zone.center}
      radius={zone.radius}
      strokeColor={zone.color}
      fillColor={`${zone.color}33`}
      strokeWidth={2}
    />
  );
}

function RoutePolyline({ coordinates }) {
  if (coordinates.length < 2) return null;
  return <Polyline coordinates={coordinates} strokeColor={COLORS.PRIMARIO} strokeWidth={4} />;
}

export default function SafeMap({
  children,
  currentLocation,
  initialRegion,
  style,
  markers = [],
  coordinates = [],
  showRoute = false,
  safeZones,
  circles,
}) {
  const mapRef = useRef(null);
  const region = useMemo(() => normalizeRegion(initialRegion, currentLocation, markers), [initialRegion, currentLocation, markers]);
  const normalizedMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const route = useMemo(() => normalizeRoute(coordinates), [coordinates]);
  const zones = useMemo(() => normalizeZones(safeZones || circles || []), [safeZones, circles]);
  const currentCoordinate = normalizeCoordinate(currentLocation);

  useEffect(() => {
    if (!currentCoordinate || !mapRef.current) return;
    mapRef.current.animateToRegion({
      ...region,
      latitude: currentCoordinate.latitude,
      longitude: currentCoordinate.longitude,
    }, 600);
  }, [currentCoordinate, region]);

  if (!GOOGLE_MAPS_API_KEY) {
    return <View style={[sharedStyles.container, style]}><ErrorState message="Configura EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en .env para cargar Google Maps." /></View>;
  }

  return (
    <View style={[sharedStyles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {normalizedMarkers.map(marker => <StudentMarker key={marker.id} marker={marker} />)}
        {currentCoordinate && (
          <Marker coordinate={currentCoordinate} title="Ubicación actual" pinColor={COLORS.PRIMARIO} />
        )}
        {showRoute && <RoutePolyline coordinates={route} />}
        {zones.map(zone => <SafeZoneCircle key={zone.id} zone={zone} />)}
        {children}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  markerBubble: {
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  markerLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
