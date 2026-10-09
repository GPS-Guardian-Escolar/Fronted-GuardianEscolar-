import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Surface, Avatar, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '../../constants/colors';
import SafeMap from '../../components/SafeMap';
import { getStudents, addZone, updateZone, deleteZone, getInitials, addRoute, updateRoute, deleteRoute } from '../../utils/studentStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isWeb = width > 768;

const EMPTY_ZONE = { name: '', type: 'Personalizado', address: '', radius: '100 Metros', color: COLORS.PRIMARIO };
const VALID_ZONE_TYPES = ['Casa', 'Escuela', 'Personalizado'];

function parseRadiusMeters(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits ? Number(digits) : Number.NaN;
}

function normalizeZoneForm(zone) {
  const radius = parseRadiusMeters(zone.radius);
  return {
    ...zone,
    name: zone.name.trim(),
    address: zone.address.trim(),
    radius: `${radius} Metros`,
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

function requestErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    return Object.values(data.errors).flat().join(' ');
  }
  if (error?.message?.includes('geocod')) return error.message;
  return fallback;
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
        Alert.alert(t('error'), error.message || 'No se pudieron cargar los estudiantes.');
      });
    }, [loadData, t])
  );

  function openAddZone() {
    setEditingZone(null);
    setForm(EMPTY_ZONE);
    setModalVisible(true);
  }

  function openEditZone(zone) {
    setEditingZone(zone);
    setForm(zone);
    setModalVisible(true);
  }

  async function handleSaveZone() {
    const radius = parseRadiusMeters(form.radius);
    if (!form.name.trim() || !form.address.trim()) {
      Alert.alert(t('zonesRequiredFields'), t('zonesRequiredZoneMsg'));
      return;
    }
    if (form.name.trim().length < 2 || form.name.trim().length > 100) {
      Alert.alert(t('zonesRequiredFields'), 'El nombre de la zona debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (form.address.trim().length < 5 || form.address.trim().length > 160) {
      Alert.alert(t('zonesRequiredFields'), 'La dirección debe tener entre 5 y 160 caracteres.');
      return;
    }
    if (!Number.isInteger(radius) || radius < 10 || radius > 50000) {
      Alert.alert(t('zonesRequiredFields'), 'El radio debe ser un numero entre 10 y 50000 metros.');
      return;
    }
    const payload = normalizeZoneForm(form);
    setLoading(true);
    try {
      if (editingZone) {
        await updateZone(selectedStudent.id, editingZone.id, payload);
      } else {
        await addZone(selectedStudent.id, payload);
      }
      await loadData();
      setModalVisible(false);
      Alert.alert('Zona guardada', 'La zona fue geocodificada y guardada correctamente.');
    } catch (error) {
      Alert.alert('No se pudo guardar la zona', requestErrorMessage(error, 'Verifica la dirección y el radio e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteZone(zone) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Eliminar la zona "${zone.name}"?`);
      if (confirmed) {
        (async () => {
          await deleteZone(selectedStudent.id, zone.id);
          await loadData();
        })();
      }
      return;
    }

    Alert.alert(
      'Eliminar Zona',
      `¿Eliminar la zona "${zone.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteZone(selectedStudent.id, zone.id);
            await loadData();
          },
        },
      ]
    );
  }

  function openAddRoute() {
    setEditingRoute(null);
    setRouteForm(EMPTY_ROUTE);
    setModalRouteVisible(true);
  }

  function openEditRoute(route) {
    setEditingRoute(route);
    setRouteForm(route);
    setModalRouteVisible(true);
  }

  async function handleSaveRoute() {
    if (!routeForm.name.trim() || !routeForm.start.trim() || !routeForm.end.trim()) {
      Alert.alert(t('zonesRequiredFields'), t('zonesRequiredRouteMsg'));
      return;
    }
    if (routeForm.name.trim().length < 2 || routeForm.name.trim().length > 100) {
      Alert.alert(t('zonesRequiredFields'), 'El nombre de la ruta debe tener entre 2 y 100 caracteres.');
      return;
    }
    if (routeForm.start.trim().length < 3 || routeForm.start.trim().length > 160) {
      Alert.alert(t('zonesRequiredFields'), 'El punto inicial debe tener entre 3 y 160 caracteres.');
      return;
    }
    if (routeForm.end.trim().length < 3 || routeForm.end.trim().length > 160) {
      Alert.alert(t('zonesRequiredFields'), 'El punto final debe tener entre 3 y 160 caracteres.');
      return;
    }
    const payload = normalizeRouteForm(routeForm);
    setLoading(true);
    try {
      if (editingRoute) {
        await updateRoute(selectedStudent.id, editingRoute.id, payload);
      } else {
        await addRoute(selectedStudent.id, payload);
      }
      await loadData();
      setModalRouteVisible(false);
      Alert.alert('Ruta guardada', 'La ruta fue geocodificada y guardada correctamente.');
    } catch (error) {
      Alert.alert('No se pudo guardar la ruta', requestErrorMessage(error, 'Verifica los puntos inicial y final e inténtalo de nuevo.'));
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteRoute(route) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`¿Eliminar la ruta "${route.name}"?`);
      if (confirmed) {
        (async () => {
          await deleteRoute(selectedStudent.id, route.id);
          await loadData();
        })();
      }
      return;
    }

    Alert.alert(
      'Eliminar Ruta',
      `¿Eliminar la ruta "${route.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteRoute(selectedStudent.id, route.id);
            await loadData();
          },
        },
      ]
    );
  }

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

  const currentZones = selectedStudent.zones || [];

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
            style={[styles.tab, activeTab === 'zones' && [styles.tabActive, { backgroundColor: colors.surface }]]} 
            onPress={() => setActiveTab('zones')}
          >
            <Text style={[styles.tabText, themed.textSecondary, activeTab === 'zones' && { color: colors.primary, fontWeight: 'bold' }]}>{t('zonesSafeZones')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'routes' && [styles.tabActive, { backgroundColor: colors.surface }]]} 
            onPress={() => setActiveTab('routes')}
          >
            <Text style={[styles.tabText, themed.textSecondary, activeTab === 'routes' && { color: colors.primary, fontWeight: 'bold' }]}>{t('zonesSavedRoutes')}</Text>
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
                  const zoneColor = zone.type === 'Escuela' ? colors.primary : (zone.type === 'Casa' ? colors.accent : colors.error);
                  return (
                    <Surface key={zone.id} style={[styles.zoneCard, themed.surface, { borderLeftWidth: 4, borderLeftColor: zoneColor }]} elevation={1}>
                      <View style={[styles.zoneHeader, { borderColor: colors.border }]}>
                        <View style={[styles.zoneIcon, { backgroundColor: zoneColor }]} />
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
                      <TouchableOpacity style={[styles.editBtn, themed.surfaceSecondary]} onPress={() => openEditZone(zone)}>
                        <Text style={[styles.editBtnText, { color: colors.primary }]}>{t('live') === 'Live' ? 'Edit' : 'Editar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.errorLight }]} onPress={() => confirmDeleteZone(zone)}>
                        <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('live') === 'Live' ? 'Delete' : 'Eliminar'}</Text>
                      </TouchableOpacity>
                    </View>
                    </Surface>
                  );
                })
              )}
            </View>

            <Surface style={[styles.mapCard, themed.surface]} elevation={1}>
              <Text style={[styles.mapCardTitle, themed.text, { borderBottomColor: colors.border }]}>{t('live') === 'Live' ? 'Map Preview' : 'Vista Previa del Mapa'}</Text>
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
                      const markerColor = z.type === 'Escuela' ? colors.primary : (z.type === 'Casa' ? colors.accent : colors.error);
                      const center = z.center || { latitude: Number(z.latitude), longitude: Number(z.longitude) };
                      return {
                        latitude: center.latitude,
                        longitude: center.longitude,
                        color: markerColor,
                        title: z.name
                      };
                    })}
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
              <Text style={[styles.countText, themed.textSecondary]}>{(selectedStudent.routes || []).length} {t('live') === 'Live' ? 'saved routes' : 'rutas guardadas'}</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={openAddRoute}>
                <Text style={[styles.addBtnText, { color: colors.textOnAccent }]}>{t('live') === 'Live' ? '+ New Route' : '+ Nueva Ruta'}</Text>
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
                      <TouchableOpacity style={[styles.editBtn, themed.surfaceSecondary]} onPress={() => openEditRoute(route)}>
                        <Text style={[styles.editBtnText, { color: colors.primary }]}>{t('live') === 'Live' ? 'Edit' : 'Editar'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.errorLight }]} onPress={() => confirmDeleteRoute(route)}>
                        <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('live') === 'Live' ? 'Delete' : 'Eliminar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </Surface>
                ))
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* Modal Agregar / Editar Zona */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, themed.overlay]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKAV}>
            <Surface style={[styles.modalSheet, themed.surface]} elevation={5}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: form.color || colors.primary }]}>{editingZone ? 'Editar Zona' : 'Nueva Zona Segura'}</Text>
                <IconButton icon="close" size={22} iconColor={colors.textSecondary} onPress={() => setModalVisible(false)} />
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <ZField label="Nombre de la zona" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ej: Casa, Escuela..." color={form.color} />
                <ZField label="Direccion" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Ej: Calle 123..." color={form.color} />
                
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <ZField
                      label="Radio de alerta"
                      value={form.radius}
                      onChange={v => {
                        const digits = v.replace(/\D/g, '').slice(0, 5);
                        setForm(f => ({ ...f, radius: digits ? `${digits} Metros` : '' }));
                      }}
                      placeholder="Ej: 100 Metros"
                      color={form.color}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <View style={styles.typeSelector}>
                      <Text style={[styles.fieldLabel, themed.textSecondary]}>Tipo de zona</Text>
                      <View style={styles.typeRow}>
                        {['Casa', 'Escuela', 'Personalizado'].map(t => {
                          const isActive = form.type === t;
                          const activeColor = t === 'Casa' ? colors.accent : t === 'Escuela' ? colors.primary : colors.error;
                          
                          return (
                            <TouchableOpacity 
                              key={t} 
                              style={[
                                styles.typeChip,
                                { borderColor: colors.border },
                                isActive && { backgroundColor: activeColor, borderColor: activeColor }
                              ]}
                              onPress={() => setForm(f => ({ ...f, type: t, color: activeColor }))}
                            >
                              <Text style={[styles.typeChipText, themed.textSecondary, isActive && styles.typeChipTextActive]}>{t}</Text>
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
                  <Text style={[styles.cancelBtnText, themed.textSecondary]}>Cancelar</Text>
                </TouchableOpacity>
                {editingZone && (
                  <TouchableOpacity 
                    style={[styles.deleteActionBtn, { backgroundColor: colors.errorLight }]}
                    onPress={() => {
                      setModalVisible(false);
                      confirmDeleteZone(editingZone);
                    }}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <Button 
                  mode="contained" 
                  onPress={handleSaveZone}
                  loading={loading}
                  style={[styles.saveBtn, { backgroundColor: form.color || colors.primary }]}
                  contentStyle={styles.buttonContent}
                >
                  {editingZone ? 'Guardar' : 'Crear'}
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
            <Surface style={[styles.modalSheet, themed.surface]} elevation={5}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, themed.text]}>{editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}</Text>
                <IconButton icon="close" size={20} iconColor={colors.textSecondary} onPress={() => setModalRouteVisible(false)} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                <ZField 
                  label="Nombre de la ruta *" 
                  value={routeForm.name} 
                  onChange={v => setRouteForm({ ...routeForm, name: v })} 
                  placeholder="Ej. Casa - Colegio" 
                />
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <ZField 
                      label="Direccion inicial" 
                      value={routeForm.start} 
                      onChange={v => setRouteForm({ ...routeForm, start: v })} 
                      placeholder="Lugar de inicio" 
                    />
                  </View>
                  <View style={styles.formHalf}>
                    <ZField 
                      label="Direccion final" 
                      value={routeForm.end} 
                      onChange={v => setRouteForm({ ...routeForm, end: v })} 
                      placeholder="Lugar de destino" 
                    />
                  </View>
                </View>
                
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, themed.textSecondary]}>Estudiante</Text>
                  <TextInput 
                    style={[styles.input, themed.surfaceSecondary, { color: colors.textSecondary }]} 
                    value={selectedStudent?.nombre} 
                    editable={false} 
                  />
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setModalRouteVisible(false)}>
                  <Text style={[styles.cancelBtnText, themed.textSecondary]}>Cancelar</Text>
                </TouchableOpacity>
                {editingRoute && (
                  <TouchableOpacity 
                    style={[styles.deleteActionBtn, { backgroundColor: colors.errorLight }]}
                    onPress={() => {
                      setModalRouteVisible(false);
                      confirmDeleteRoute(editingRoute);
                    }}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <Button 
                  mode="contained" 
                  onPress={handleSaveRoute}
                  loading={loading}
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  contentStyle={styles.buttonContent}
                >
                  {editingRoute ? 'Guardar' : 'Crear'}
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
  tabActive: { backgroundColor: COLORS.BLANCO, elevation: 2 },
  tabText: { fontSize: 14, color: COLORS.TEXTO_SECUNDARIO, fontWeight: '500' },
  tabTextActive: { color: COLORS.PRIMARIO, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 },
  countText: { fontSize: 12, color: COLORS.TEXTO_SECUNDARIO },
  addBtn: { backgroundColor: COLORS.ACENTO, minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' },
  addBtnText: { color: COLORS.BLANCO, fontSize: 12, fontWeight: 'bold' },
  zonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 },
  zoneCard: { width: isWeb ? '48.5%' : '100%', backgroundColor: COLORS.BLANCO, borderRadius: 10, padding: 0, overflow: 'hidden', shadowColor: COLORS.NEGRO, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: COLORS.GRIS_BORDE },
  zoneIcon: { width: 34, height: 34, borderRadius: 17, marginRight: 12 },
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
  editBtn: { flex: 1, backgroundColor: COLORS.FONDO_PRINCIPAL, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { color: COLORS.PRIMARIO, fontWeight: '600', fontSize: 13 },
  deleteBtn: { flex: 1, backgroundColor: COLORS.ALERTA_CLARO, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: COLORS.ALERTA, fontWeight: '600', fontSize: 13 },
  mapCard: { height: isWeb ? 340 : 300, backgroundColor: COLORS.BLANCO, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.GRIS_BORDE },
  mapCardTitle: { padding: 14, fontSize: 16, fontWeight: 'bold', color: COLORS.NEGRO, borderBottomWidth: 1, borderBottomColor: COLORS.GRIS_BORDE },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: isWeb ? 24 : 10, paddingVertical: 18 },
  modalKAV: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: COLORS.BLANCO, borderRadius: 12, padding: 20, maxHeight: '90%' },
  modalSheet: { backgroundColor: COLORS.BLANCO, borderRadius: 12, width: isWeb ? '90%' : '96%', maxWidth: 1020, maxHeight: '92%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.NEGRO },
  inputBox: { marginBottom: 16 },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
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
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  cancelBtn: { flex: isWeb ? undefined : 1, minWidth: isWeb ? 110 : 0, minHeight: 44, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { color: COLORS.TEXTO_SECUNDARIO, fontWeight: 'bold' },
  deleteActionBtn: { flex: isWeb ? undefined : 1, minWidth: isWeb ? 110 : 0, minHeight: 44, paddingHorizontal: 18, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flex: isWeb ? undefined : 1, minHeight: 44, minWidth: isWeb ? 120 : 0, borderRadius: 8, justifyContent: 'center', backgroundColor: COLORS.PRIMARIO },
  buttonContent: { minHeight: 44 },
  saveBtnText: { color: COLORS.BLANCO, fontWeight: 'bold' }
});
