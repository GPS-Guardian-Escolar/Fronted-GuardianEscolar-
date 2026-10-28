import React from 'react';
import { Alert, Linking, Platform, View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { studentService } from '../services/student.service';
import { trackingService } from '../services/tracking.service';
import {
  flushQueue,
  getActiveTripId,
  getChildSession,
  clearChildSession,
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
import LanguageSelector from '../components/common/LanguageSelector';

const DEVICE_ID_KEY = '@guardian_student_device_id';

const GRADE_KEYS = {
  PRE_KINDER: 'gradePreKinder', KINDER: 'gradeKinder', TRANSITION: 'gradeTransition',
  FIRST: 'gradeFirst', SECOND: 'gradeSecond', THIRD: 'gradeThird', FOURTH: 'gradeFourth',
  FIFTH: 'gradeFifth', SIXTH: 'gradeSixth', SEVENTH: 'gradeSeventh', EIGHTH: 'gradeEighth',
  NINTH: 'gradeNinth', TENTH: 'gradeTenth', ELEVENTH: 'gradeEleventh',
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

function distanceBetweenCoordinates(a, b) {
  const radians = value => (value * Math.PI) / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export default function StudentDashboardScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const [studentProfile, setStudentProfile] = React.useState(null);
  
  // Datos del estudiante
  const studentName = studentProfile?.fullName || studentProfile?.nombreCompleto || params.nombre || t('studentLabel');
  const studentAge = calculateAge(studentProfile?.birthDate || studentProfile?.fechaNacimiento) || params.edad || t('notSpecified');
  const studentGradeCode = studentProfile?.schoolGrade || studentProfile?.gradoEscolar;
  const studentGrade = (studentGradeCode && GRADE_KEYS[studentGradeCode] && t(GRADE_KEYS[studentGradeCode])) || params.grado || t('notSpecified');
  const [storedSession, setStoredSession] = React.useState({ childToken: '', studentId: '', activeTripId: '' });
  const studentId = params.id || storedSession.studentId || t('studNotAssigned');
  const studentCode = params.codigo || t('studNotAssigned');
  const [linkStatus, setLinkStatus] = React.useState('idle');
  const [linkedCount, setLinkedCount] = React.useState(null);
  const [linkError, setLinkError] = React.useState('');
  const [trackingStatus, setTrackingStatus] = React.useState('paused');
  const [trackingLoading, setTrackingLoading] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState('');
  const [activeTripId, setActiveTripId] = React.useState('');
  const [queueSize, setQueueSize] = React.useState(0);
  const [sentCount, setSentCount] = React.useState(0);
  const [tripCoordinates, setTripCoordinates] = React.useState([]);

  // Datos del contacto de emergencia enviados por el QR.
  const parentName = studentProfile?.contactName || studentProfile?.contactoNombre || params.contacto || user?.name || t('notRegistered');
  const parentPhone = studentProfile?.contactPhone || studentProfile?.contactoTelefono || params.telefono || user?.phone || '';

  React.useEffect(() => {
    let mounted = true;
    const connectStudent = async () => {
      try {
        const existingSession = await getChildSession();
        const resolvedStudentId = params.id || existingSession.studentId;
        const resolvedCode = params.codigo || existingSession.studentCode;

        if (!resolvedStudentId || !resolvedCode) {
          await clearChildSession();
          if (mounted) router.replace('/welcome');
          return;
        }

        // The QR link code is single-use. Once this device already has a child
        // token, do not validate the consumed code again after navigation.
        if (existingSession.childToken && String(existingSession.studentId) === String(resolvedStudentId)) {
          if (mounted) {
            setStudentProfile({
              id: resolvedStudentId,
              fullName: params.nombre || '',
              contactPhone: params.telefono || '',
            });
            setStoredSession(existingSession);
            setActiveTripId(existingSession.activeTripId || '');
            setLinkStatus('linked');
          }
          return;
        }

        const profile = await studentService.linkedProfile(String(resolvedStudentId), String(resolvedCode));
        const linkedDevices = Number(profile?.linkedDevices);
        if (!Number.isFinite(linkedDevices) || linkedDevices < 1) {
          await clearChildSession();
          if (mounted) router.replace('/welcome');
          return;
        }

        if (mounted) {
          setStudentProfile(profile);
          setLinkedCount(linkedDevices);
        }

        const deviceIdentifier = await getStudentDeviceId();
        const response = await studentService.linkDevice({
          studentId: String(resolvedStudentId),
          code: String(resolvedCode),
          deviceIdentifier,
          platform: platformName(),
          deviceName: Platform.OS === 'web' ? 'Navegador del estudiante' : 'Celular del estudiante',
        });
        if (!mounted) return;
        await saveChildSession({
          childToken: response.childToken || response.token || response.studentToken,
          studentId: String(resolvedStudentId),
          code: String(resolvedCode),
        });
        const session = await getChildSession();
        if (mounted) {
          setStoredSession(session);
          setLinkedCount(response.linkedDevices);
          setLinkStatus('linked');
        }
      } catch (error) {
        if (!mounted) return;
        const status = error?.response?.status;
        if (status === 401 || status === 404) {
          await clearChildSession();
          router.replace('/welcome');
          return;
        }
        setLinkError('No se pudo conectar con el servidor. Revisa la conexión e inténtalo nuevamente.');
        setLinkStatus('error');
      }
    };

    connectStudent();
    return () => {
      mounted = false;
    };
  }, [params.codigo, params.id, router]);

  React.useEffect(() => {
    const resolvedStudentId = params.id || storedSession.studentId;
    const resolvedCode = params.codigo || storedSession.studentCode;
    if (!resolvedStudentId || !resolvedCode || linkStatus !== 'linked') return undefined;
    let mounted = true;
    const checkLinkStatus = async () => {
      try {
        const profile = await studentService.linkedProfile(String(resolvedStudentId), String(resolvedCode));
        const linkedDevices = Number(profile?.linkedDevices);
        if (mounted) {
          setStudentProfile(profile);
          if (Number.isFinite(linkedDevices)) setLinkedCount(linkedDevices);
        }
        if (mounted && Number.isFinite(linkedDevices) && linkedDevices < 1) {
          await clearChildSession();
          router.replace('/welcome');
        }
      } catch {
        // A temporary network failure must not expel the device.
      }
    };

    const timer = setInterval(checkLinkStatus, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [linkStatus, params.codigo, params.id, router, storedSession.studentId, storedSession.studentCode]);
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
          try {
            await startBackgroundUpdates(tripId);
          } catch (locationError) {
          try {
            await trackingService.updateStatus(tripId, {
              status: 'CANCELED',
              tripEndedAt: new Date().toISOString(),
            }, { childToken: (await getChildSession()).childToken });
          } catch (statusError) {
            console.warn('No se pudo cancelar el trayecto tras fallar el rastreo:', statusError?.message || statusError);
          }
            throw locationError;
          }
          if (mounted) setTrackingStatus('sharing');
        } catch (error) {
          try {
            await stopBackgroundUpdates();
          } catch (stopError) {
            console.warn('No se pudo detener el rastreo tras un fallo:', stopError?.message || stopError);
          }
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

  React.useEffect(() => {
    if (!activeTripId || !storedSession.childToken) {
      setTripCoordinates([]);
      return undefined;
    }
    let mounted = true;
    const loadTripCoordinates = async () => {
      try {
        const points = await trackingService.listCoordinates(activeTripId, { childToken: storedSession.childToken });
        if (!mounted || !Array.isArray(points)) return;
        const ordered = points.map(point => ({
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          timestamp: new Date(point.recordedAt || point.createdAt || 0).getTime(),
        }))
          .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
            && point.latitude >= -90 && point.latitude <= 90
            && point.longitude >= -180 && point.longitude <= 180
            && Number.isFinite(point.timestamp))
          .sort((a, b) => a.timestamp - b.timestamp);
        const clean = [];
        for (const point of ordered) {
          const previous = clean[clean.length - 1];
          if (!previous) {
            clean.push(point);
            continue;
          }
          const distance = distanceBetweenCoordinates(previous, point);
          const elapsedSeconds = Math.max(1, (point.timestamp - previous.timestamp) / 1000);
          if (point.timestamp !== previous.timestamp && distance <= 1000 && distance / elapsedSeconds <= 30) clean.push(point);
        }
        setTripCoordinates(clean.slice(-500).map(({ latitude, longitude }) => ({ latitude, longitude })));
      } catch {
        // Conserva el último recorrido cuando la conexión falla temporalmente.
      }
    };
    loadTripCoordinates();
    const timer = setInterval(loadTripCoordinates, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [activeTripId, storedSession.childToken]);

  const describeTrackingError = (error) => {
    const raw = String(
      error?.response?.data?.message
        || error?.response?.data?.error
        || error?.response?.data?.details
        || error?.message
        || ''
    ).trim();
    const normalized = raw.toLowerCase();
    if (normalized.includes('no active route assigned')) {
      return 'No hay una ruta activa asignada a este estudiante. El acudiente debe crearla y asignarla antes de iniciar el trayecto.';
    }
    if (normalized.includes('does not have the requested route assigned')) {
      return 'La ruta seleccionada no está asignada a este estudiante. Asigna la ruta desde la sección Hijos y vuelve a intentarlo.';
    }
    if (normalized.includes('not linked') || normalized.includes('device is not linked')) {
      return 'Este celular ya no está vinculado a ese estudiante. Escanea nuevamente el código QR del acudiente.';
    }
    if (error?.response?.status === 400) {
      return raw || 'El servidor rechazó el inicio del trayecto. Verifica que el estudiante tenga una ruta activa asignada.';
    }
    return raw || 'No se pudo iniciar el rastreo del trayecto. Revisa los permisos e inténtalo nuevamente.';
  };
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
      try {
        await startBackgroundUpdates(tripId);
      } catch (locationError) {
        try {
          await trackingService.updateStatus(tripId, {
            status: 'CANCELED',
            tripEndedAt: new Date().toISOString(),
          }, { childToken: session.childToken });
        } catch (statusError) {
          console.warn('No se pudo cancelar el trayecto tras rechazar la ubicación:', statusError?.message || statusError);
        }
        throw locationError;
      }
      const result = await flushQueue();
      setSentCount(count => count + result.sent);
      setQueueSize(result.remaining);
      setActiveTripId(tripId);
      setTrackingStatus('sharing');
    } catch (error) {
      const status = error?.response?.status;
      setPermissionError(status === 401
        ? 'El dispositivo no tiene una sesión de rastreo válida. Desvincúlalo y vuelve a vincularlo desde el código QR.'
        : describeTrackingError(error));
      setTrackingStatus('paused');
    } finally {
      setTrackingLoading(false);
    }
  };

  const finishTracking = async () => {
    setTrackingLoading(true);
    try {
      await stopBackgroundUpdates({ preserveTrip: true });
      const result = await flushQueue();
      if (result.remaining > 0) throw new Error(t('trackingPendingLocations'));
      if (activeTripId) {
        await trackingService.updateStatus(activeTripId, {
          status: 'COMPLETED',
          tripEndedAt: new Date().toISOString(),
        }, { childToken: (await getChildSession()).childToken });
      }
      await stopBackgroundUpdates();
      setSentCount(count => count + result.sent);
      setQueueSize(result.remaining);
      setActiveTripId('');
      setTrackingStatus('paused');
    } catch (error) {
      Alert.alert(t('error'), error.message || t('studentStopTrackingError'));
    } finally {
      setTrackingLoading(false);
    }
  };

  const confirmFinishTracking = () => {
    Alert.alert(
      t('studentFinishTrip'),
      t('studentConfirmFinishTrip'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('studentFinishTrip'), style: 'destructive', onPress: finishTracking },
      ]
    );
  };

  const callEmergencyContact = async () => {
    const phoneDigits = String(parentPhone).replace(/[^\d+]/g, '');
    if (!phoneDigits || phoneDigits === t('notRegistered')) {
      Alert.alert(t('studentContactUnavailable'), t('studentQrNoEmergencyPhone'));
      return;
    }

    const phoneUrl = `tel:${phoneDigits}`;
    const supported = await Linking.canOpenURL(phoneUrl);
    if (!supported) {
      Alert.alert(t('studentCannotCall'), t('studentDeviceCannotCall'));
      return;
    }
    await Linking.openURL(phoneUrl);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.textOnPrimary }]}>GPS Guardian Escolar</Text>
        <LanguageSelector style={styles.headerControls} />
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
                  {linkStatus === 'linked' ? t('studentPhoneLinked') : t('studentPhoneLinkFailed')}
                </Text>
                <Text style={styles.connectionSubtitle}>
                  {linkStatus === 'linked'
                    ? `${t('studentPhoneCanSendLocation')} ${t('studentLinkedDevices')}: ${linkedCount ?? 1}.`
                    : linkError || t('studentVerifyQr')}
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
          <TripMap coordinates={tripCoordinates} />
          <PermissionGate message={permissionError} onRetry={handleStartTracking} />
          {!permissionError && (
            <TripControls
              status={trackingStatus}
              loading={trackingLoading}
              onStart={handleStartTracking}
              onFinish={confirmFinishTracking}
            />
          )}{/* Card 1: Mi Información */}
          <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('studentMyInfo')}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoColFull}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{t('studName')}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{studentName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{t('studAge')}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{studentAge}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{t('studGrade')}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{studentGrade}</Text>
              </View>
            </View>

            <View style={[styles.idBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>{t('studentId')}: {studentId}</Text>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>{t('studentQrCode')}: {studentCode}</Text>
            </View>
          </Surface>

          {/* Card 2: Contacto de Emergencia */}
          <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="phone" size={24} color={colors.textSecondary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('studEmergencyContact')}</Text>
            </View>

            <View style={styles.inputSim}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('studContactName')}</Text>
              <View style={[styles.inputField, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Text style={[styles.inputValue, { color: colors.text }]}>{parentName}</Text>
              </View>
            </View>

            <View style={styles.inputSim}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('studContactPhone')}</Text>
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
              {t('studentCallEmergency')}
            </Button>
          </Surface>

          {/* Card 3: ¿Como funciona el rastreo? */}
          <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="target" size={24} color={colors.error} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('studentHowTrackingWorks')}</Text>
            </View>

            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{t('studentTrackingBackground')}</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{t('studentParentsOnly')}</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{t('studentDataEncrypted')}</Text>
              </View>
              <View style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{t('studentRunsAutomatically')}</Text>
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
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFF',
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  headerControls: {
    flexShrink: 0,
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





