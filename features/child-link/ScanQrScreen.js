import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import AppLoading from '../../components/ui/AppLoading';
import { studentService } from '../../services/student.service';
import { saveChildSession as persistChildSession } from '../../services/background/locationTracking';
import { useTheme } from '../../theme/useTheme';
import { AppRadius, AppSpacing, AppTouch, AppTypography } from '../../theme/tokens';
import { getDeviceId, getDeviceName, getPlatform } from './deviceHelpers';
import { parseQrValue } from './qrPayload';

function errorMessage(reason) {
  const messages = {
    empty: 'El QR está vacío.',
    invalid_format: 'El QR no pertenece a GPS Guardian Escolar.',
    unsupported_version: 'Esta versión del QR no es compatible.',
    missing_required_fields: 'El QR no tiene los datos completos.',
    legacy_missing_fields: 'El QR anterior no tiene los datos completos.',
    expired: 'Este QR expiró. Pide a tu acudiente generar uno nuevo.',
  };
  return messages[reason] || 'No pudimos leer este QR.';
}

function linkErrorMessage(error) {
  const raw = String(
    error?.response?.data?.message
      || error?.response?.data?.error
      || error?.response?.data?.details
      || error?.message
      || ''
  ).toLowerCase();
  if (raw.includes('already has a linked phone') || raw.includes('estudiante ya tiene')) {
    return 'Este estudiante ya tiene un celular vinculado. Desvincula el dispositivo anterior antes de vincular otro.';
  }
  if (raw.includes('already linked to another student') || raw.includes('celular ya está vinculado')) {
    return 'Este celular ya está vinculado a otro estudiante. Desvincúlalo primero.';
  }
  if (error?.response?.status === 401) {
    return 'La sesión del acudiente expiró. Inicia sesión nuevamente.';
  }
  if (!error?.response) return 'No hay conexión. Revisa internet e intenta de nuevo.';
  return 'No se pudo vincular el dispositivo. Verifica el código e intenta nuevamente.';
}

async function persistLinkedChildSession(response, payload) {
  const childToken = response?.childToken || response?.token || response?.studentToken || '';
  const studentId = String(response?.studentId || payload?.studentId || '');

  await persistChildSession({ childToken, studentId });
}

export default function ScanQrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const scanLock = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const isMobile = Platform.OS !== 'web';
  const scanSize = Math.min(Math.max(windowWidth * 0.72, 240), 340);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {
        setNotice('No se pudo solicitar el permiso de cámara. Revisa los permisos del sistema.');
      });
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!permission?.granted || cameraReady || cameraError) return undefined;

    const timeout = setTimeout(() => {
      setCameraError('La cámara está tardando en iniciar. Revisa el permiso y vuelve a intentarlo.');
    }, 12000);

    return () => clearTimeout(timeout);
  }, [cameraError, cameraReady, permission?.granted]);

  useFocusEffect(
    useCallback(() => {
      if (!permission?.granted) return undefined;

      setCameraReady(false);
      setCameraError('');
      setCameraKey((value) => value + 1);

      return undefined;
    }, [permission?.granted])
  );
  const linkedPayload = useMemo(() => {
    if (Platform.OS !== 'web' || !params?.studentId || !params?.code) return null;
    return {
      studentId: String(params.studentId),
      code: String(params.code),
      name: String(params.name || 'estudiante'),
    };
  }, [params]);

  const linkDevice = useCallback(async (payload) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setIsProcessing(true);
    try {
      const deviceIdentifier = await getDeviceId();
      const response = await studentService.linkDevice({
        studentId: payload.studentId,
        code: payload.code,
        deviceIdentifier,
        platform: getPlatform(),
        deviceName: getDeviceName(),
      });

      await persistLinkedChildSession(response, payload);
      setSuccess(true);
      setNotice('Dispositivo vinculado correctamente.');
      const linkedStudentId = response?.studentId || payload.studentId || '';
      router.replace({
        pathname: '/student-dashboard',
        params: {
          id: String(linkedStudentId),
          codigo: String(payload.code),
        },
      });
    } catch (error) {
      setNotice(linkErrorMessage(error));
    } finally {
      setIsProcessing(false);
      scanLock.current = false;
    }
  }, [router]);

  const handleQrValue = useCallback((value) => {
    if (isProcessing || success || scanLock.current) return;

    const result = parseQrValue(value);
    if (!result.ok) {
      setNotice(errorMessage(result.reason));
      return;
    }

    linkDevice(result.payload);
  }, [isProcessing, linkDevice, success]);

  const submitManualCode = useCallback(() => {
    const code = manualCode.trim();
    if (!code) {
      setNotice('Ingresa el código de vinculación.');
      return;
    }
    const studentId = String(params?.studentId || '').trim();
    linkDevice(studentId ? { code, studentId } : { code });
  }, [linkDevice, manualCode, params?.studentId]);

  if (linkedPayload) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackButton router={router} styles={styles} colors={colors} />
        <View style={styles.permissionWrap}>
          <MaterialCommunityIcons name="qrcode-check" size={72} color={colors.primary} />
          <Text style={styles.title}>Vincular dispositivo</Text>
          <Text style={styles.description}>
            Se encontró el código de vinculación de {linkedPayload.name}. Confirma para asociar este dispositivo.
          </Text>
          <AppButton
            title="Vincular estudiante"
            onPress={() => linkDevice(linkedPayload)}
            loading={isProcessing}
            accessibilityLabel="Vincular estudiante"
          />
          <AppButton title="Cancelar" variant="ghost" onPress={() => router.back()} />
        </View>
        <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <AppLoading message="Preparando cámara..." />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackButton router={router} styles={styles} colors={colors} />
        <View style={styles.permissionWrap}>
          <MaterialCommunityIcons name="camera-lock-outline" size={64} color={colors.primary} />
          <Text style={styles.title}>Permiso de cámara</Text>
          <Text style={styles.description}>Necesitamos la cámara para escanear el QR que te muestra tu acudiente.</Text>
          <AppButton title="Permitir cámara" onPress={requestPermission} accessibilityLabel="Permitir cámara" />
          <AppButton title="Ingresar código manualmente" variant="ghost" onPress={() => setManualOpen(true)} />
          {manualOpen && (
            <ManualCodeCard
              colors={colors}
              manualCode={manualCode}
              setManualCode={setManualCode}
              submitManualCode={submitManualCode}
              isProcessing={isProcessing}
            />
          )}
        </View>
        <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <BackButton router={router} styles={styles} colors={colors} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.content, isMobile && styles.mobileContent]}>
        <View style={[styles.cameraWrap, isMobile ? styles.mobileCameraWrap : null]}>
          {!cameraReady && !cameraError && (
            <View pointerEvents="none" style={styles.cameraLoading}>
              <MaterialCommunityIcons name="camera-outline" size={42} color={colors.textOnPrimary} />
              <Text style={styles.cameraLoadingText}>Iniciando cámara...</Text>
            </View>
          )}
          <CameraView
            key={`${permission.granted ? 'camera-enabled' : 'camera-disabled'}-${cameraKey}`}
            style={styles.camera}
            facing={Platform.OS === 'web' ? 'front' : 'back'}
            active={true}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isProcessing || success ? undefined : ({ data }) => handleQrValue(data)}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError('');
            }}
            onMountError={(error) => {
              setCameraReady(false);
              setCameraError(error?.message || 'Verifica el permiso de cámara y vuelve a intentarlo.');
            }}
          />
          {cameraError ? (
            <View style={styles.cameraError}>
              <MaterialCommunityIcons name="camera-off-outline" size={42} color={colors.textOnPrimary} />
              <Text style={styles.cameraLoadingText}>No se pudo iniciar la cámara.</Text>
              <Text style={styles.cameraErrorDetail}>{cameraError}</Text>
              <AppButton
                title="Reintentar cámara"
                variant="secondary"
                onPress={() => {
                  setCameraError('');
                  setCameraReady(false);
                  setCameraKey((value) => value + 1);
                  requestPermission().catch(() => setCameraError('No se pudo solicitar el permiso de cámara.'));
                }}
                accessibilityLabel="Reintentar cámara"
              />
              {Platform.OS !== 'web' && (
                <AppButton
                  title="Abrir ajustes"
                  variant="ghost"
                  onPress={() => Linking.openSettings().catch(() => {})}
                  accessibilityLabel="Abrir ajustes de permisos de cámara"
                />
              )}
            </View>
          ) : null}
          {!cameraError && (
            <View pointerEvents="none" style={[styles.overlay, isMobile && styles.mobileOverlay]}>
              <View style={[styles.scanFrame, isMobile && { width: scanSize, height: scanSize }]} />
            </View>
          )}
        </View>

        {isMobile ? (
          <View pointerEvents="none" style={styles.mobileInfo}>
            <Text style={styles.mobileInfoTitle}>Escanea el QR del estudiante</Text>
            <Text style={styles.mobileInfoDescription}>Ubica el QR dentro del marco. La vinculación iniciará automáticamente.</Text>
          </View>
        ) : (
          <View style={styles.bottomPanel}>
            <Text style={styles.title}>Escanea el QR del estudiante</Text>
            <Text style={styles.description}>Ubica el QR dentro del marco. La vinculación iniciará automáticamente.</Text>
            {manualOpen ? (
              <ManualCodeCard
                colors={colors}
                manualCode={manualCode}
                setManualCode={setManualCode}
                submitManualCode={submitManualCode}
                isProcessing={isProcessing}
              />
            ) : (
              <AppButton
                title="Ingresar código manualmente"
                variant="secondary"
                onPress={() => setManualOpen(true)}
                accessibilityLabel="Ingresar código manualmente"
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
      {isMobile && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ingresar código manualmente"
            style={styles.floatingCodeButton}
            onPress={() => setManualOpen(true)}
          >
            <MaterialCommunityIcons name="keyboard-outline" size={25} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <ManualCodeModal
            visible={manualOpen}
            colors={colors}
            manualCode={manualCode}
            setManualCode={setManualCode}
            submitManualCode={submitManualCode}
            isProcessing={isProcessing}
            onClose={() => setManualOpen(false)}
          />
        </>
      )}
      <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
    </SafeAreaView>
  );
}

function ManualCodeModal({ visible, colors, manualCode, setManualCode, submitManualCode, isProcessing, onClose }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Vincular estudiante</Text>
              <Text style={styles.modalDescription}>Ingresa el código de vinculación si no puedes escanear el QR.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            accessibilityLabel="Código de vinculación"
            autoCapitalize="characters"
            autoFocus
            placeholder="Código de vinculación"
            placeholderTextColor={colors.textMuted}
            value={manualCode}
            onChangeText={setManualCode}
            style={styles.modalInput}
          />
          <AppButton title="Vincular estudiante" loading={isProcessing} onPress={submitManualCode} accessibilityLabel="Vincular estudiante" />
          <AppButton title="Cancelar" variant="ghost" onPress={onClose} accessibilityLabel="Cancelar" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function BackButton({ router, styles, colors }) {
  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={() => {
        if (router.canGoBack?.()) {
          router.back();
        } else {
          router.replace('/(auth)/login');
        }
      }}
      accessibilityRole="button"
      accessibilityLabel="Volver a la pantalla anterior"
    >
      <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
      <Text style={styles.backButtonText}>Volver</Text>
    </TouchableOpacity>
  );
}

function ManualCodeCard({ colors, manualCode, setManualCode, submitManualCode, isProcessing }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <AppCard style={styles.manualCard} elevation="none">
      <TextInput
        accessibilityLabel="Código de vinculación"
        autoCapitalize="characters"
        placeholder="Código de vinculación"
        placeholderTextColor={colors.textMuted}
        value={manualCode}
        onChangeText={setManualCode}
        style={styles.manualInput}
      />
      <AppButton title="Vincular dispositivo" loading={isProcessing} onPress={submitManualCode} accessibilityLabel="Vincular dispositivo" />
    </AppCard>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      position: 'relative',
    },
    mobileContent: {
      backgroundColor: colors.black,
    },
    backButton: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: AppSpacing.xs,
      paddingHorizontal: AppSpacing.lg,
      paddingVertical: AppSpacing.sm,
    },
    backButtonText: {
      ...AppTypography.sm,
      color: colors.primary,
      fontWeight: '700',
    },
    cameraWrap: {
      position: 'relative',
      width: '100%',
      height: 400,
      minHeight: 0,
      overflow: 'hidden',
      backgroundColor: colors.black,
    },
    camera: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    cameraLoading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    cameraLoadingText: {
      ...AppTypography.sm,
      color: colors.textOnPrimary,
      marginTop: AppSpacing.sm,
    },
    cameraErrorDetail: {
      ...AppTypography.xs,
      color: colors.textOnPrimary,
      marginBottom: AppSpacing.md,
      marginTop: AppSpacing.xs,
      textAlign: 'center',
    },
    cameraError: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      backgroundColor: colors.black,
      justifyContent: 'center',
      padding: AppSpacing.xl,
      zIndex: 3,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    mobileCameraWrap: {
      flex: 1,
      width: '100%',
      height: undefined,
      minHeight: 360,
      aspectRatio: undefined,
    },
    mobileOverlay: {
      transform: [],
    },
    scanFrame: {
      width: 248,
      height: 248,
      borderRadius: AppRadius.lg,
      borderWidth: 3,
      borderColor: colors.textOnPrimary,
      backgroundColor: 'transparent',
    },
    bottomPanel: {
      gap: AppSpacing.md,
      padding: AppSpacing.lg,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
    },
    mobileBottomPanel: {
      bottom: 0,
      height: 158,
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 4,
    },
    mobileInfo: {
      alignItems: 'center',
      bottom: 88,
      left: 0,
      paddingHorizontal: AppSpacing.lg,
      position: 'absolute',
      right: 0,
      zIndex: 4,
    },
    mobileInfoTitle: {
      ...AppTypography.xl,
      color: '#FFFFFF',
      fontWeight: '700',
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    mobileInfoDescription: {
      ...AppTypography.sm,
      color: '#FFFFFF',
      marginTop: AppSpacing.xs,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    permissionWrap: {
      alignItems: 'center',
      flex: 1,
      gap: AppSpacing.md,
      justifyContent: 'center',
      padding: AppSpacing.xl,
    },
    title: {
      ...AppTypography.xl,
      color: colors.text,
      textAlign: 'center',
    },
    description: {
      ...AppTypography.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    manualCard: {
      gap: AppSpacing.md,
      width: '100%',
    },
    manualInput: {
      ...AppTypography.md,
      borderColor: colors.border,
      borderRadius: AppRadius.md,
      borderWidth: 1,
      color: colors.text,
      minHeight: AppTouch.min,
      paddingHorizontal: AppSpacing.md,
    },
    floatingCodeButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 30,
      bottom: 42,
      elevation: 8,
      height: 58,
      justifyContent: 'center',
      position: 'absolute',
      right: AppSpacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      width: 58,
      zIndex: 10,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.58)',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: AppRadius.lg,
      borderTopRightRadius: AppRadius.lg,
      gap: AppSpacing.md,
      padding: AppSpacing.lg,
    },
    modalHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalTitle: {
      ...AppTypography.xl,
      color: colors.text,
      fontWeight: '700',
    },
    modalDescription: {
      ...AppTypography.sm,
      color: colors.textSecondary,
      marginTop: AppSpacing.xs,
      maxWidth: 300,
    },
    modalClose: {
      alignItems: 'center',
      height: AppTouch.min,
      justifyContent: 'center',
      width: AppTouch.min,
    },
    modalInput: {
      ...AppTypography.md,
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: AppRadius.md,
      borderWidth: 1,
      color: colors.text,
      minHeight: AppTouch.min,
      paddingHorizontal: AppSpacing.md,
    },
  });
}


























