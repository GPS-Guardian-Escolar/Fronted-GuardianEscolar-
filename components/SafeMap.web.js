import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
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

let googleMapsPromise;

function loadGoogleMapsScript() {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Falta EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-guardian-google-maps="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps));
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
    script.async = true;
    script.defer = true;
    script.dataset.guardianGoogleMaps = 'true';
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function SafeMap({
  currentLocation,
  initialRegion,
  style,
  markers = [],
  coordinates = [],
  showRoute = false,
  safeZones,
  circles,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [error, setError] = useState('');
  const region = useMemo(() => normalizeRegion(initialRegion, currentLocation, markers), [initialRegion, currentLocation, markers]);
  const normalizedMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const route = useMemo(() => normalizeRoute(coordinates), [coordinates]);
  const zones = useMemo(() => normalizeZones(safeZones || circles || []), [safeZones, circles]);
  const currentCoordinate = normalizeCoordinate(currentLocation);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: { lat: region.latitude, lng: region.longitude },
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'No se pudo cargar Google Maps.');
      });

    return () => {
      cancelled = true;
    };
  }, [region.latitude, region.longitude]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    overlaysRef.current.forEach(overlay => overlay.setMap?.(null));
    overlaysRef.current = [];

    normalizedMarkers.forEach((marker) => {
      const googleMarker = new maps.Marker({
        map: mapRef.current,
        position: { lat: marker.coordinate.latitude, lng: marker.coordinate.longitude },
        title: marker.title,
        label: marker.label ? { text: marker.label, color: '#FFFFFF', fontWeight: '700' } : undefined,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: marker.color,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          scale: 14,
        },
      });
      overlaysRef.current.push(googleMarker);
    });

    if (currentCoordinate) {
      const currentMarker = new maps.Marker({
        map: mapRef.current,
        position: { lat: currentCoordinate.latitude, lng: currentCoordinate.longitude },
        title: 'Ubicación actual',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: COLORS.PRIMARIO,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
          scale: 10,
        },
      });
      overlaysRef.current.push(currentMarker);
      mapRef.current.panTo({ lat: currentCoordinate.latitude, lng: currentCoordinate.longitude });
    }

    if (showRoute && route.length >= 2) {
      const polyline = new maps.Polyline({
        map: mapRef.current,
        path: route.map(point => ({ lat: point.latitude, lng: point.longitude })),
        strokeColor: COLORS.PRIMARIO,
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      overlaysRef.current.push(polyline);
    }

    zones.forEach((zone) => {
      const circle = new maps.Circle({
        map: mapRef.current,
        center: { lat: zone.center.latitude, lng: zone.center.longitude },
        radius: zone.radius,
        fillColor: zone.color,
        fillOpacity: 0.18,
        strokeColor: zone.color,
        strokeOpacity: 0.7,
        strokeWeight: 2,
      });
      overlaysRef.current.push(circle);
    });
  }, [currentCoordinate, normalizedMarkers, route, showRoute, zones]);

  if (!GOOGLE_MAPS_API_KEY) {
    return <View style={[sharedStyles.container, style]}><ErrorState message="Configura EXPO_PUBLIC_GOOGLE_MAPS_API_KEY en .env para cargar Google Maps." /></View>;
  }

  if (error) {
    return <View style={[sharedStyles.container, style]}><ErrorState message={error} /></View>;
  }

  return (
    <View style={[sharedStyles.container, style]}>
      {React.createElement('div', {
        ref: containerRef,
        style: { width: '100%', height: '100%' },
        role: 'img',
        'aria-label': 'Mapa de seguimiento escolar',
      })}
    </View>
  );
}
