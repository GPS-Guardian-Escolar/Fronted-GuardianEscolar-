import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { emitNotice } from '../../utils/noticeBus';

const isWeb = Dimensions.get('window').width > 768;

export default function VerifyCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setAuthState } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [twoFAToken, setTwoFAToken] = useState(String(params.token || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputs = useRef([]);
  const method = 'EMAIL';
  const destination = t('twoFAEmail');

  const handleInputChange = (text, index) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    const newCode = [...code];

    if (cleaned.length > 1) {
      cleaned.split('').forEach((digit, offset) => {
        const targetIndex = index + offset;
        if (targetIndex < newCode.length) {
          newCode[targetIndex] = digit;
        }
      });
      setCode(newCode);
      setErrorMsg('');
      setSuccessMsg('');
      const nextEmptyIndex = newCode.findIndex((digit) => !digit);
      inputs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
      return;
    }

    newCode[index] = cleaned;
    setCode(newCode);
    setErrorMsg('');
    setSuccessMsg('');
    if (cleaned && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    setErrorMsg('');
    if (fullCode.length < 6) {
      emitNotice(t('error'), t('authVerifyCode'), { tone: 'error' });
      return;
    }
    if (!twoFAToken) {
      setErrorMsg('No se encontró el token de verificación. Inicia sesión de nuevo.');
      return;
    }
    try {
      setIsSubmitting(true);
      const session = await authService.complete2FALogin(twoFAToken, fullCode, method);
      setAuthState(session);
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMsg(error.message || t('twoFAInvalidCode'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!twoFAToken) {
      setErrorMsg('No se encontró el token de verificación. Inicia sesión de nuevo.');
      return;
    }

    try {
      setIsResending(true);
      const result = await authService.resend2FA(twoFAToken);
      if (result.twoFAToken) {
        setTwoFAToken(result.twoFAToken);
      }
      setCode(['', '', '', '', '', '']);
      setSuccessMsg(result.message || 'Código reenviado. Revisa tu correo.');
      inputs.current[0]?.focus();
    } catch (error) {
      setErrorMsg(error.message || 'No se pudo reenviar el código.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.wrapper, isWeb && styles.wrapperWeb]}>
          {/* Logo */}
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appTitle, { color: colors.primary }]}>{t('appName')}</Text>

          {/* Card */}
          <View style={[styles.card, isWeb && styles.cardWeb, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('authVerifyCode')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enviamos un código de verificación a tu {destination}{'\n'}
              <Text style={[styles.email, { color: colors.text }]}>{params.email || method}</Text>
            </Text>

            {/* OTP Inputs */}
            <View style={styles.otpRow}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputs.current[index] = ref; }}
                  style={[styles.otpBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }, digit ? [styles.otpBoxFilled, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, color: colors.primary }] : null]}
                  maxLength={6}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  value={digit}
                  onChangeText={(text) => handleInputChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Botón Verificar */}
            <TouchableOpacity style={[styles.verifyBtn, { backgroundColor: colors.primary }]} onPress={handleVerify} activeOpacity={0.85}>
              <Text style={[styles.verifyText, { color: colors.white }]}>{isSubmitting ? t('authVerifying') : t('authVerifyCode')}</Text>
            </TouchableOpacity>

            {errorMsg ? <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text> : null}
            {successMsg ? <Text style={[styles.successText, { color: colors.success }]}>{successMsg}</Text> : null}

            {/* Reenviar */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('authNoCodeReceived')} </Text>
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                <Text style={[styles.resendLink, { color: colors.primary }, isResending ? [styles.resendLinkDisabled, { color: colors.textSecondary }] : null]}>
                  {isResending ? t('authResending') : t('authResendCode')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.FONDO_PRINCIPAL },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.FONDO_PRINCIPAL,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  wrapper: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    alignSelf: 'center',
  },
  wrapperWeb: {
    padding: 40,
    maxWidth: 500,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: isWeb ? 32 : 22,
    fontWeight: 'bold',
    color: COLORS.PRIMARIO,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardWeb: {
    maxWidth: 450,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  backText: {
    color: COLORS.PRIMARIO,
    fontSize: 15,
  },
  title: {
    fontSize: isWeb ? 22 : 18,
    fontWeight: '600',
    color: COLORS.NEGRO,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.TEXTO_SECUNDARIO,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  email: {
    color: COLORS.NEGRO,
    fontWeight: '500',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpBox: {
    width: 48,
    height: 60,
    backgroundColor: COLORS.BLANCO,
    borderWidth: 2,
    borderColor: COLORS.GRIS_BORDE,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.PRIMARIO,
    elevation: 2,
    shadowColor: COLORS.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  otpBoxFilled: {
    borderColor: COLORS.PRIMARIO,
    borderWidth: 2.5,
    backgroundColor: COLORS.PRIMARIO_CLARO,
  },
  verifyBtn: {
    backgroundColor: COLORS.PRIMARIO,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyText: {
    color: COLORS.BLANCO,
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.TEXTO_SECUNDARIO,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    color: '#1B7F3A',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  resendLink: {
    fontSize: 13,
    color: COLORS.PRIMARIO,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: COLORS.TEXTO_SECUNDARIO,
  },
});
