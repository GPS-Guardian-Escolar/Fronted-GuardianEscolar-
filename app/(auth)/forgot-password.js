import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import LanguageSelector from '../../components/common/LanguageSelector';
import { authService } from '../../services/auth.service';
import { isValidEmail } from '../../utils/validators';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [contact, setContact] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!contact.trim()) {
      setErrorMsg(t('invalidInput'));
      return;
    }
    if (!isValidEmail(contact)) {
      setErrorMsg(t('authInvalidEmail'));
      return;
    }
    try {
      setIsSubmitting(true);
      await authService.requestPasswordRecovery(contact);
      setSuccessMsg(t('authRecoverySent'));
    } catch (error) {
      setErrorMsg(/mail|correo|email delivery/i.test(error.message || '') ? t('authRecoveryUnavailable') : t('someError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
       <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <LanguageSelector />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.wrapper}>
            <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} contentFit="contain" />
            <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('appName')}</Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('authForgotTitle')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('authRecoveryHelp')}</Text>

              <Text style={[styles.label, { color: colors.text }]}>{t('authRecoveryContact')}</Text>

              <TextInput
                mode="outlined"
                value={contact}
                onChangeText={(value) => {
                  setContact(value);
                  setErrorMsg('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="correo@ejemplo.com"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                style={[styles.input, { backgroundColor: colors.surfaceSecondary }]}
                textColor={colors.text}
                theme={{ roundness: 6 }}
                left={<TextInput.Icon icon="account-search-outline" color={colors.textSecondary} />}
              />

              {errorMsg ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
                </View>
              ) : null}
              {successMsg ? <Text style={{ color: colors.accent, marginBottom: 12 }}>{successMsg}</Text> : null}

              <Button
                mode="contained"
                onPress={handleResetPassword}
                loading={isSubmitting}
                style={styles.actionButton}
                contentStyle={styles.buttonContent}
                buttonColor={colors.primary}
                textColor={colors.textOnPrimary}
                disabled={isSubmitting}
              >
                {t('authSendRecoveryLink')}
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
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backButton: { padding: 8 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  wrapper: { width: '100%', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  headerLogo: { width: 120, height: 120, marginBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  card: { width: '100%', maxWidth: 430, padding: 18, borderRadius: 8, elevation: 2, borderWidth: 1 },
  cardTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  cardSubtitle: { fontSize: 12, textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { height: 44, marginBottom: 10 },
  actionButton: { borderRadius: 8, marginTop: 10 },
  buttonContent: { height: 42 },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1 },
  errorText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
