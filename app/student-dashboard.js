import React from 'react';
import { Alert, Linking, Platform, View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studentService } from '../services/student.service';
import { trackingService } from '../services/tracking.service';
import {
  flushQueue,
  getActiveTripId,
  getChildSession,
  getQueueSize,
  isTrackingActive,
  requestPermissions,
  saveChildSession,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '../services/background/locationTracking';
import { BASE_URL } from '../config/endpoints';
import { AppTypography } from '../theme/tokens';
import PermissionGate from '../features/child/components/PermissionGate';
import SharingStatusCard from '../features/child/components/SharingStatusCard';
import TripControls from '../features/child/components/TripControls';
import TripMap from '../features/child/components/TripMap';

const DEVICE_ID_KEY = '@guardian_student_device_id';

const GRADE_LABELS = {
  PRE_KINDER: 'Pre Kinder',
  KINDER: 'Kinder',
  TRANSITION: 'Transicion',
  FIRST: 'Primero',
  SECOND: 'Segundo',
  THIRD: 'Tercero',
  FOURTH: 'Cuarto',
  FIFTH: 'Quinto',
  SIXTH: 'Sexto',
  SEVENTH: 'Septimo',
  EIGHTH: 'Octavo',
  NINTH: 'Noveno',
  TENTH: 'Decimo',
  ELEVENTH: 'Undecimo',
};

async function getStudentDeviceId() {
  const current = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (current) return current;
  const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const next = `student-device-${randomId}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

function platformName() {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
}

function calculateAge(birthDate) {
  if (!birthDate) return '';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
}

export default function StudentDashboardScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const [studentProfile, setStudentProfile] = React.useState(null);
  
  // Datos del estudiante
  const studentName = studentProfile?.fullName || studentProfile?.nombreCompleto || params.nombre || 'Estudiante';
  const studentAge = calculateAge(studentProfile?.birthDate || studentProfile?.fechaNacimiento) || params.edad || 'No especificada';
  const studentGrade = GRADE_LABELS[studentProfile?.schoolGrade || studentProfile?.gradoEscolar] || params.grado || 'No especificado';
  const [storedSession, setStoredSession] = React.useState({ childToken: '', studentId: '', activeTripId: '' });
  const studentId = params.id || storedSession.studentId || 'No asignado';
  const studentCode = params.codigo || 'No asignado';
  const [linkStatus, setLinkStatus] = React.useState('idle');
  const [linkedCount, setLinkedCount] = React.useState(null);
  const [linkError, setLinkError] = React.useState('');
  const [trackingStatus, setTrackingStatus] = React.useState('paused');
  const [trackingLoading, setTrackingLoading] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState('');
  const [activeTripId, setActiveTripId] = React.useState('');
  const [queueSize, setQueueSize] = React.useState(0);
  const [sentCount, setSentCount] = React.useState(0);

  // Datos del contacto de emergencia enviados por el QR.
  const parentName = studentProfile?.contactName || studentProfile?.contactoNombre || params.contacto || user?.name || 'No registrado';
  const parentPhone = studentProfile?.contactPhone || studentProfile?.contactoTelefono || params.telefono || user?.phone || '';

  React.useEffect(() => {
    let mounted = true;
    const connectStudent = async () => {
      try {
        if (!params.id || !params.codigo) {
          const session = await getChildSession();
          if (mounted) {
            setStoredSession(session);
            setActiveTripId(session.activeTripId || '');
            setLinkStatus(session.studentId ? 'linked' : 'idle');
          }
          return;
        }
        const profile = await studentService.linkedProfile(String(params.id), String(params.codigo));
        if (mounted) {
          setStudentProfile(profile);
        }
        const deviceIdentifier = await getStudentDeviceId();
        const response = await studentService.linkDevice({
          studentId: String(params.id),
          code: String(params.codigo),
          deviceIdentifier,
          platform: platformName(),
          deviceName: Platform.OS === 'web' ? 'Navegador del estudiante' : 'Celular del estudiante',
        });
        if (!mounted) return;
        await saveChildSession({
          childToken: response.childToken || response.token || response.studentToken,
          studentId: String(params.id),
        });
        const session = await getChildSession();
        if (mounted) setStoredSession(session);
        setLinkedCount(response.linkedDevices);
        setLinkStatus('linked');
      } catch (error) {
        if (!mounted) return;
        setLinkError(error.message || 'No se pudo conectar con el backend.');
        setLinkStatus('error');
      }
    };

    connectStudent();
    return () => {
      mounted = false;
    };
  }, [params.codigo, params.id]);

  React.useEffect(() => {
    let mounted = true;
    const restoreTracking = async () => {
      const [tripId, active, size] = await Promise.all([
        getActiveTripId(),
        isTrackingActive(),
        getQueueSize(),
      ]);
      if (!mounted) return;
      setActiveTripId(tripId || '');
      setQueueSize(size);
      setTrackingStatus(active ? 'sharing' : 'paused');
      if (tripId && !active && Platform.OS !== 'web') {
        try {
          await startBackgroundUpdates(tripId);
          if (mounted) setTrackingStatus('sharing');
        } catch (error) {
          if (mounted) setPermissionError(error.message || 'No se pudo reanudar el rastreo.');
        }
      }
    };

    restoreTracking();
    const timer = setInterval(async () => {
      const [size, active] = await Promise.all([getQueueSize(), isTrackingActive()]);
      if (mounted) {
        setQueueSize(size);
        setTrackingStatus(active ? 'sharing' : 'paused');
      }
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleStartTracking = async () => {
    setTrackingLoading(true);
    setPermissionError('');
    try {
      const permission = await requestPermissions();
      if (!permission.granted) {
        setPermissionError(permission.reason);
        setTrackingStatus('paused');
        return;
      }

      const session = await getChildSession();
      const resolvedStudentId = params.id || session.studentId;
      if (!resolvedStudentId) {
        setPermissionError('Primero vincula este celular con el QR del acudiente.');
        return;
      }

      const trip = await trackingService.startTrip({
        studentId: String(resolvedStudentId),
        tripStartedAt: new Date().toISOString(),
      }, { childToken: session.childToken });
      const tripId = String(trip.id || trip.tripId || trip.uuid || '');
      if (!tripId) {
        throw new Error('El backend no devolvió el identificador del trayecto.');
      }

      await saveChildSession({ childToken: session.childToken, studentId: String(resolvedStudentId) });
      await startBackgroundUpdates(tripId);
      const result = await flushQueue();
      setSentCount(count => count + result.sent);
      setQueueSize(result.remaining);
      setActiveTripId(tripId);
      setTrackingStatus('sharing');
    } catch (error) {
      setPermissionError(error.message || 'No se pudo iniciar el rastreo del trayecto.');
      setTrackingStatus('paused');
    } finally {
      setTrackingLoading(false);
    }
  };

  const finishTracking = async () => {
    setTrackingLoading(true);
    try {
      await stopBackgroundUpdates();
      const result = await flushQueue();
      if (activeTripId) {
        await trackingService.updateStatus(activeTripId, {
          status: 'FINISHED',
          tripEndedAt: new Date().toISOString(),
        }).catch(() => null);
      }
      setSentCount(count => count + result.sent);
      setQueueSize(result.remaining);
      setActiveTripId('');
      setTrackingStatus('paused');
    } catch (error) {
      Alert.alert('No se pudo finalizar', error.message || 'Intenta nuevamente para detener el rastreo.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const confirmFinishTracking = () => {
    Alert.alert(
      'Finalizar trayecto',
      '¿Seguro que quieres detener el envío de ubicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Finalizar', style: 'destructive', onPress: finishTracking },
      ]
    );
  };

  const callEmergencyContact = async () => {
    const phoneDigits = String(parentPhone).replace(/[^\d+]/g, '');
    if (!phoneDigits || phoneDigits === 'No registrado') {
      Alert.alert('Contacto no disponible', 'Este QR no tiene un teléfono de emergencia válido.');
      return;
    }

    const phoneUrl = `tel:${phoneDigits}`;
    const supported = await Linking.canOpenURL(phoneUrl);
    if (!supported) {
      Alert.alert('No se puede llamar', 'Este dispositivo no permite abrir llamadas telefonicas.');
      return;
    }
    await Linking.openURL(phoneUrl);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.textOnPrimary }]}>GPS Guardian Escolar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {linkStatus !== 'idle' && (
            <Surface
              style={[
                styles.connectionCard,
                linkStatus === 'linked' ? styles.connectionCardOk : styles.connectionCardError,
              ]}
              elevation={1}
            >
              <MaterialCommunityIcons
                name={linkStatus === 'linked' ? 'check-circle' : 'alert-circle'}
                size={22}
                color={linkStatus === 'linked' ? colors.success : colors.error}
              />
              <View style={styles.connectionTextWrap}>
                <Text
                  style={[
                    styles.connectionTitle,
                    { color: linkStatus === 'linked' ? colors.success : colors.error },
                  ]}
                >
                  {linkStatus === 'linked' ? 'Celular conectado al estudiante' : 'No se pudo conectar este celular'}
                </Text>
                <Text style={styles.connectionSubtitle}>
                  {linkStatus === 'linked'
                    ? `Este celular ya puede enviar ubicación. Dispositivos vinculados: ${linkedCount ?? 1}.`
                    : linkError || 'Verifica que el QR sea válido o vuelve a escanearlo.'}
                </Text>
                {linkStatus === 'error' && (
                  <Text style={styles.connectionDebug} numberOfLines={1}>
                    API: {BASE_URL}
                  </Text>
                )}
              </View>
            </Surface>
          )}

          <SharingStatusCard
            status={trackingStatus}
            queueSize={queueSize}
            sentCount={sentCount}
            activeTripId={activeTripId}
          />
          <TripMap coordinates={[]} />
          <PermissionGate message={permissionError} onRetry={handleStartTracking} />
          <TripControls
            status={trackingStatus}
            loading={trackingLoading}
            onStart={handleStartTracking}
            onFinish={confirmFinishTracking}
          />

          {/* Card 1: Mi Información */}
          <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Mi información</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoColFull}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Nombre Completo</Text>
                <Text style={[styles.value, { color: colors.text }]}>{studentName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Edad</Text>
                <Text style={[styles.value, { color: colors.text }]}>{studentAge}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Grado</Text>
                <Text style={[styles.value, { color: colors.text }]}>{studentGrade}</Text>
              </View>
            </View>

            <View style={[styles.idBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>ID Estudiante: {studentId}</Text>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>Código QR: {studentCode}</Text>
            </View>
          </Surface>

          {/* Card 2: Contacto de Emergencia */}
          <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="phone" size={24} color={colors.textSecondary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Contacto de Emergencia</Text>
            </View>

            <View style={styles.inputSim}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nombre Completo</Text>
              <View style={[styles.inputField, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.inputValue, { color: colors.text }]}>{parentName}</Text>
              </View>
            </View>

            <View style={styles.inputSim}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefono</Text>
              <View style={[styles.inputField, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.inputValue, { color: colors.primary }]}>{parentPhone}</Text>
              </View>
            </View>

            <Button 
              mode="contained" 
              buttonColor={colors.error} 
              textColor={colors.onError || colors.textOnPrimary}
              style={styles.emergencyBtn}
              disabled={!parentPhone}
              onPress={callEmergencyContact}
            >
              Llamar Emergencia
            </Button>
          </Surface>

          {/* Card 3: ¿Como funciona el rastreo? */}
          <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="target" size={24} color={colors.error} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>¿Como funciona el rastreo?</Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>La aplicación envía tu ubicación en segundo plano automáticamente</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Solo tus padres pueden ver dónde estás</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>Tus datos están protegidos con encriptación</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>No necesitas abrir la app, funciona automáticamente</Text>
              </View>
            </View>
          </Surface>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  connectionCardOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  connectionCardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  connectionTextWrap: {
    flex: 1,
  },
  connectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  connectionSubtitle: {
    color: '#4B5563',
    fontSize: 12,
    marginTop: 2,
  },
  connectionDebug: {
    color: '#6B7280',
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoColFull: {
    flex: 1,
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  idBox: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  idText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  inputSim: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    color: '#9CA3AF',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  emergencyBtn: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 4,
  },
  trackingBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trackingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  debugBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginTop: 12,
    padding: 12,
  },
  debugText: {
    fontSize: 12,
    lineHeight: 16,
  },
  trackingButton: {
    borderRadius: 8,
    marginTop: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  bulletList: {
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
});
