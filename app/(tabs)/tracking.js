import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { Text, Surface, IconButton, Button, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import SafeMap from '../../components/SafeMap';
import { getStudents, getInitials } from '../../utils/studentStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { trackingService } from '../../services/tracking.service';
import { notificationService } from '../../services/notification.service';
import { useTrackingRealtime } from '../../hooks/useTrackingRealtime';
import TrackingHeader from '../../features/tracking/components/TrackingHeader';
import TrackingStudentSelector from '../../features/tracking/components/TrackingStudentSelector';
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

const RECENT_ALERT_TRANSLATION_KEYS = {
  DELAY: 'trackAlertDelay',
  INACTIVITY: 'trackAlertInactivity',
  ROUTE_DEVIATION: 'trackAlertRouteDeviation',
  SAFE_ZONE_ENTRY: 'trackAlertSafeZoneEntry',
  SAFE_ZONE_EXIT: 'trackAlertSafeZoneExit',
  TRIP_STARTED: 'trackAlertTripStarted',
};

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
  const [recentAlert, setRecentAlert] = useState(null);
  const [showJourneyPath, setShowJourneyPath] = useState(true);
  const [showAssignedRoute, setShowAssignedRoute] = useState(true);
  const [activeTrip, setActiveTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clockNow, setClockNow] = useState(0);
  const refreshSequence = useRef(0);
  const lastStudentId = useRef(null);
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const locationTimestamp = location?.timestamp || new Date(location?.recordedAt || 0).getTime();
  const tripStartedAt = new Date(activeTrip?.tripStartedAt || 0).getTime();
  const isLocationStale = Boolean(activeTrip && (
    (location && Number.isFinite(locationTimestamp) && clockNow - locationTimestamp > 2 * 60 * 1000)
    || (!location && Number.isFinite(tripStartedAt) && tripStartedAt > 0 && clockNow - tripStartedAt > 2 * 60 * 1000)
  ));
  const recentAlertEventType = String(recentAlert?.eventType || '').toUpperCase();
  const isRecentAlertWarning = ['DELAY', 'INACTIVITY', 'ROUTE_DEVIATION', 'SAFE_ZONE_EXIT'].includes(recentAlertEventType);
  const themed = {
    screen: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface, borderColor: colors.border },
    surfaceSecondary: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
  };

  useEffect(() => {
    setClockNow(Date.now());
    const timer = setInterval(() => setClockNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const refreshLocation = useCallback(async (showSpinner = true) => {
    const sequence = ++refreshSequence.current;
    if (showSpinner) setIsLoading(true);
    const studentId = selectedStudent?.id || null;
    if (lastStudentId.current !== studentId) {
      lastStudentId.current = studentId;
      setLocation(null);
      setActiveTrip(null);
      setJourneyCoordinates([]);
      setRouteGeometry([]);
      setRouteGeometries([]);
      setStudentZones([]);
    }
    try {
      if (!studentId) {
        setLocation(null);
        setActiveTrip(null);
        setStudentZones([]);
        setRouteGeometry([]);
        setRouteGeometries([]);
        setJourneyCoordinates([]);
        return;
      }
      const zones = selectedStudent.zones || [];
      const routes = selectedStudent.routes || [];
      const routePaths = await Promise.all(routes.map(async (route, index) => {
        const geometry = await calculateRouteGeometry(route).catch(() => []);
        return { id: route.id || `route-${index}`, coordinates: geometry, color: colors.textMuted };
      }));
      if (sequence !== refreshSequence.current) return;
      setStudentZones(zones.filter(zone => String(zone.studentId) === String(studentId)));
      setRouteGeometries(routePaths.filter(path => path.coordinates.length >= 2));
      setRouteGeometry(routePaths[0]?.coordinates || []);
      if (Number(selectedStudent.dispositivos_vinculados || 0) < 1) {
        setLocation(null);
        setActiveTrip(null);
        setJourneyCoordinates([]);
        return;
      }
      const trips = await trackingService.listTrips();
      if (sequence !== refreshSequence.current) return;
      const studentTrips = trips
        .filter(trip => String(trip.studentId) === String(studentId) && trip.status === 'IN_PROGRESS')
        .sort((a, b) => new Date(b.tripStartedAt || 0) - new Date(a.tripStartedAt || 0));
      const selectedTrip = studentTrips[0];
      setActiveTrip(selectedTrip || null);
      if (!selectedTrip) {
        setLocation(null);
        setJourneyCoordinates([]);
        setRecentAlert(null);
        return;
      }
      const coordinates = await trackingService.listCoordinates(selectedTrip.id);
      if (sequence !== refreshSequence.current) return;
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
      setJourneyCoordinates(validCoordinates.map(({ latitude, longitude, timestamp }) => ({ latitude, longitude, timestamp })));
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
      if (sequence === refreshSequence.current) setIsLoading(false);
    }
  }, [selectedStudent, colors.textMuted]);

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
    if (!activeTrip?.id) {
      setRecentAlert(null);
      return undefined;
    }
    let mounted = true;
    const refreshRecentAlert = async () => {
      try {
        const notifications = await notificationService.listNotifications();
        if (!mounted || !Array.isArray(notifications)) return;
        const matchingAlerts = notifications
          .filter(item => String(item.tripId || '') === String(activeTrip.id))
          .sort((a, b) => new Date(b.receivedAt || b.eventDateTime || 0) - new Date(a.receivedAt || a.eventDateTime || 0));
        setRecentAlert(matchingAlerts[0] || null);
      } catch {
        // Conserva la alerta visible si el servicio de notificaciones no responde temporalmente.
      }
    };
    refreshRecentAlert();
    const timer = setInterval(refreshRecentAlert, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [activeTrip?.id]);

  useTrackingRealtime(activeTrip?.id, {
    onCoordinate: (point) => {
      const normalized = {
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        timestamp: new Date(point.recordedAt || point.createdAt || Date.now()).getTime(),
        accuracy: point.accuracy,
        recordedAt: point.recordedAt,
      };
      if (!Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)) return;
      setLocation(normalized);
      setJourneyCoordinates(current => {
        const ordered = [...current, normalized]
          .filter(point => Number.isFinite(point.timestamp))
          .sort((a, b) => a.timestamp - b.timestamp)
          .filter((point, index, all) => index === 0 || point.timestamp !== all[index - 1].timestamp)
          .slice(-500);
        return filterJourneyCoordinates(ordered);
      });
    },
    onError: (error) => console.warn(
      'Seguimiento en tiempo real no disponible:',
      error?.message || error,
    ),
  });

  return (
    <View style={[styles.container, themed.screen]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isWeb && styles.scrollContentWeb]}>
        
        <TrackingHeader
          student={selectedStudent}
          status={
            Number(selectedStudent?.dispositivos_vinculados || 0) < 1
              ? t('trackNoDevice')
              : activeTrip && isLocationStale ? t('trackOffline')
                : activeTrip ? t('trackOnline') : t('trackWaitingTrip')
          }
          onRefresh={() => refreshLocation(false)}
          colors={colors}
          t={t}
        />

        <TrackingStudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelect={handleSelectStudent}
          colors={colors}
        />

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
            coordinates={showAssignedRoute ? routeGeometry : []}
            showRoute={showAssignedRoute && routeGeometry.length >= 2}
            routePaths={showAssignedRoute ? routeGeometries : []}
            journeyCoordinates={showJourneyPath ? journeyCoordinates : []}
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
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>{t('trackCurrentLocation')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>{t('trackJourney')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendLine, { backgroundColor: colors.textMuted, borderStyle: 'dashed' }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>{t('trackAssignedRoute')}</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>{t('trackSafeZone')}</Text>
            </View>
          </View>
        </Surface>

        <Surface style={[styles.mapOptions, themed.surface]} elevation={0}>
          <View style={styles.mapOptionRow}>
            <Text style={[styles.mapOptionLabel, themed.text]}>{t('trackShowJourney')}</Text>
            <Switch value={showJourneyPath} onValueChange={setShowJourneyPath} color={colors.primary} />
          </View>
          <View style={styles.mapOptionRow}>
            <Text style={[styles.mapOptionLabel, themed.text]}>{t('trackShowAssignedRoute')}</Text>
            <Switch value={showAssignedRoute} onValueChange={setShowAssignedRoute} color={colors.primary} />
          </View>
        </Surface>

        <View style={[styles.trackingNote, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.info} />
          <Text style={[styles.trackingNoteText, themed.textSecondary]}>{t('trackAccuracyNote')}</Text>
        </View>

        {/* Última Actualización */}
        <Surface style={[styles.infoCard, themed.surface]} elevation={1}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardTitle, themed.text]}>{t('trackLastUpdate')}</Text>
              <Text style={[styles.cardSubtitle, themed.textSecondary]}>
                {isLocationStale && location
                  ? `${t('trackLastLocationReceived')} ${new Date(locationTimestamp).toLocaleTimeString(
                    { es: 'es-CO', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' }[lang] || 'es-CO',
                    { hour: '2-digit', minute: '2-digit' },
                  )}`
                  : isLocationStale ? t('trackNoRecentLocation')
                    : location ? t('trackLocationUpdated') : t('trackNoLocation')}
              </Text>
            </View>
            <View style={[styles.activeBadge, { backgroundColor: isLocationStale ? colors.errorLight : colors.accentLight }]}>
              <Text style={[styles.activeBadgeText, { color: isLocationStale ? colors.error : location ? colors.success : colors.warning }]}>
                {isLocationStale ? t('trackOffline') : location ? t('trackActive') : t('trackNoData')}
              </Text>
            </View>
          </View>
          {activeTrip && isLocationStale && (
            <View style={[styles.statusRowWrapper, themed.surfaceSecondary, styles.signalWarning]}>
              <MaterialCommunityIcons name="wifi-off" size={18} color={colors.error} style={styles.statusIcon} />
              <Text style={[styles.statusText, { color: colors.error }]}>{t('trackSignalMayBeLost')}</Text>
            </View>
          )}
        </Surface>

        {/* Estado Actual */}
        <Surface style={[styles.infoCard, themed.surface]} elevation={1}>
          <Text style={[styles.cardTitle, themed.text]}>{t('trackCurrentStatus')}</Text>
          
          <View style={[styles.statusRowWrapper, themed.surfaceSecondary]}>
            <MaterialCommunityIcons name="target" size={16} color={COLORS.ALERTA} style={styles.statusIcon} />
            <Text style={[styles.statusText, themed.text]}>
              {activeTrip
                ? t('trackLiveStatus')
                : Number(selectedStudent?.dispositivos_vinculados || 0) < 1
                  ? t('trackNoDevice')
                  : selectedStudent ? t('trackWaitingTrip') : t('trackSelectStudent')}
            </Text>
          </View>
          
          <View style={[styles.statusRowWrapper, themed.surfaceSecondary]}>
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.PRIMARIO} style={styles.statusIcon} />
            <Text style={[styles.statusText, themed.text]}>
              {location
                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : t('trackNoLocation')}
            </Text>
          </View>
        </Surface>

        {/* Alerta Reciente */}
        <Surface style={[styles.infoCard, themed.surface]} elevation={1}>
          <Text style={[styles.cardTitle, themed.text]}>{t('trackRecentAlert')}</Text>
          <View style={[styles.alertBox, { backgroundColor: isRecentAlertWarning ? colors.errorLight : colors.accentLight }]}>
            <Text style={[styles.alertBoxTitle, { color: isRecentAlertWarning ? colors.error : colors.success }]}>
              {recentAlert
                ? RECENT_ALERT_TRANSLATION_KEYS[recentAlertEventType]
                  ? t(RECENT_ALERT_TRANSLATION_KEYS[recentAlertEventType])
                  : (recentAlert.message || recentAlert.eventType || t('trackRecentAlert'))
                : t('trackNoAlert')}
            </Text>
            <Text style={[styles.alertBoxSub, { color: colors.textSecondary }]}>
              {recentAlert
                ? new Date(recentAlert.receivedAt || recentAlert.eventDateTime).toLocaleString(lang)
                : t('trackNoAlertHint')}
            </Text>
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
            {t('trackViewHistory')}
          </Button>
          <Button 
            mode="contained" 
            style={styles.routeBtn} 
            buttonColor={colors.primary}
            onPress={() => router.push('/(tabs)/zones')}
            contentStyle={styles.btnContent}
          >
            {t('trackConfigureRoute')}
          </Button>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.FONDO_PRINCIPAL },
  scrollContent: { padding: 20, paddingBottom: 40 },
  scrollContentWeb: { maxWidth: 1120, alignSelf: 'center', width: '100%', paddingTop: 20 },
  
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

  mapCard: { height: isWeb ? 520 : 330, backgroundColor: COLORS.BLANCO, borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  map: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.12)', zIndex: 5 },
  
  mapLegend: { position: 'absolute', bottom: 14, left: 14, borderWidth: 1, padding: 10, borderRadius: 12 },
  trackingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  trackingNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 12, height: 2 },
  legendText: { fontSize: 11 },
  
  mapFab: { position: 'absolute', top: 10, right: 10, elevation: 4 },

  infoCard: { backgroundColor: COLORS.BLANCO, borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.NEGRO, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO },
  
  activeBadge: { backgroundColor: COLORS.ACENTO_CLARO, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: COLORS.ACENTO_OSCURO, fontSize: 12, fontWeight: 'bold' },

  statusRowWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.FONDO_INPUT, padding: 12, borderRadius: 12, marginBottom: 8 },
  signalWarning: { marginTop: 12, borderWidth: 1, borderColor: COLORS.ALERTA },
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

