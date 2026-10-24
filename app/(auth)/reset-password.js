import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSelector from '../../components/common/LanguageSelector';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';

const rulesFor = (password, confirmPassword) => ({
  min: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  match: password.length > 0 && password === confirmPassword,
});

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const rules = useMemo(() => rulesFor(password, confirmPassword), [password, confirmPassword]);
  const strengthScore = ['min', 'upper', 'lower', 'number', 'special'].filter(key => rules[key]).length;
  const strength = strengthScore <= 2 ? t('authWeak') : strengthScore <= 4 ? t('authMedium') : t('authStrong');
  const strengthColor = strengthScore <= 2 ? colors.error : strengthScore <= 4 ? colors.warning : colors.success;
  const canSubmit = Object.values(rules).every(Boolean);

  const handleResetPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!canSubmit) {
      setErrorMsg(t('authPasswordRulesFailed'));
      return;
    }

    try {
      setIsSubmitting(true);
      const token = params.token ? String(params.token) : '';
      if (!token) {
        throw new Error('El enlace de recuperación no incluye token.');
      }
      await authService.resetPasswordWithToken(token, password);
      setSuccessMsg(t('authPasswordChanged'));
      if (isAuthenticated) await logout();
      setTimeout(() => router.replace('/(auth)/login'), 900);
    } catch (error) {
      const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
      setErrorMsg(/diferente.*actual|different.*current|diff.rent.*actuel|diferente.*atual/.test(message)
        ? t('profilePasswordMustDiffer')
        : error.message || t('authPasswordUpdateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const RequirementItem = ({ text, met }) => (
    <View style={styles.requirementRow}>
      <MaterialCommunityIcons name={met ? 'check-circle' : 'circle-outline'} size={16} color={met ? colors.success : colors.textMuted} />
      <Text style={[styles.requirementText, { color: met ? colors.success : colors.textSecondary }]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <LanguageSelector />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.cardWrapper}>
            <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} contentFit="contain" />
            <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('appName')}</Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('authNewPassword')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {t('authRecoveryPasswordHelp')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('authNewPassword')}</Text>
                <TextInput
                  mode="outlined"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
                  textColor={colors.text}
                  theme={{ roundness: 8 }}
                  right={<TextInput.Icon icon={secureText ? 'eye' : 'eye-off'} onPress={() => setSecureText(!secureText)} color={colors.primary} />}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('authConfirmPass')}</Text>
                <TextInput
                  mode="outlined"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={secureConfirm}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
                  textColor={colors.text}
                  theme={{ roundness: 8 }}
                  right={<TextInput.Icon icon={secureConfirm ? 'eye' : 'eye-off'} onPress={() => setSecureConfirm(!secureConfirm)} color={colors.primary} />}
                />
              </View>

              <View style={[styles.strengthBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View style={styles.strengthHeader}>
                  <Text style={[styles.requirementsTitle, { color: colors.text }]}>{t('authPasswordStrength')}</Text>
                  <Text style={[styles.strengthText, { color: strengthColor }]}>{strength}</Text>
                </View>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: `${(strengthScore / 5) * 100}%`, backgroundColor: strengthColor }]} />
                </View>
                <RequirementItem text={t('securityMinLength')} met={rules.min} />
                <RequirementItem text={t('securityUpper')} met={rules.upper} />
                <RequirementItem text={t('securityLower')} met={rules.lower} />
                <RequirementItem text={t('securityNumber')} met={rules.number} />
                <RequirementItem text={t('securitySpecial')} met={rules.special} />
                <RequirementItem text={t('securityMatch')} met={rules.match} />
              </View>

              {errorMsg ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                  <Text style={[styles.feedbackText, { color: colors.error }]}>{errorMsg}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View style={[styles.errorBox, { backgroundColor: colors.accentLight, borderColor: colors.success }]}>
                  <Text style={[styles.feedbackText, { color: colors.success }]}>{successMsg}</Text>
                </View>
              ) : null}

              <Button
                mode="contained"
                onPress={handleResetPassword}
                loading={isSubmitting}
                disabled={isSubmitting || !canSubmit}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
                buttonColor={colors.primary}
                textColor={colors.textOnPrimary}
              >
                {t('authSavePassword')}
              </Button>

              {isAuthenticated ? (
                <Button mode="text" textColor={colors.primary} onPress={() => router.replace('/(tabs)')}>
                  {t('authGoDashboard')}
                </Button>
              ) : null}
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
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
  backButton: { padding: 8 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  cardWrapper: { width: '100%', alignItems: 'center', padding: 20, alignSelf: 'center' },
  headerLogo: { width: 110, height: 110, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  card: { width: '100%', maxWidth: 440, padding: 22, borderRadius: 10, elevation: 2, borderWidth: 1 },
  cardTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  cardSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { height: 46 },
  strengthBox: { borderRadius: 8, padding: 14, marginBottom: 16, borderWidth: 1 },
  strengthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  requirementsTitle: { fontSize: 14, fontWeight: '700' },
  strengthText: { fontSize: 13, fontWeight: '700' },
  strengthTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden', marginBottom: 12 },
  strengthFill: { height: '100%', borderRadius: 3 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  requirementText: { fontSize: 12 },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1 },
  feedbackText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  actionButton: { borderRadius: 8, marginTop: 4 },
  buttonContent: { height: 48 },
});
