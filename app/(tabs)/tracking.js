import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Avatar, Text, Surface, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import SafeMap from '../../components/SafeMap';
import { getStudents, getInitials } from '../../utils/studentStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { trackingService } from '../../services/tracking.service';
import { createTrackingSocket } from '../../services/socket';
import { calculateRouteGeometry } from '../../utils/routeGeometry';

const { width } = Dimensions.get('window');
const isWeb = width > 768;

const INITIAL_REGION = {
  latitude: 4.5709,
  longitude: -74.2973,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

function getZoneColor(zone, colors) {
  if (zone?.color) return zone.color;
  if (zone?.type === 'Escuela') return colors.primary;
  if (zone?.type === 'Casa') return colors.accent;
  return colors.error;
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const toRadians = value => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function filterJourneyCoordinates(points) {
  const withoutIsolatedJumps = points.filter((point, index) => {
    const previous = points[index - 1];
    const next = points[index + 1];
    return !previous || !next
      || distanceMeters(previous, point) <= 300
      || distanceMeters(previous, next) >= 300;
  });
  const accepted = [];
  for (const point of withoutIsolatedJumps) {
    if (!accepted.length) {
      accepted.push(point);
      continue;
    }
    const previous = accepted[accepted.length - 1];
    const distance = distanceMeters(previous, point);
    const elapsedSeconds = Math.max(1, (point.timestamp - previous.timestamp) / 1000);
    if (distance <= 1000 && distance / elapsedSeconds <= 30) accepted.push(point);
  }
  return accepted;
}

export default function TrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [location, setLocation] = useState(null);
  const [studentZones, setStudentZones] = useState([]);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [routeGeometries, setRouteGeometries] = useState([]);
  const [journeyCoordinates, setJourneyCoordinates] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const themed = {
    screen: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface, borderColor: colors.border },
    surfaceSecondary: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
  };

  const refreshLocation = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    try {
      if (!selectedStudent?.id) {
        setLocation(null);
        setStudentZones([]);
        setRouteGeometry([]);
        setRouteGeometries([]);
        setJourneyCoordinates([]);
        return;
      }
      const zones = selectedStudent.zones || [];
      setStudentZones(zones.filter(zone => String(zone.studentId) === String(selectedStudent.id)));
      const routes = selectedStudent.routes || [];
      const routePaths = await Promise.all(routes.map(async (route, index) => {
        const geometry = await calculateRouteGeometry(route).catch(() => []);
        return { id: route.id || `route-${index}`, coordinates: geometry, color: '#8B95A7' };
      }));
      setRouteGeometries(routePaths.filter(path => path.coordinates.length >= 2).map(path => ({ ...path, color: '#8B95A7' })));
      setRouteGeometry(routePaths[0]?.coordinates || []);
      const trips = await trackingService.listTrips();
      const studentTrips = trips
        .filter(trip => String(trip.studentId) === String(selectedStudent.id))
        .sort((a, b) => {
          const priority = { IN_PROGRESS: 0, PENDING: 1, COMPLETED: 2, CANCELED: 3 };
          return (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
        });
      const selectedTrip = studentTrips.find(trip => ['IN_PROGRESS', 'PENDING'].includes(trip.status)) || studentTrips[0];
      setActiveTrip(selectedTrip || null);
      if (!selectedTrip) {
        setLocation(null);
        return;
      }
      const coordinates = await trackingService.listCoordinates(selectedTrip.id);
      const orderedCoordinates = [...(coordinates || [])].sort((a, b) => {
        const timeA = new Date(a.recordedAt || a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.recordedAt || b.createdAt || b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      const validCoordinates = filterJourneyCoordinates(orderedCoordinates
        .map(point => ({
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          timestamp: new Date(point.recordedAt || point.createdAt || point.timestamp || 0).getTime(),
          accuracy: point.accuracy,
          recordedAt: point.recordedAt,
        }))
        .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Number.isFinite(point.timestamp)));
      setJourneyCoordinates(validCoordinates.map(({ latitude, longitude }) => ({ latitude, longitude })));
      const latest = validCoordinates[validCoordinates.length - 1];
      if (!latest) {
        setLocation(null);
        return;
      }
      setLocation({
        latitude: latest.latitude,
        longitude: latest.longitude,
        accuracy: latest.accuracy,
        recordedAt: latest.recordedAt,
      });
    } catch {
      // Conserva los datos visibles si la actualización puntual falla por red.
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudent]);

  useFocusEffect(
    useCallback(() => {
      getStudents()
        .then(data => {
          setStudents(data);
          setSelectedStudent(current => {
            if (current) return current;
            if (params.id) {
              const found = data.find(s => s.id === params.id);
              if (found) return found;
            }
            if (data.length > 0) return data[0];
            return current;
          });
        })
        .catch((error) => {
          setStudents([]);
          setSelectedStudent(null);
          console.warn('No se pudieron cargar estudiantes para rastreo:', error?.message || error);
        });
    }, [params.id])
  );

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
  };

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    if (!activeTrip?.id) return undefined;

    let disposed = false;
    let client;
    createTrackingSocket({
      tripId: activeTrip.id,
      onCoordinate: (point) => {
        if (disposed) return;
        const normalized = {
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          timestamp: new Date(point.recordedAt || point.createdAt || Date.now()).getTime(),
          accuracy: point.accuracy,
          recordedAt: point.recordedAt,
        };
        if (!Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)) return;
        setLocation(normalized);
        setJourneyCoordinates(current => [
          ...current,
          normalized,
        ].slice(-500).map(({ latitude, longitude }) => ({ latitude, longitude })));
      },
      onError: (error) => {
        if (!disposed) console.warn('Seguimiento en tiempo real no disponible:', error?.message || error);
      },
    }).then((connectedClient) => {
      if (disposed) {
        connectedClient.deactivate();
      } else {
        client = connectedClient;
      }
    }).catch((error) => {
      if (!disposed) console.warn('No se pudo conectar el seguimiento en tiempo real:', error?.message || error);
    });

    return () => {
      disposed = true;
      client?.deactivate();
    };
  }, [activeTrip?.id]);

  return (
    <View style={[styles.container, themed.screen]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isWeb && styles.scrollContentWeb]}>
        
        {/* Cabecera del Estudiante */}
        <Surface style={[styles.headerCard, themed.surface]} elevation={1}>
          <View style={styles.headerProfile}>
            <Avatar.Text 
              size={40} 
              label={selectedStudent ? getInitials(selectedStudent.nombre) : '??'} 
              backgroundColor={colors.primary} 
              color={colors.textOnPrimary} 
            />
            <View style={styles.headerTextCol}>
              <Text style={[styles.studentName, themed.text]}>{selectedStudent?.nombre || t('trackSelectStudent')}</Text>
              <Text style={[styles.studentStatus, themed.textSecondary]}>{t('trackOnline')}</Text>
            </View>
          </View>
          <IconButton 
            icon="refresh" 
            size={20} 
            style={[styles.refreshBtn, themed.surfaceSecondary]} 
            iconColor={colors.textSecondary} 
            onPress={() => refreshLocation(false)}
          />
        </Surface>

        {/* Selector de Estudiantes Horizontal */}
        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {students.map(student => (
              <TouchableOpacity 
                key={student.id} 
                onPress={() => handleSelectStudent(student)}
                style={[
                  styles.selectorItem, 
                  themed.surface,
                  selectedStudent?.id === student.id && { borderColor: colors.primary, borderWidth: 2 }
                ]}
              >
                <Avatar.Text 
                  size={42} 
                  label={getInitials(student.nombre)} 
                  backgroundColor={colors.primary} 
                  color={colors.textOnPrimary} 
                />
                <Text style={[styles.selectorLabel, themed.textSecondary, selectedStudent?.id === student.id && { color: colors.primary, fontWeight: 'bold' }]} numberOfLines={1}>
                  {student.nombre.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tarjeta del Mapa */}
        <Surface style={[styles.mapCard, themed.surface]} elevation={1}>
          <SafeMap
            key={selectedStudent?.id || 'tracking-map'}
            currentLocation={location}
            initialRegion={INITIAL_REGION}
            style={styles.map}
            markers={[
              ...(studentZones || []).map(zone => {
                const center = zone.center || { latitude: Number(zone.latitude), longitude: Number(zone.longitude) };
                const zoneName = zone.name || zone.zoneName || zone.nombre || zone.type || zone.zoneType || 'Zona';
                return { ...center, label: getInitials(zoneName), title: zoneName, color: getZoneColor({ ...zone, type: zone.type || zone.zoneType }, colors) };
              }),
            ]}
            safeZones={(studentZones || []).map(zone => ({ ...zone, color: getZoneColor(zone, colors), center: zone.center || { latitude: Number(zone.latitude), longitude: Number(zone.longitude) } }))}
            coordinates={routeGeometry}
            showRoute={routeGeometry.length >= 2}
            routePaths={routeGeometries}
            journeyCoordinates={journeyCoordinates}
          />
          {isLoading && (
            <View pointerEvents="none" style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <IconButton 
            icon="crosshairs-gps" 
            mode="contained" 
            containerColor={colors.surface}
            iconColor={colors.primary}
            style={styles.mapFab} 
            onPress={() => refreshLocation(false)}
          />
          
          {/* Leyenda del Mapa */}
          <View style={[styles.mapLegend, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.PRIMARIO }]} />
              <Text style={[styles.legendText, themed.text]}>{t('trackCurrentLocation')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: COLORS.PRIMARIO }]} />
              <Text style={[styles.legendText, themed.text]}>{t('trackJourney')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: COLORS.TEXTO_SECUNDARIO, borderStyle: 'dashed' }]} />
              <Text style={[styles.legendText, themed.text]}>{t('trackAssignedRoute')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.ACENTO }]} />
              <Text style={[styles.legendText, themed.text]}>{t('trackSafeZone')}</Text>
            </View>
          </View>
        </Surface>

        {/* Última Actualización */}
        <Surface style={[styles.infoCard, themed.surface]} elevation={1}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardTitle, themed.text]}>{t('trackLastUpdate')}</Text>
              <Text style={[styles.cardSubtitle, themed.textSecondary]}>
                {location ? 'Ubicación local actualizada' : 'Sin ubicación disponible'}
              </Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.activeBadgeText, { color: location ? colors.success : colors.warning }]}>
                {location ? t('trackActive') : 'Sin datos'}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Estado Actual */}
        <Surface style={[styles.infoCard, themed.surface]} elevation={1}>
          <Text style={[styles.cardTitle, themed.text]}>{t('trackCurrentStatus')}</Text>
          
          <View style={[styles.statusRowWrapper, themed.surfaceSecondary]}>
            <MaterialCommunityIcons name="target" size={16} color={COLORS.ALERTA} style={styles.statusIcon} />
            <Text style={[styles.statusText, themed.text]}>
              {selectedStudent ? 'Esperando trayecto activo' : t('trackSelectStudent')}
            </Text>
          </View>
          
          <View style={[styles.statusRowWrapper, themed.surfaceSecondary]}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={COLORS.ADVERTENCIA} style={styles.statusIcon} />
            <Text style={[styles.statusText, themed.text]}>{t('trackSpeed')} -- km/h</Text>
          </View>
          
          <View style={[styles.statusRowWrapper, themed.surfaceSecondary]}>
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.PRIMARIO} style={styles.statusIcon} />
            <Text style={[styles.statusText, themed.text]}>
              {location
                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : 'Sin ubicación registrada'}
            </Text>
          </View>
        </Surface>

        {/* Alerta Reciente */}
        <Surface style={[styles.infoCard, themed.surface]} elevation={1}>
          <Text style={[styles.cardTitle, themed.text]}>{t('trackRecentAlert')}</Text>
          <View style={[styles.alertBox, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.alertBoxTitle, { color: colors.success }]}>Sin alertas recientes</Text>
            <Text style={[styles.alertBoxSub, { color: colors.success }]}>Cuando exista una notificación real aparecerá aquí.</Text>
          </View>
        </Surface>

        {/* Botones de Acción */}
        <View style={styles.actionButtons}>
          <Button 
            mode="outlined" 
            style={[styles.historyBtn, { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary }]} 
            textColor={colors.primary}
            onPress={() => router.push('/(tabs)/history')}
            contentStyle={styles.btnContent}
          >
            {t('live') === 'Live' ? 'View History' : 'Ver Historial'}
          </Button>
          <Button 
            mode="contained" 
            style={styles.routeBtn} 
            buttonColor={colors.primary}
            onPress={() => router.push('/(tabs)/zones')}
            contentStyle={styles.btnContent}
          >
            {t('live') === 'Live' ? 'Configure Route' : 'Configurar Ruta'}
          </Button>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.FONDO_PRINCIPAL },
  scrollContent: { padding: 16, paddingBottom: 40 },
  scrollContentWeb: { maxWidth: 1180, alignSelf: 'center', width: '100%', paddingTop: 20 },
  
  headerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.BLANCO, borderRadius: 8, padding: 12, marginBottom: 16 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextCol: { justifyContent: 'center' },
  studentName: { fontSize: 16, fontWeight: 'bold', color: COLORS.NEGRO },
  studentStatus: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO },
  refreshBtn: { backgroundColor: COLORS.FONDO_PRINCIPAL, borderRadius: 8 },

  selectorContainer: { marginBottom: 16 },
  selectorScroll: { gap: 12 },
  selectorItem: { alignItems: 'center', gap: 6, padding: 4, borderRadius: 12, backgroundColor: COLORS.BLANCO, width: 75, elevation: 1 },
  selectorLabel: { fontSize: 11, color: COLORS.TEXTO_SECUNDARIO, textAlign: 'center' },

  mapCard: { height: isWeb ? 520 : 330, backgroundColor: COLORS.BLANCO, borderRadius: 8, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  map: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.12)', zIndex: 5 },
  
  mapLegend: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 12, height: 2 },
  legendText: { fontSize: 10, color: COLORS.NEGRO },
  
  mapFab: { position: 'absolute', top: 10, right: 10, elevation: 4 },

  infoCard: { backgroundColor: COLORS.BLANCO, borderRadius: 8, padding: 16, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.NEGRO, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO },
  
  activeBadge: { backgroundColor: COLORS.ACENTO_CLARO, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: COLORS.ACENTO_OSCURO, fontSize: 12, fontWeight: 'bold' },

  statusRowWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.FONDO_INPUT, padding: 10, borderRadius: 8, marginBottom: 8 },
  statusIcon: { marginRight: 10 },
  statusText: { fontSize: 13, color: COLORS.NEGRO },

  alertBox: { backgroundColor: COLORS.ACENTO_CLARO, padding: 12, borderRadius: 8, marginTop: 8 },
  alertBoxTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.ACENTO_OSCURO },
  alertBoxSub: { fontSize: 11, color: COLORS.ACENTO_OSCURO, marginTop: 2 },

  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  historyBtn: { flex: 1, borderRadius: 8, borderColor: COLORS.PRIMARIO, borderWidth: 1, backgroundColor: COLORS.PRIMARIO_CLARO },
  routeBtn: { flex: 1, borderRadius: 8 },
  btnContent: { height: 48 },
});

