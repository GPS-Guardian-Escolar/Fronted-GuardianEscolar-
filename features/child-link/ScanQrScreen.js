import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import jsQR from 'jsqr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import AppLoading from '../../components/ui/AppLoading';
import LanguageSelector from '../../components/common/LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';
import { studentService } from '../../services/student.service';
import { saveChildSession as persistChildSession } from '../../services/background/locationTracking';
import { useTheme } from '../../theme/useTheme';
import { AppRadius, AppSpacing, AppTouch, AppTypography } from '../../theme/tokens';
import { getDeviceId, getDeviceName, getPlatform } from './deviceHelpers';
import { encodeAppQrValue, parseQrValue } from './qrPayload';

function errorMessage(reason, t) {
  const messages = {
    empty: t('qrEmpty'),
    invalid_format: t('qrWrongApp'),
    unsupported_version: t('qrVersionUnsupported'),
    missing_required_fields: t('qrFieldsMissing'),
    legacy_missing_fields: t('qrLegacyFieldsMissing'),
    expired: t('qrExpired'),
  };
  return messages[reason] || t('qrUnreadable');
}

function linkErrorMessage(error, t) {
  const raw = String(
    error?.response?.data?.message
      || error?.response?.data?.error
      || error?.response?.data?.details
      || error?.message
      || ''
  ).toLowerCase();
  if (raw.includes('already has a linked phone') || raw.includes('estudiante ya tiene')) {
    return t('qrStudentAlreadyLinked');
  }
  if (raw.includes('already linked to another student') || raw.includes('celular ya está vinculado')) {
    return t('qrPhoneLinkedElsewhere');
  }
  if (error?.response?.status === 401) {
    return t('qrGuardianSessionExpired');
  }
  if (!error?.response) return t('qrNoConnection');
  return t('qrLinkFailed');
}

async function persistLinkedChildSession(response, payload) {
  const childToken = response?.childToken || response?.token || response?.studentToken || '';
  const studentId = String(response?.studentId || payload?.studentId || '');

  if (!childToken || !studentId) throw new Error('Invalid device session');
  await persistChildSession({ childToken, studentId, code: payload.code });
}

export default function ScanQrScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [cameraReady, setCameraReady] = useState(Platform.OS !== 'web');
  const [cameraError, setCameraError] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const scanLock = useRef(false);
  const cameraRef = useRef(null);
  const cameraContainerRef = useRef(null);
  const webScanTimer = useRef(null);

  const styles = useMemo(() => createStyles(colors), [colors]);
  const isMobile = Platform.OS !== 'web';
  const scanSize = Math.min(Math.max(windowWidth * 0.72, 240), 340);
  const linkedStudentId = params?.studentId;
  const linkedCode = params?.code;

  const linkedPayload = useMemo(() => {
    if (!linkedStudentId || !linkedCode) return null;
    return {
      studentId: String(linkedStudentId),
      code: String(linkedCode),
    };
  }, [linkedStudentId, linkedCode]);
  const [linkedStudentName, setLinkedStudentName] = useState('');

  useEffect(() => {
    if (!linkedPayload) return undefined;
    let mounted = true;
    studentService.linkedProfile(linkedPayload.studentId, linkedPayload.code)
      .then(profile => { if (mounted) setLinkedStudentName(profile.fullName || ''); })
      .catch(error => { if (mounted) setNotice(linkErrorMessage(error, t)); });
    return () => { mounted = false; };
  }, [linkedPayload, t]);

  useEffect(() => {
    if (linkedPayload) return;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => {
        setNotice(t('qrCameraPermissionFailed'));
      });
    }
  }, [linkedPayload, permission, requestPermission, t]);

  useEffect(() => {
    if (linkedPayload || !permission?.granted || cameraReady || cameraError) return undefined;

    const timeout = setTimeout(() => {
      setCameraError(t('qrCameraSlow'));
    }, 12000);

    return () => clearTimeout(timeout);
  }, [cameraError, cameraReady, linkedPayload, permission?.granted, t]);

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
      setNotice(t('qrLinkedSuccess'));
      const linkedStudentId = response?.studentId || payload.studentId || '';
      router.replace({
        pathname: '/student-dashboard',
        params: {
          id: String(linkedStudentId),
          codigo: String(payload.code),
        },
      });
    } catch (error) {
      setNotice(linkErrorMessage(error, t));
    } finally {
      setIsProcessing(false);
      scanLock.current = false;
    }
  }, [router, t]);

  const handleQrValue = useCallback((value) => {
    if (isProcessing || success || scanLock.current) return;

    const result = parseQrValue(value);
    if (!result.ok) {
      setNotice(errorMessage(result.reason, t));
      return;
    }

    linkDevice(result.payload);
  }, [isProcessing, linkDevice, success, t]);

  useEffect(() => {
    if (linkedPayload || Platform.OS !== 'web' || !cameraReady || !permission?.granted || !isFocused || cameraError) return undefined;

    // Safari can render the camera but does not always expose BarcodeDetector,
    // so decode frames directly from the video as a web fallback.
    const canvas = document.createElement('canvas');
    const detector = typeof window !== 'undefined' && 'BarcodeDetector' in window
      ? new window.BarcodeDetector({ formats: ['qr_code'] })
      : null;
    const scanFrame = () => {
      const video = cameraContainerRef.current?.querySelector?.('video');
      if (!video || video.readyState < 2 || video.videoWidth < 1 || video.videoHeight < 1) return;
      const sourceSize = Math.min(video.videoWidth, video.videoHeight);
      const sourceX = Math.max(0, (video.videoWidth - sourceSize) / 2);
      const sourceY = Math.max(0, (video.videoHeight - sourceSize) / 2);
      canvas.width = sourceSize;
      canvas.height = sourceSize;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, sourceSize, sourceSize);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (result?.data) handleQrValue(result.data);

      if (!result && detector) {
        detector.detect(canvas)
          .then(codes => codes?.[0]?.rawValue && handleQrValue(codes[0].rawValue))
          .catch(() => null);
      }
    };

    webScanTimer.current = setInterval(scanFrame, 350);
    return () => {
      clearInterval(webScanTimer.current);
      webScanTimer.current = null;
    };
  }, [cameraError, cameraReady, handleQrValue, isFocused, linkedPayload, permission?.granted]);

  const submitManualCode = useCallback(() => {
    const code = manualCode.trim();
    if (!code) {
      setNotice(t('qrEnterCode'));
      return;
    }
    const studentId = String(params?.studentId || '').trim();
    linkDevice(studentId ? { code, studentId } : { code });
  }, [linkDevice, manualCode, params?.studentId, t]);

  if (linkedPayload) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackButton router={router} styles={styles} colors={colors} t={t} />
        <LanguageSelector style={styles.languageSelector} />
        <View style={styles.permissionWrap}>
          <MaterialCommunityIcons name="qrcode-check" size={72} color={colors.primary} />
          <Text style={styles.title}>{t('qrLinkTitle')}</Text>
          <Text style={styles.description}>
            {t('qrLinkConfirmPrefix')} {linkedStudentName || t('studentLabel')}. {t('qrLinkConfirmSuffix')}
          </Text>
          {Platform.OS === 'web' && (
            <>
              <Text style={styles.description}>{t('qrOpenAppHint')}</Text>
              <AppButton
                title={t('qrOpenApp')}
                onPress={() => Linking.openURL(encodeAppQrValue(linkedPayload))
                  .catch(() => setNotice(t('qrAppUnavailable')))}
              />
            </>
          )}
          <AppButton
            title={t(Platform.OS === 'web' ? 'qrContinueBrowser' : 'qrLinkStudent')}
            onPress={() => linkDevice(linkedPayload)}
            loading={isProcessing}
            accessibilityLabel={t(Platform.OS === 'web' ? 'qrContinueBrowser' : 'qrLinkStudent')}
          />
          <AppButton title={t('cancel')} variant="ghost" onPress={() => router.back()} />
        </View>
        <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <AppLoading message={t('qrCameraPreparing')} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackButton router={router} styles={styles} colors={colors} t={t} />
        <LanguageSelector style={styles.languageSelector} />
        <View style={styles.permissionWrap}>
          <MaterialCommunityIcons name="camera-lock-outline" size={64} color={colors.primary} />
          <Text style={styles.title}>{t('qrCameraPermissionTitle')}</Text>
          <Text style={styles.description}>{t('qrCameraPermissionDescription')}</Text>
          <AppButton title={t('qrAllowCamera')} onPress={requestPermission} accessibilityLabel={t('qrAllowCamera')} />
          <AppButton title={t('qrEnterManually')} variant="ghost" onPress={() => setManualOpen(true)} />
          {manualOpen && (
            <ManualCodeCard
              colors={colors}
              manualCode={manualCode}
              setManualCode={setManualCode}
              submitManualCode={submitManualCode}
              isProcessing={isProcessing}
              t={t}
            />
          )}
        </View>
        <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <BackButton router={router} styles={styles} colors={colors} t={t} />
      <LanguageSelector style={styles.languageSelector} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.content, isMobile && styles.mobileContent]}>
        <View ref={cameraContainerRef} style={[styles.cameraWrap, isMobile ? styles.mobileCameraWrap : null]}>
          {!cameraReady && !cameraError && (
            <View pointerEvents="none" style={styles.cameraLoading}>
              <MaterialCommunityIcons name="camera-outline" size={42} color={colors.textOnPrimary} />
              <Text style={styles.cameraLoadingText}>{t('qrCameraStarting')}</Text>
            </View>
          )}
          <CameraView
            ref={cameraRef}
            key={`${permission.granted ? 'camera-enabled' : 'camera-disabled'}-${cameraKey}`}
            style={styles.camera}
            facing="back"
            active={isFocused && !cameraError}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isProcessing || success ? undefined : ({ data }) => handleQrValue(data)}
            onCameraReady={() => {
              setCameraReady(true);
              setCameraError('');
            }}
            onMountError={(error) => {
              setCameraReady(false);
              setCameraError(t('qrCheckCameraPermission'));
            }}
          />
          {cameraError ? (
            <View style={styles.cameraError}>
              <MaterialCommunityIcons name="camera-off-outline" size={42} color={colors.textOnPrimary} />
              <Text style={styles.cameraLoadingText}>{t('qrCameraStartFailed')}</Text>
              <Text style={styles.cameraErrorDetail}>{cameraError}</Text>
              <AppButton
                title={t('qrRetryCamera')}
                variant="secondary"
                onPress={() => {
                  setCameraError('');
                  setCameraReady(Platform.OS !== 'web');
                  setCameraKey((value) => value + 1);
                  requestPermission().catch(() => setCameraError(t('qrCameraPermissionFailed')));
                }}
                accessibilityLabel={t('qrRetryCamera')}
              />
              {Platform.OS !== 'web' && (
                <AppButton
                  title={t('qrOpenSettings')}
                  variant="ghost"
                  onPress={() => Linking.openSettings().catch(() => {})}
                  accessibilityLabel={t('qrOpenCameraSettings')}
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
            <Text style={styles.mobileInfoTitle}>{t('qrScanTitle')}</Text>
            <Text style={styles.mobileInfoDescription}>{t('qrScanDescription')}</Text>
          </View>
        ) : (
          <View style={styles.bottomPanel}>
            <Text style={styles.title}>{t('qrScanTitle')}</Text>
            <Text style={styles.description}>{t('qrScanDescription')}</Text>
            {manualOpen ? (
              <ManualCodeCard
                colors={colors}
                manualCode={manualCode}
                setManualCode={setManualCode}
                submitManualCode={submitManualCode}
                isProcessing={isProcessing}
                t={t}
              />
            ) : (
              <AppButton
                title={t('qrEnterManually')}
                variant="secondary"
                onPress={() => setManualOpen(true)}
                accessibilityLabel={t('qrEnterManually')}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
      {isMobile && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('qrEnterManually')}
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
            t={t}
          />
        </>
      )}
      <Snackbar visible={!!notice} onDismiss={() => setNotice('')}>{notice}</Snackbar>
    </SafeAreaView>
  );
}

function ManualCodeModal({ visible, colors, manualCode, setManualCode, submitManualCode, isProcessing, onClose, t }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('qrLinkTitle')}</Text>
              <Text style={styles.modalDescription}>{t('qrManualCodeHelp')}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TextInput
            accessibilityLabel={t('qrCodeLabel')}
            autoCapitalize="characters"
            autoFocus
            placeholder={t('qrCodeLabel')}
            placeholderTextColor={colors.textMuted}
            value={manualCode}
            onChangeText={setManualCode}
            style={styles.modalInput}
          />
          <AppButton title={t('qrLinkStudent')} loading={isProcessing} onPress={submitManualCode} accessibilityLabel={t('qrLinkStudent')} />
          <AppButton title={t('cancel')} variant="ghost" onPress={onClose} accessibilityLabel={t('cancel')} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function BackButton({ router, styles, colors, t }) {
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
      accessibilityLabel={t('back')}
    >
      <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
      <Text style={styles.backButtonText}>{t('back')}</Text>
    </TouchableOpacity>
  );
}

function ManualCodeCard({ colors, manualCode, setManualCode, submitManualCode, isProcessing, t }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <AppCard style={styles.manualCard} elevation="none">
      <TextInput
        accessibilityLabel={t('qrCodeLabel')}
        autoCapitalize="characters"
        placeholder={t('qrCodeLabel')}
        placeholderTextColor={colors.textMuted}
        value={manualCode}
        onChangeText={setManualCode}
        style={styles.manualInput}
      />
      <AppButton title={t('qrLinkStudent')} loading={isProcessing} onPress={submitManualCode} accessibilityLabel={t('qrLinkStudent')} />
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
    languageSelector: { position: 'absolute', top: 8, right: 12 },
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


























