import { AppRadius } from '../../theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import Button from '../../components/ui/PaperButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';

const RESEND_SECONDS = 59;

export default function VerifyRecoveryCodeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const boxes = useMemo(() => Array.from({ length: 6 }, (_, index) => code[index] || ''), [code]);

  const handleVerify = async () => {
    setErrorMsg('');
    if (code.length < 6) {
      setErrorMsg(t('authInvalidCode'));
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.verifyRecoveryCode(code);
      router.replace('/(auth)/choose-recovery-action');
    } catch (error) {
      setErrorMsg(error.message === 'El código ha expirado' ? t('authExpiredCode') : t('authInvalidCode'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    setErrorMsg('');
    setIsResending(true);
    try {
      const session = await authService.getRecoverySession();
      if (session?.contactKey) {
        await authService.requestPasswordRecovery(session.contactKey);
      }
      setCode('');
      setSeconds(RESEND_SECONDS);
    } catch (error) {
      setErrorMsg(error.message || t('someError'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.wrapper}>
            <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} contentFit="contain" />
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('authVerifyRecoveryTitle')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {t('authVerifyRecoveryDesc')}
              </Text>

              <TouchableOpacity
                style={styles.otpWrap}
                onPress={() => inputRef.current?.focus()}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('authEnterCode')}
              >
                {boxes.map((digit, index) => (
                  <View key={index} style={[styles.otpBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.otpDigit, { color: colors.text }]}>{digit}</Text>
                  </View>
                ))}
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                mode="outlined"
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, '').slice(0, 6));
                  setErrorMsg('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                style={styles.hiddenInput}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                placeholder="000000"
                caretHidden
              />

              {errorMsg ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
                </View>
              ) : null}

              <Button
                mode="contained"
                onPress={handleVerify}
                loading={isSubmitting}
                disabled={isSubmitting || code.length < 6}
                buttonColor={colors.primary}
                textColor={colors.textOnPrimary}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
              >
                {t('authVerifyCode')}
              </Button>

              <Button mode="text" textColor={colors.primary} onPress={handleResend} loading={isResending} disabled={seconds > 0 || isResending}>
                {seconds > 0 ? `${t('authResendIn')} 00:${String(seconds).padStart(2, '0')}` : t('authResendCode')}
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
  backButton: { padding: 8 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  wrapper: { width: '100%', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  headerLogo: { width: 110, height: 110, marginBottom: 8 },
  card: { width: '100%', maxWidth: 430, padding: 22, borderRadius: 10, elevation: 2, borderWidth: 1 },
  cardTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  cardSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  otpWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  otpBox: { flex: 1, minWidth: 42, aspectRatio: 0.86, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  otpDigit: { fontSize: 22, fontWeight: '700' },
  hiddenInput: { width: 1, height: 1, opacity: 0, marginBottom: 12 },
  actionButton: { borderRadius: AppRadius.button, marginTop: 8 },
  buttonContent: { height: 46 },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1 },
  errorText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
