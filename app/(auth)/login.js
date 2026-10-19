import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Text, TextInput } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../utils/storage';
import { isValidEmail } from '../../utils/validators';
import { AppTouch } from '../../theme/tokens';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRememberedEmail = async () => {
      const rememberedEmail = await storage.getRememberedEmail();
      if (isMounted && rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    };

    loadRememberedEmail();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('guardian-hide-native-password-toggle')) return;

    const style = document.createElement('style');
    style.id = 'guardian-hide-native-password-toggle';
    style.textContent = `
      input[type="password"]::-ms-reveal,
      input[type="password"]::-ms-clear {
        display: none;
      }
      input[type="password"]::-webkit-credentials-auto-fill-button {
        visibility: hidden;
        display: none;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg(t('authRequiredFields'));
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg(t('authInvalidEmail'));
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedEmail = email.trim().toLowerCase();
      const result = await login(normalizedEmail, password);
      if (rememberMe) {
        await storage.setRememberedEmail(normalizedEmail);
      } else {
        await storage.removeRememberedEmail();
      }
      if (result?.requires2FA) {
        router.push({
          pathname: '/(auth)/verify-code',
          params: {
            token: result.twoFAToken,
            method: result.twoFAMethod,
            email: normalizedEmail,
            mode: 'login',
          },
        });
      }
    } catch (error) {
      setErrorMsg(error.message || t('authInvalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRememberToggle = async () => {
    const nextValue = !rememberMe;
    setRememberMe(nextValue);
    if (!nextValue) {
      await storage.removeRememberedEmail();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.cardWrapper}>
            <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} contentFit="contain" />
            <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('appName')}</Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('authLogin')}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('authEnterEmail')}</Text>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('authEmail')}</Text>
                    <TextInput
                      mode="outlined"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
                      textColor={colors.text}
                      theme={{ roundness: 6 }}
                      left={<TextInput.Icon icon="email-outline" color={colors.textSecondary} />}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('authPassword')}</Text>
                    <TextInput
                      mode="outlined"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={secureText}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
                      textColor={colors.text}
                      theme={{ roundness: 6 }}
                      left={<TextInput.Icon icon="lock-outline" color={colors.textSecondary} />}
                      right={<TextInput.Icon icon={secureText ? 'eye' : 'eye-off'} onPress={() => setSecureText(!secureText)} color={colors.primary} />}
                    />
                  </View>

                  <View style={styles.rememberRecoveryRow}>
                    <View style={styles.checkboxContainer}>
                      <Checkbox status={rememberMe ? 'checked' : 'unchecked'} onPress={handleRememberToggle} color={colors.primary} />
                      <TouchableOpacity onPress={handleRememberToggle}>
                        <Text style={[styles.checkboxLabel, { color: colors.text }]}>Recordarme</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.forgotLink}
                      onPress={() => router.push('/(auth)/forgot-password')}
                      accessibilityRole="link"
                    >
                      <Text style={[styles.forgotText, { color: colors.primary }]}>{t('authForgotPass')}</Text>
                    </TouchableOpacity>
                  </View>

                  {errorMsg ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                      <Text style={[styles.errorBoxText, { color: colors.error }]}>{errorMsg}</Text>
                    </View>
                  ) : null}

                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={false}
                    disabled={isSubmitting}
                    style={styles.loginButton}
                    contentStyle={styles.buttonContent}
                    buttonColor={colors.primary}
                    textColor={colors.textOnPrimary}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={colors.textOnPrimary} size="small" />
                    ) : t('authLoginBtn')}
                  </Button>
              </>

              <View style={styles.footerLinks}>
                <Text style={[styles.noAccountText, { color: colors.text }]}>{t('authNoAccount')} </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={[styles.registerLink, { color: colors.primary }]}>{t('authRegisterBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity
        style={[
          styles.studentQrFab,
          {
            backgroundColor: colors.primary,
            bottom: Math.max(insets.bottom + 18, 24),
          },
        ]}
        onPress={() => router.push('/scan-qr')}
        accessibilityRole="button"
        accessibilityLabel="Escanear código QR del acudiente"
        accessibilityHint="Abre la pantalla para escanear el QR o ingresar el código manualmente"
      >
        <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.textOnPrimary} />
        <Text style={[styles.studentQrFabText, { color: colors.textOnPrimary }]}>Soy estudiante</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backButton: { padding: 8 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 96 },
  cardWrapper: { width: '100%', alignItems: 'center', padding: 20, alignSelf: 'center' },
  headerLogo: { width: 120, height: 120, marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  card: {
    width: '100%',
    maxWidth: 430,
    padding: 24,
    borderRadius: 12,
    elevation: 3,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { height: 44 },
  rememberRecoveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  forgotLink: { paddingVertical: 8 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  checkboxLabel: { fontSize: 13 },
  loginButton: { borderRadius: 8, marginTop: 10 },
  buttonContent: { height: 48 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  noAccountText: { fontSize: 13 },
  registerLink: { fontSize: 13, fontWeight: '700' },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1 },
  errorBoxText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  studentQrFab: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: AppTouch.min,
    paddingHorizontal: 18,
    position: 'absolute',
    right: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  studentQrFabText: {
    fontSize: 14,
    fontWeight: '800',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backBtnText: { marginLeft: 5, fontWeight: '600' },
  otpInfoBox: { alignItems: 'center', marginBottom: 20 },
  otpHint: { fontSize: 15, fontWeight: '600', marginTop: 10 },
  demoHint: { fontSize: 12, marginTop: 2 },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 5, height: 55, marginBottom: 15 },
  devClear: { marginTop: 24, alignSelf: 'center' },
  devClearText: { fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' },
});
