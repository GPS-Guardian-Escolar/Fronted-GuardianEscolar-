import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Surface, Avatar, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import SafeMap from '../../components/SafeMap';
import { getStudents, addZone, updateZone, deleteZone, getInitials, addRoute, updateRoute, deleteRoute } from '../../utils/studentStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { calculateRouteGeometry } from '../../utils/routeGeometry';

const { width } = Dimensions.get('window');
const isWeb = width > 768;

const EMPTY_ZONE = { name: '', type: 'Personalizado', address: '', radius: '100 Metros', color: COLORS.PRIMARIO };
const VALID_ZONE_TYPES = ['Casa', 'Escuela', 'Personalizado'];

function showZonesAlert(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function parseRadiusMeters(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits ? Number(digits) : Number.NaN;
}

function normalizeZoneForm(zone, metersLabel) {
  const radius = parseRadiusMeters(zone.radius);
  return {
    ...zone,
    name: zone.name.trim(),
    address: zone.address.trim(),
    radius: `${radius} ${metersLabel}`,
    type: VALID_ZONE_TYPES.includes(zone.type) ? zone.type : 'Personalizado',
  };
}

function normalizeRouteForm(route) {
  return {
    ...route,
    name: route.name.trim(),
    start: route.start.trim(),
    end: route.end.trim(),
  };
}

function normalizeRouteValue(value = '') {
  return String(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase().replace(/\\s+/g, ' ');
}

function isDuplicateRoute(route, existingRoutes = [], editingId) {
  const signature = [route.name, route.start, route.end].map(normalizeRouteValue).join('|');
  return existingRoutes.some(existing => existing.id !== editingId
    && [existing.name, existing.start, existing.end].map(normalizeRouteValue).join('|') === signature);
}

function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return '';
  return String(latitude) + ', ' + String(longitude);
}

function getRouteCoordinates(route) {
  return [
    { latitude: Number(route?.originLatitude), longitude: Number(route?.originLongitude) },
    ...(route?.stops || [])
      .slice()
      .sort((a, b) => Number(a.stopOrder || 0) - Number(b.stopOrder || 0))
      .map(stop => ({ latitude: Number(stop.latitude), longitude: Number(stop.longitude) })),
    { latitude: Number(route?.destinationLatitude), longitude: Number(route?.destinationLongitude) },
  ].filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
}

function requestErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const message = String(error?.message || '').toLowerCase();
  if (status === 401) return fallback.sessionExpired;
  if (status === 403) return fallback.forbidden;
  if (!error?.response && /network|timeout|fetch|conexi/.test(message)) return fallback.network;
  return fallback.general;
}

export default function ZonesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const themed = {
    screen: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface, borderColor: colors.border },
    surfaceSecondary: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    overlay: { backgroundColor: colors.overlay },
  };
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' or 'routes'
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [form, setForm] = useState(EMPTY_ZONE);

  const [modalRouteVisible, setModalRouteVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const EMPTY_ROUTE = { name: '', start: '', end: '' };
  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [routeGeometries, setRouteGeometries] = useState([]);
  const [routePoints, setRoutePoints] = useState([]);
  const [routePreview, setRoutePreview] = useState(null);
  const [routePreviewGeometry, setRoutePreviewGeometry] = useState([]);
  const [routePreviewError, setRoutePreviewError] = useState('');
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getStudents();
    setStudents(data);
    setSelectedStudent(prev => {
      if (prev) {
        return data.find(s => s.id === prev.id) || prev;
      }
      return prev;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().catch((error) => {
        setStudents([]);
        setSelectedStudent(null);
        showZonesAlert(t('error'), requestErrorMessage(error, {
          general: t('zonesStudentsLoadFail'), network: t('qrNoConnection'), sessionExpired: t('qrGuardianSessionExpired'), forbidden: t('zonesForbidden'),
        }));
      });
    }, [loadData, t])
  );

  function openAddZone() {
    setEditingZone(null);
    setForm({ ...EMPTY_ZONE, radius: `100 ${t('zonesMeters')}` });
    setModalVisible(true);
  }

  function openEditZone(zone) {
    setEditingZone(zone);
    setForm({ ...EMPTY_ZONE, ...zone, radius: `${parseRadiusMeters(zone.radius)} ${t('zonesMeters')}`, address: zone.address || formatCoordinates(zone.center?.latitude, zone.center?.longitude) });
    setModalVisible(true);
  }

  async function handleSaveZone() {
    const radius = parseRadiusMeters(form.radius);
    if (!String(form.name || '').trim()) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesEnterName'));
      return;
    }
    if (!String(form.address || '').trim()) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesEnterAddress'));
      return;
    }
    if (form.name.trim().length < 2 || form.name.trim().length > 100) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesNameLength'));
      return;
    }
    if (form.address.trim().length < 5 || form.address.trim().length > 160) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesAddressLength'));
      return;
    }
    if (!Number.isInteger(radius) || radius < 5 || radius > 50000) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesRadiusRange'));
      return;
    }
    const payload = normalizeZoneForm(form, t('zonesMeters'));
    setLoading(true);
    try {
      if (editingZone) {
        await updateZone(selectedStudent.id, editingZone.id, payload);
      } else {
        await addZone(selectedStudent.id, payload);
      }
      await loadData();
      setModalVisible(false);
      showZonesAlert(t('zonesSavedTitle'), t('zonesSavedMessage'));
    } catch (error) {
      showZonesAlert(t('zonesSaveFailed'), requestErrorMessage(error, {
        general: t('zonesVerifyAddressRadius'), network: t('qrNoConnection'), sessionExpired: t('qrGuardianSessionExpired'), forbidden: t('zonesForbidden'),
      }));
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteZone(zone) {
    setDeleteConfirmation({ type: 'zone', item: zone });
  }

  function openAddRoute() {
    setEditingRoute(null);
    setRouteForm(EMPTY_ROUTE);
    setRouteGeometry([]);
    setRoutePoints([]);
    setModalRouteVisible(true);
  }

  async function openRoutePreview(route) {
    setRoutePreview(route);
    setRoutePreviewGeometry([]);
    setRoutePreviewError('');
    setRoutePreviewLoading(true);
    try {
      const geometry = await calculateRouteGeometry(route);
      if (geometry.length < 2) throw new Error('No route geometry');
      setRoutePreviewGeometry(geometry);
    } catch {
      setRoutePreviewError(t('zonesRouteUnavailable'));
    } finally {
      setRoutePreviewLoading(false);
    }
  }

  function openEditRoute(route) {
    setEditingRoute(route);
    setRouteForm(route);
    setRoutePoints([
      { latitude: Number(route.originLatitude), longitude: Number(route.originLongitude) },
      ...(route.stops || [])
        .slice()
        .sort((a, b) => Number(a.stopOrder || 0) - Number(b.stopOrder || 0))
        .map(stop => ({ latitude: Number(stop.latitude), longitude: Number(stop.longitude) })),
      { latitude: Number(route.destinationLatitude), longitude: Number(route.destinationLongitude) },
    ].filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)));
    calculateRouteGeometry(route).then(geometry => {
      setRouteGeometry(geometry.length >= 2 ? geometry : []);
    }).catch(() => setRouteGeometry([]));
    setModalRouteVisible(true);
  }

  function routeFromPoints(points) {
    return {
      originLatitude: points[0]?.latitude,
      originLongitude: points[0]?.longitude,
      destinationLatitude: points[points.length - 1]?.latitude,
      destinationLongitude: points[points.length - 1]?.longitude,
      stops: points.slice(1, -1).map((point, index) => ({
        stopOrder: index + 1,
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    };
  }

  function selectZoneForRoute(zone, role) {
    const center = zone.center || {
      latitude: Number(zone.latitude),
      longitude: Number(zone.longitude),
    };
    if (!Number.isFinite(center.latitude) || !Number.isFinite(center.longitude)) return;

    setRoutePoints(current => {
      let next;
      if (role === 'origin') {
        next = current.length >= 2 ? [center, ...current.slice(1)] : [center];
      } else {
        next = current.length >= 2 ? [...current.slice(0, -1), center] : [...current, center];
      }
      setRouteForm(form => ({
        ...form,
        start: next[0] ? next[0].latitude.toFixed(6) + ', ' + next[0].longitude.toFixed(6) : '',
        end: next.length >= 2 ? next[next.length - 1].latitude.toFixed(6) + ', ' + next[next.length - 1].longitude.toFixed(6) : '',
        startCoordinates: next[0],
        endCoordinates: next.length >= 2 ? next[next.length - 1] : undefined,
        routePoints: next,
        name: form.name.trim() || (role === 'destination' ? t('zonesSelectedRouteName') : form.name),
      }));
      if (next.length >= 2) {
        calculateRouteGeometry(routeFromPoints(next)).then(setRouteGeometry).catch(() => setRouteGeometry([]));
      }
      return next;
    });
  }
  async function handleSaveRoute() {
    if (!routeForm.name.trim() || !routeForm.start.trim() || !routeForm.end.trim()) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesRequiredRouteMsg'));
      return;
    }
    if (routeForm.name.trim().length < 2 || routeForm.name.trim().length > 100) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesRouteNameLength'));
      return;
    }
    if (routeForm.start.trim().length < 3 || routeForm.start.trim().length > 160) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesRouteStartLength'));
      return;
    }
    if (routeForm.end.trim().length < 3 || routeForm.end.trim().length > 160) {
      showZonesAlert(t('zonesRequiredFields'), t('zonesRouteEndLength'));
      return;
    }
    const payload = { ...normalizeRouteForm(routeForm), routePoints };
    if (isDuplicateRoute(payload, currentRoutes, editingRoute?.id)) {
      showZonesAlert(t('zonesDuplicateRouteTitle'), t('zonesDuplicateRouteMessage'));
      return;
    }
    setLoading(true);
    try {
      if (editingRoute) {
        await updateRoute(selectedStudent.id, editingRoute.id, payload);
      } else {
        await addRoute(selectedStudent.id, payload);
      }
      await loadData();
      setModalRouteVisible(false);
      showZonesAlert(t('zonesRouteSavedTitle'), t('zonesRouteSavedMessage'));
    } catch (error) {
      showZonesAlert(t('zonesRouteSaveFailed'), requestErrorMessage(error, {
        general: t('zonesVerifyRoutePoints'), network: t('qrNoConnection'), sessionExpired: t('qrGuardianSessionExpired'), forbidden: t('zonesForbidden'),
      }));
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteRoute(route) {
    setDeleteConfirmation({ type: 'route', item: route });
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmation) return;
    const { type, item } = deleteConfirmation;
    setDeleteConfirmation(null);
    setLoading(true);
    try {
      if (type === 'route') {
        await deleteRoute(selectedStudent.id, item.id);
      } else {
        await deleteZone(selectedStudent.id, item.id);
      }
      await loadData();
    } catch (error) {
      showZonesAlert(t('zonesDeleteFailed'), requestErrorMessage(error, {
        general: t('tryAgain'), network: t('qrNoConnection'), sessionExpired: t('qrGuardianSessionExpired'), forbidden: t('zonesForbidden'),
      }));
    } finally {
      setLoading(false);
    }
  }

  const currentZones = selectedStudent?.zones || [];
  const currentRoutes = selectedStudent?.routes || [];

  useEffect(() => {
    let cancelled = false;
    const routes = selectedStudent?.routes || [];
    if (!routes.length) {
      setRouteGeometry([]);
      setRouteGeometries([]);
      return undefined;
    }
    Promise.all(routes.map(async (route, index) => {
      const geometry = await calculateRouteGeometry(route).catch(() => []);
      return { id: route.id || `route-${index}`, coordinates: geometry, color: '#8B95A7' };
    })).then(paths => {
      if (cancelled) return;
      setRouteGeometries(paths.filter(path => path.coordinates.length >= 2));
      setRouteGeometry(paths[0]?.coordinates || []);
    });
    return () => { cancelled = true; };
  }, [selectedStudent?.id, selectedStudent?.routes]);

  if (!selectedStudent) {
    return (
      <View style={[styles.container, themed.screen]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface style={[styles.selectCard, themed.surface]} elevation={1}>
            <Text style={[styles.selectTitle, themed.text]}>{t('zonesSelectStudent')}</Text>
            {students.length === 0 ? (
              <View style={styles.emptyCenter}>
                <Text style={[styles.emptyText, themed.textSecondary]}>{t('zonesNoStudents')}</Text>
                <Button mode="contained" buttonColor={colors.primary} textColor={colors.textOnPrimary} onPress={() => router.push('/(tabs)/student')} style={{ marginTop: 10 }}>
                  {t('zonesGoStudents')}
                </Button>
              </View>
            ) : (
              <View style={styles.studentGrid}>
                {students.map(student => (
                  <Surface 
                    key={student.id} 
                    style={[styles.studentSelector, themed.surface, { borderLeftWidth: 4, borderLeftColor: colors.primary }]} 
                    elevation={1}
                  >
                    <TouchableOpacity 
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
                      onPress={() => setSelectedStudent(student)}
                    >
                    <Avatar.Text 
                      size={50} 
                      label={student.label || getInitials(student.nombre)} 
                      backgroundColor={colors.primary} 
                      color={colors.textOnPrimary} 
                    />
                    <View style={styles.studentSelectorInfo}>
                      <Text style={[styles.studentSelectorName, themed.text]}>{student.nombre}</Text>
                      <Text style={[styles.studentSelectorSub, themed.textSecondary]}>{t('zonesConfigZones')}</Text>
                    </View>
                    </TouchableOpacity>
                  </Surface>
                ))}
              </View>
            )}
          </Surface>
        </ScrollView>
      </View>
    );
  }


  return (
    <View style={[styles.container, themed.screen]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Botón Volver */}
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedStudent(null)}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
          <Text style={[styles.backBtnText, { color: colors.primary }]}>{t('zonesChangeStudent')}</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, themed.text]}>{t('zonesTitle')}</Text>
            <Text style={[styles.subtitle, themed.textSecondary]}>{t('zonesFor')} <Text style={{ fontWeight: 'bold', color: colors.primary }}>{selectedStudent.nombre}</Text></Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, themed.surfaceSecondary]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'zones' && [styles.tabActive, { backgroundColor: colors.primary }]]} 
            onPress={() => setActiveTab('zones')}
          >
            <Text style={[styles.tabText, themed.textSecondary, activeTab === 'zones' && { color: colors.textOnPrimary, fontWeight: 'bold' }]}>{t('zonesSafeZones')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'routes' && [styles.tabActive, { backgroundColor: colors.primary }]]} 
            onPress={() => setActiveTab('routes')}
          >
            <Text style={[styles.tabText, themed.textSecondary, activeTab === 'routes' && { color: colors.textOnPrimary, fontWeight: 'bold' }]}>{t('zonesSavedRoutes')}</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'zones' && (
          <>
            <View style={styles.actionRow}>
              <Text style={[styles.countText, themed.textSecondary]}>{currentZones.length} {t('zonesConfigured')}</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={openAddZone}>
                <Text style={[styles.addBtnText, { color: colors.textOnAccent }]}>{t('zonesNewZone')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.zonesGrid}>
              {currentZones.length === 0 ? (
                <Text style={[styles.emptyTextZone, themed.textSecondary]}>{t('zonesNoZones')}</Text>
              ) : (
                currentZones.map(zone => {
                  const zoneColor = zone.color || (zone.type === 'Escuela' ? colors.primary : (zone.type === 'Casa' ? colors.accent : colors.error));
                  return (
                    <Surface key={zone.id} style={[styles.zoneCard, themed.surface, { borderLeftWidth: 4, borderLeftColor: zoneColor }]} elevation={1}>
                      <View style={[styles.zoneHeader, { borderColor: colors.border }]}>
                        <View style={[styles.zoneIcon, { backgroundColor: zoneColor }]}><Text style={styles.zoneIconText}>{getInitials(zone.name || zone.type || "Z")}</Text></View>
                        <View>
                          <Text style={[styles.zoneName, themed.text]}>{zone.name}</Text>
                          <Text style={[styles.zoneType, themed.textSecondary]}>{zone.type}</Text>
                        </View>
                      </View>
                    <View style={styles.zoneBody}>
                      <Text style={[styles.zoneLabel, themed.textSecondary]}>{t('live') === 'Live' ? 'Address:' : 'Dirección:'}</Text>
                      <Text style={[styles.zoneValue, themed.text]} numberOfLines={1}>{zone.address}</Text>
                      <View style={styles.zoneRow}>
                        <Text style={[styles.zoneLabel, themed.textSecondary]}>{t('live') === 'Live' ? 'Alert Radius:' : 'Radio Alerta:'}</Text>
                        <Text style={[styles.zoneValue, themed.text]}>{zone.radius}</Text>
                      </View>
                    </View>
                    <View style={styles.zoneFooter}>
                      <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary }]} onPress={() => openEditZone(zone)}>
                        <Text style={[styles.editBtnText, { color: colors.textOnPrimary }]}>{t('live') === 'Live' ? 'Edit' : 'Editar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.error }]} onPress={() => confirmDeleteZone(zone)}>
                        <Text style={[styles.deleteBtnText, { color: colors.onError }]}>{t('live') === 'Live' ? 'Delete' : 'Eliminar'}</Text>
                      </TouchableOpacity>
                    </View>
                    </Surface>
                  );
                })
              )}
            </View>

            <Surface style={[styles.mapCard, themed.surface]} elevation={1}>
              <View style={[styles.mapCardHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.mapCardTitle, themed.text]}>{t('live') === 'Live' ? 'Map Preview' : 'Vista Previa del Mapa'}</Text>
                <IconButton icon="refresh" size={19} iconColor={colors.primary} onPress={() => loadData()} accessibilityLabel="Actualizar mapa y zonas" />
              </View>
              <View style={styles.mapContainer}>
                 <SafeMap 
                    style={styles.map}
                    initialRegion={{
                      latitude: 4.5709,
                      longitude: -74.2973,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                    markers={currentZones.map(z => {
                      const zoneType = z.type || z.zoneType;
                      const markerColor = z.color || (zoneType === 'Escuela' ? colors.primary : (zoneType === 'Casa' ? colors.accent : colors.error));
                      const zoneName = z.name || z.zoneName || z.nombre || zoneType || 'Zona';
                      const center = z.center || { latitude: Number(z.latitude), longitude: Number(z.longitude) };
                      return {
                        latitude: center.latitude,
                        longitude: center.longitude,
                        color: markerColor,
                        label: getInitials(zoneName),
                        title: zoneName
                      };
                    })}
                    coordinates={routeGeometry}
                    showRoute={routeGeometry.length >= 2}
                    routePaths={routeGeometries}
                    safeZones={currentZones.map(z => ({
                      ...z,
                      center: z.center || { latitude: Number(z.latitude), longitude: Number(z.longitude) },
                      radiusMeters: Number(z.radiusMeters || parseRadiusMeters(z.radius)),
                    }))}
                 />
              </View>
            </Surface>
          </>
        )}

        {activeTab === 'routes' && (
          <>
            <View style={styles.actionRow}>
              <Text style={[styles.countText, themed.textSecondary]}>{(selectedStudent.routes || []).length} {t('zonesSavedRouteCount')}</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={openAddRoute}>
                <Text style={[styles.addBtnText, { color: colors.textOnAccent }]}>{t('zonesNewRoute')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.zonesGrid}>
              {(selectedStudent.routes || []).length === 0 ? (
                <Text style={[styles.emptyTextZone, themed.textSecondary]}>{t('live') === 'Live' ? 'No routes configured for this student.' : 'No hay rutas configuradas para este estudiante.'}</Text>
              ) : (
                (selectedStudent.routes || []).map(route => (
                  <Surface key={route.id} style={[styles.zoneCard, themed.surface, { paddingBottom: 12, borderLeftWidth: 4, borderLeftColor: colors.accent }]} elevation={1}>
                    <View style={[styles.routeHeader, { borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.routeName, themed.text]}>{route.name}</Text>
                        <Text style={[styles.routeAssign, themed.textSecondary]}>{t('live') === 'Live' ? 'Assigned to:' : 'Asignada a:'} {selectedStudent.nombre}</Text>
                      </View>
                      <View style={styles.routeStatus}>
                         <MaterialCommunityIcons name="radiobox-marked" size={12} color={colors.accent} />
                         <Text style={[styles.routeStatusText, { color: colors.accent }]}>{t('live') === 'Live' ? 'Active' : 'Activa'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.routeTimeline}>
                      <View style={styles.timelineDotGreen} />
                      <Text style={[styles.timelineText, themed.text]}>{route.start}</Text>
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                      <View style={styles.timelineDotRed} />
                      <Text style={[styles.timelineText, themed.text]}>{route.end}</Text>
                    </View>

                    <View style={styles.zoneFooter}>
                      <TouchableOpacity style={[styles.viewBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} onPress={() => openRoutePreview(route)}>
                        <MaterialCommunityIcons name={'map-outline'} size={16} color={colors.primary} />
                        <Text style={[styles.viewBtnText, { color: colors.primary }]}>{t('zonesViewMap')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary }]} onPress={() => openEditRoute(route)}>
                        <Text style={[styles.editBtnText, { color: colors.textOnPrimary }]}>{t('live') === 'Live' ? 'Edit' : 'Editar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.error }]} onPress={() => confirmDeleteRoute(route)}>
                        <Text style={[styles.deleteBtnText, { color: colors.onError }]}>{t('live') === 'Live' ? 'Delete' : 'Eliminar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </Surface>
                ))
              )}
            </View>
          </>
        )}

      </ScrollView>

      <Modal visible={!!deleteConfirmation} transparent animationType="fade" onRequestClose={() => setDeleteConfirmation(null)}>
        <View style={[styles.modalOverlay, themed.overlay]}>
          <Surface style={[styles.deleteConfirmCard, themed.surface]} elevation={5}>
            <View style={[styles.deleteConfirmIcon, { backgroundColor: colors.error + '18' }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={26} color={colors.error} />
            </View>
            <Text style={[styles.deleteConfirmTitle, themed.text]}>¿Quieres eliminar {deleteConfirmation?.type === 'route' ? 'la ruta' : 'la zona'}?</Text>
            <Text style={[styles.deleteConfirmMessage, themed.textSecondary]}>
              {deleteConfirmation?.item?.name ? `Se eliminará “${deleteConfirmation.item.name}”. Esta acción no se puede deshacer.` : 'Esta acción no se puede deshacer.'}
            </Text>
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity style={[styles.cancelBtn, styles.deleteConfirmCancel, { borderColor: colors.border }]} onPress={() => setDeleteConfirmation(null)}>
                <Text style={[styles.cancelBtnText, themed.textSecondary]}>{t('zonesCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteConfirmDelete, { backgroundColor: colors.error }]} onPress={handleConfirmDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textOnPrimary} />
                <Text style={[styles.deleteConfirmDeleteText, { color: colors.textOnPrimary }]}>{t('zonesDelete')}</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      </Modal>

      <Modal visible={!!routePreview} transparent animationType="fade" onRequestClose={() => setRoutePreview(null)}>
        <View style={[styles.modalOverlay, themed.overlay]}>
          <Surface style={[styles.modalSheet, styles.routePreviewSheet, themed.surface]} elevation={5}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, themed.text]}>{routePreview?.name || 'Mapa de ruta'}</Text>
                <Text style={[styles.routePreviewSubtitle, themed.textSecondary]}>{t('zonesFullRouteByStreets')}</Text>
              </View>
              <IconButton icon="close" size={22} iconColor={colors.textSecondary} onPress={() => setRoutePreview(null)} />
            </View>
            <View style={styles.routePreviewMap}>
              <SafeMap
                style={{ flex: 1 }}
                initialRegion={{ latitude: 4.5709, longitude: -74.2973, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                markers={getRouteCoordinates(routePreview).map((point, index, points) => ({
                  ...point,
                  label: index === 0 ? 'I' : index === points.length - 1 ? 'D' : `P${index}`,
                  title: index === 0 ? t('zonesRouteStart') : index === points.length - 1 ? t('zonesRouteEnd') : `${t('zonesRouteStop')} ${index}`,
                  color: index === 0 ? colors.accent : index === points.length - 1 ? colors.error : colors.primary,
                }))}
                coordinates={routePreviewGeometry}
                showRoute={routePreviewGeometry.length >= 2}
              />
            </View>
            <View style={styles.routePreviewDetails}>
              <Text style={[styles.routePreviewPoint, themed.text]}>{t('zonesRouteStart')}: {routePreview?.start || t('zonesNoAddress')}</Text>
              <Text style={[styles.routePreviewPoint, themed.text]}>{t('zonesRouteEnd')}: {routePreview?.end || t('zonesNoAddress')}</Text>
              {(routePreviewLoading || routePreviewError) && (
                <Text style={[styles.routePreviewPoint, { color: routePreviewError ? colors.error : colors.textSecondary }]}>
                  {routePreviewLoading ? t('zonesRouteLoading') : routePreviewError}
                </Text>
              )}
            </View>
          </Surface>
        </View>
      </Modal>
      {/* Modal Agregar / Editar Zona */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, themed.overlay]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKAV}>
            <Surface style={[styles.modalSheet, styles.zoneModalSheet, themed.surface]} elevation={5}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: form.color || colors.primary }]}>{t(editingZone ? 'zonesEditZone' : 'zonesAddZone')}</Text>
                <IconButton icon="close" size={22} iconColor={colors.textSecondary} onPress={() => setModalVisible(false)} />
              </View>
              <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator contentContainerStyle={styles.modalScroll}>
                <ZField label={t('zonesZoneName')} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder={t('zonesZoneNamePlaceholder')} color={form.color} />
                <ZField label={t('zonesAddress')} value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder={t('zonesAddressPlaceholder')} color={form.color} />
                
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <ZField
                      label={t('zonesRadius')}
                      value={form.radius}
                      onChange={v => {
                        const digits = v.replace(/\D/g, '').slice(0, 5);
                        setForm(f => ({ ...f, radius: digits ? `${digits} ${t('zonesMeters')}` : '' }));
                      }}
                      placeholder={t('zonesRadiusPlaceholder')}
                      color={form.color}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <View style={styles.typeSelector}>
                      <Text style={[styles.fieldLabel, themed.textSecondary]}>{t('zonesType')}</Text>
                      <View style={styles.typeRow}>
                        {[{ value: 'Casa', label: 'zonesTypeHome' }, { value: 'Escuela', label: 'zonesTypeSchool' }, { value: 'Personalizado', label: 'zonesTypeCustom' }].map(typeOption => {
                          const isActive = form.type === typeOption.value;
                          const activeColor = typeOption.value === 'Casa' ? colors.accent : typeOption.value === 'Escuela' ? colors.primary : colors.error;
                          
                          return (
                            <TouchableOpacity 
                              key={typeOption.value}
                              style={[
                                styles.typeChip,
                                { borderColor: colors.border },
                                isActive && { backgroundColor: activeColor, borderColor: activeColor }
                              ]}
                              onPress={() => setForm(f => ({ ...f, type: typeOption.value, color: activeColor }))}
                            >
                              <Text style={[styles.typeChipText, themed.textSecondary, isActive && styles.typeChipTextActive]}>{t(typeOption.label)}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.cancelBtnText, themed.textSecondary]}>{t('zonesCancel')}</Text>
                </TouchableOpacity>
                {editingZone && (
                  <TouchableOpacity 
                    style={[styles.deleteActionBtn, { backgroundColor: colors.errorLight }]}
                    onPress={() => {
                      setModalVisible(false);
                      confirmDeleteZone(editingZone);
                    }}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.onError }]}>{t('zonesDelete')}</Text>
                  </TouchableOpacity>
                )}
                <Button 
                  mode="contained" 
                  onPress={handleSaveZone}
                  loading={loading}
                  style={[styles.saveBtn, { backgroundColor: form.color || colors.primary }]}
                  contentStyle={styles.buttonContent}
                >
                  {editingZone ? t('zonesSave') : t('zonesCreate')}
                </Button>
              </View>
            </Surface>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Agregar/Editar Ruta */}
      <Modal visible={modalRouteVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, themed.overlay]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKAV}>
            <Surface style={[styles.modalSheet, styles.routeModalSheet, themed.surface]} elevation={5}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, themed.text]}>{t(editingRoute ? 'zonesRouteModalEditTitle' : 'zonesRouteModalAddTitle')}</Text>
                <IconButton icon="close" size={20} iconColor={colors.textSecondary} onPress={() => setModalRouteVisible(false)} />
              </View>
              <ScrollView style={styles.routeModalBody} contentContainerStyle={styles.routeModalBodyContent} showsVerticalScrollIndicator>
               {currentZones.length > 0 && (
                 <View style={styles.routeZonePicker}>
                   <Text style={[styles.routeZonePickerTitle, themed.text]}>{t('zonesUseExisting')}</Text>
                   <View style={styles.routeZoneList}>
                     {currentZones.map(zone => (
                       <View key={zone.id} style={[styles.routeZoneRow, themed.surfaceSecondary, { borderColor: colors.border }]}>
                         <Text style={[styles.routeZoneName, themed.text]} numberOfLines={1}>{zone.name}</Text>
                         <TouchableOpacity style={[styles.routeZoneAction, { backgroundColor: colors.accent }]} onPress={() => selectZoneForRoute(zone, 'origin')}>
                           <Text style={[styles.routeZoneActionText, { color: colors.textOnAccent }]}>{t('zonesStart')}</Text>
                         </TouchableOpacity>
                         <TouchableOpacity style={[styles.routeZoneAction, { backgroundColor: colors.primary }]} onPress={() => selectZoneForRoute(zone, 'destination')}>
                           <Text style={[styles.routeZoneActionText, { color: colors.textOnPrimary }]}>{t('zonesDestination')}</Text>
                         </TouchableOpacity>
                       </View>
                     ))}
                   </View>
                 </View>
               )}
               <View style={styles.routeFormBody}>
                <ZField 
                  label={`${t('zonesRouteName')} *`}
                  value={routeForm.name} 
                  onChange={v => setRouteForm({ ...routeForm, name: v })} 
                  placeholder={t('zonesRouteNamePlaceholder')}
                />
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <ZField 
                      label={t('zonesRouteStartLabel')}
                      value={routeForm.start} 
                      onChange={v => setRouteForm({ ...routeForm, start: v })} 
                      placeholder={t('zonesRouteStartPlaceholder')}
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <ZField 
                      label={t('zonesRouteEndLabel')}
                      value={routeForm.end} 
                      onChange={v => setRouteForm({ ...routeForm, end: v })} 
                      placeholder={t('zonesRouteEndPlaceholder')}
                    />
                  </View>
                </View>
                
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, themed.textSecondary]}>{t('zonesRouteStudentLabel')}</Text>
                  <TextInput 
                    style={[styles.input, themed.surfaceSecondary, { color: colors.textSecondary }]} 
                    value={selectedStudent?.nombre} 
                    editable={false} 
                  />
                </View>
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModalRouteVisible(false)}>
                  <Text style={[styles.cancelBtnText, themed.textSecondary]}>{t('zonesCancel')}</Text>
                </TouchableOpacity>
                {editingRoute && (
                  <TouchableOpacity 
                    style={[styles.deleteActionBtn, { backgroundColor: colors.errorLight }]}
                    onPress={() => {
                      setModalRouteVisible(false);
                      confirmDeleteRoute(editingRoute);
                    }}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.onError }]}>{t('zonesDelete')}</Text>
                  </TouchableOpacity>
                )}
                <Button 
                  mode="contained" 
                  onPress={handleSaveRoute}
                  loading={loading}
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  contentStyle={styles.buttonContent}
                >
                  {editingRoute ? t('zonesSave') : t('zonesCreate')}
                </Button>
              </View>
            </Surface>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function ZField({ label, value, onChange, placeholder, color, keyboardType = 'default' }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput 
        style={[
          styles.input,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
          color && { borderColor: color, borderWidth: 1.5 }
        ]} 
        value={value} 
        onChangeText={onChange} 
        keyboardType={keyboardType}
        placeholder={placeholder} 
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.FONDO_PRINCIPAL },
  scrollContent: { padding: isWeb ? 24 : 16, paddingBottom: 44, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  selectCard: { backgroundColor: COLORS.FONDO_TARJETA, padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.GRIS_BORDE },
  selectTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.NEGRO, marginBottom: 16 },
  emptyCenter: { alignItems: 'center', padding: 20 },
  emptyText: { color: COLORS.TEXTO_SECUNDARIO, fontSize: 14 },
  emptyTextZone: { textAlign: 'center', color: COLORS.TEXTO_SECUNDARIO, fontSize: 14, width: '100%', paddingVertical: 20 },
  studentGrid: { flexDirection: isWeb ? 'row' : 'column', flexWrap: 'wrap', gap: 12 },
  studentSelector: { backgroundColor: COLORS.BLANCO, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.GRIS_BORDE, marginBottom: 8, flex: isWeb ? 1 : undefined, minWidth: isWeb ? 260 : undefined },
  studentSelectorInfo: { marginLeft: 12 },
  studentSelectorName: { fontSize: 14, fontWeight: 'bold', color: COLORS.NEGRO },
  studentSelectorSub: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO, marginTop: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start' },
  backBtnText: { color: COLORS.PRIMARIO, fontSize: 14, marginLeft: 4, fontWeight: '500' },
  headerRow: { marginTop: 10, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.TEXTO_GENERAL },
  subtitle: { fontSize: 13, color: COLORS.TEXTO_SECUNDARIO, marginTop: 4 },
  headerBtn: { backgroundColor: COLORS.BLANCO, borderRadius: 8 },
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.GRIS_BORDE, borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  tabActive: { elevation: 3, shadowColor: COLORS.NEGRO, shadowOpacity: 0.16, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabText: { fontSize: 14, color: COLORS.TEXTO_SECUNDARIO, fontWeight: '500' },
  tabTextActive: { color: COLORS.PRIMARIO, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 },
  countText: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO },
  addBtn: { backgroundColor: COLORS.ACENTO, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' },
  addBtnText: { color: COLORS.BLANCO, fontSize: 12, fontWeight: 'bold' },
  zonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 },
  zoneCard: { width: isWeb ? '48%' : '100%', backgroundColor: COLORS.BLANCO, borderRadius: 10, padding: 0, overflow: 'hidden', shadowColor: COLORS.NEGRO, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: COLORS.GRIS_BORDE },
  zoneIcon: { width: 34, height: 34, borderRadius: 17, marginRight: 12, alignItems: "center", justifyContent: "center" },
  zoneIconText: { color: COLORS.BLANCO, fontSize: 12, fontWeight: "700" },
  zoneName: { fontSize: 16, fontWeight: 'bold', color: COLORS.NEGRO },
  zoneType: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO },
  zoneBody: { padding: 14, paddingBottom: 8 },
  zoneLabel: { fontSize: 11, color: COLORS.TEXTO_SECUNDARIO, marginBottom: 2 },
  zoneValue: { fontSize: 13, color: COLORS.TEXTO_GENERAL, fontWeight: '500', marginBottom: 10 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: 14, borderBottomWidth: 1, borderColor: COLORS.GRIS_BORDE },
  routeName: { fontSize: 16, fontWeight: 'bold', color: COLORS.NEGRO },
  routeAssign: { fontSize: 11, color: COLORS.TEXTO_SECUNDARIO, marginTop: 2 },
  routeStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  routeStatusText: { fontSize: 12, fontWeight: 'bold' },
  routeStatusInactive: { color: COLORS.TEXTO_SECUNDARIO },
  routeTimeline: { padding: 14, flexDirection: 'row', alignItems: 'center' },
  timelineContainer: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  timelineDotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.ACENTO },
  timelineDotRed: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.ALERTA },
  timelineLine: { flex: 1, height: 2, backgroundColor: COLORS.GRIS_BORDE, marginHorizontal: 8 },
  timelineText: { fontSize: 12, color: COLORS.NEGRO, marginHorizontal: 6, fontWeight: '500', flexShrink: 1 },
  zoneFooter: { flexDirection: 'row', padding: 14, gap: 10, paddingTop: 8 },
  viewBtn: { flex: 1, minHeight: 40, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  viewBtnText: { fontWeight: '700', fontSize: 13 },
  editBtn: { flex: 1, backgroundColor: COLORS.PRIMARIO, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { color: COLORS.BLANCO, fontWeight: '600', fontSize: 13 },
  deleteBtn: { flex: 1, backgroundColor: '#FDE2E2', minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: COLORS.ALERTA, fontWeight: '600', fontSize: 13 },
  mapCard: { height: isWeb ? 520 : 330, backgroundColor: COLORS.BLANCO, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.GRIS_BORDE },
  mapCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  mapCardTitle: { padding: 14, fontSize: 16, fontWeight: 'bold', color: COLORS.NEGRO },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: isWeb ? 24 : 10, paddingVertical: 18 },
  modalKAV: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: COLORS.BLANCO, borderRadius: 12, padding: 20, maxHeight: '90%' },
  deleteConfirmCard: { width: isWeb ? 420 : '92%', maxWidth: 460, borderRadius: 14, padding: 24, alignItems: 'center' },
  deleteConfirmIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  deleteConfirmTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  deleteConfirmMessage: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 22 },
  deleteConfirmActions: { width: '100%', flexDirection: 'row', gap: 10 },
  deleteConfirmCancel: { flex: 1 },
  deleteConfirmDelete: { flex: 1, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  deleteConfirmDeleteText: { fontWeight: '700' },
  modalSheet: { backgroundColor: COLORS.BLANCO, borderRadius: 12, width: isWeb ? '90%' : '96%', maxWidth: 1020, height: isWeb ? '92%' : '92%', maxHeight: '94%', overflow: 'hidden' },
  zoneModalSheet: { height: isWeb ? 470 : undefined, maxHeight: isWeb ? 470 : '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.NEGRO },
  inputBox: { marginBottom: 16 },
  modalFormScroll: { flex: 1, minHeight: 0 },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  formRow: { flexDirection: isWeb ? 'row' : 'column', gap: isWeb ? 14 : 0 },
  formHalf: { flex: 1 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: COLORS.TEXTO_SECUNDARIO, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: COLORS.FONDO_PRINCIPAL, borderWidth: 1, borderColor: COLORS.GRIS_BORDE, borderRadius: 8, paddingHorizontal: 12, minHeight: 44, fontSize: 14, color: COLORS.TEXTO_GENERAL },
  typeSelector: { marginBottom: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  typeChip: { minHeight: 34, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: COLORS.GRIS_BORDE, justifyContent: 'center' },
  typeChipActive: { backgroundColor: COLORS.PRIMARIO, borderColor: COLORS.PRIMARIO },
  typeChipText: { fontSize: 11, color: COLORS.TEXTO_SECUNDARIO },
  typeChipTextActive: { color: COLORS.BLANCO, fontWeight: 'bold' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, flexShrink: 0 },
  cancelBtn: { flex: isWeb ? undefined : 1, minWidth: isWeb ? 110 : 0, minHeight: 44, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { color: COLORS.TEXTO_SECUNDARIO, fontWeight: 'bold' },
  deleteActionBtn: { flex: isWeb ? undefined : 1, minWidth: isWeb ? 110 : 0, minHeight: 44, paddingHorizontal: 18, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flex: isWeb ? undefined : 1, minHeight: 44, minWidth: isWeb ? 120 : 0, borderRadius: 8, justifyContent: 'center', backgroundColor: COLORS.PRIMARIO },
  buttonContent: { minHeight: 44 },
  routeZonePicker: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  routeModalSheet: { height: isWeb ? '90%' : '92%', maxHeight: '96%' },
  routeModalBody: { flex: 1, minHeight: 0 },
  routeModalBodyContent: { paddingBottom: 12 },
  routeFormBody: { paddingHorizontal: 20, paddingTop: 4 },
  routePreviewSheet: { width: isWeb ? '94%' : '96%', maxWidth: 980, height: isWeb ? '82%' : '88%' },
  routePreviewMap: { flex: 1, minHeight: 260, margin: 16, overflow: 'hidden', borderRadius: 10 },
  routePreviewDetails: { gap: 6, paddingHorizontal: 18, paddingBottom: 16 },
  routePreviewPoint: { fontSize: 13, fontWeight: '600' },
  routePreviewSubtitle: { fontSize: 12, marginTop: 2 },

  routeMapFrame: { height: isWeb ? 170 : 150, marginHorizontal: 20, marginTop: 14, overflow: 'hidden', borderRadius: 10 },
  routeZoneList: { gap: 6 },
  routeZonePickerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  routeZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, padding: 6, marginBottom: 4, minHeight: 38 },
  routeZoneName: { flex: 1, fontSize: 12, fontWeight: '600' },
  routeZoneAction: { minHeight: 32, paddingHorizontal: 10, borderRadius: 6, justifyContent: 'center', backgroundColor: COLORS.ACENTO },
  routeZoneActionText: { color: COLORS.BLANCO, fontSize: 11, fontWeight: '700' },
  routePlannerControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 10 },
  routePlannerBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.GRIS_BORDE, justifyContent: 'center' },
  routePlannerBtnActive: { backgroundColor: COLORS.PRIMARIO, borderColor: COLORS.PRIMARIO },
  routePlannerBtnDisabled: { opacity: 0.45 },
  routePlannerBtnText: { color: COLORS.TEXTO_GENERAL, fontSize: 12, fontWeight: '600' },
  routePlannerReset: { minHeight: 36, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', backgroundColor: COLORS.ALERTA_CLARO },
  routePlannerResetText: { color: COLORS.ALERTA, fontSize: 12, fontWeight: '700' },
  saveBtnText: { color: COLORS.BLANCO, fontWeight: 'bold' }
});










