import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
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
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {
        setNotice('No se pudo solicitar el permiso de cámara. Revisa los permisos del sistema.');
      });
    }
  }, [permission, requestPermission]);
  const linkedPayload = useMemo(() => {
    if (Platform.OS !== 'web' || !params?.studentId || !params?.code) return null;
    return {
      studentId: String(params.studentId),
      code: String(params.code),
      name: String(params.name || 'estudiante'),
    };
  }, [params]);

  const linkDevice = useCallback(async (payload) => {
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
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message || error?.message;
      const message = status === 409
        ? 'Este dispositivo ya está vinculado.'
        : status === 0 || !error?.response
          ? 'No hay conexión. Revisa internet e intenta de nuevo.'
          : backendMessage || 'No se pudo vincular el dispositivo.';
      setNotice(message);
    } finally {
      setIsProcessing(false);
    }
  }, [router]);

  const handleQrValue = useCallback((value) => {
    if (isProcessing || success) return;

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <View style={styles.cameraWrap}>
          {!cameraReady && (
            <View pointerEvents="none" style={styles.cameraLoading}>
              <MaterialCommunityIcons name="camera-outline" size={42} color={colors.textOnPrimary} />
              <Text style={styles.cameraLoadingText}>Iniciando cámara...</Text>
            </View>
          )}
          <CameraView
            key={permission.granted ? 'camera-enabled' : 'camera-disabled'}
            style={styles.camera}
            facing="back"
            active={!isProcessing && !success}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isProcessing || success ? undefined : ({ data }) => handleQrValue(data)}
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message }) => {
              setCameraReady(false);
              setNotice(`No se pudo iniciar la cámara: ${message || 'verifica el permiso y reinicia la aplicación.'}`);
            }}
          />
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
        </View>

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
      </KeyboardAvoidingView>
      <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
    </SafeAreaView>
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
    },
    cameraWrap: {
      flex: 1,
      minHeight: 360,
      overflow: 'hidden',
      backgroundColor: colors.black,
    },
    camera: {
      flex: 1,
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
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.18)',
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
  });
}
