import { AppRadius } from '../../theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Button from '../../components/ui/PaperButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';

export default function ChooseRecoveryActionScreen() {
  const router = useRouter();
  const { setAuthState } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDashboard = async () => {
    setErrorMsg('');
    try {
      setIsSubmitting(true);
      const session = await authService.completeRecoveryLogin();
      setAuthState(session);
      if (session.user.role === 'STUDENT') {
        router.replace('/student-dashboard');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      setErrorMsg(error.message || t('someError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.wrapper}>
          <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} contentFit="contain" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
              <MaterialCommunityIcons name="check-decagram-outline" size={42} color={colors.success} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('authRecoveryComplete')}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {t('authRecoveryVerified')}
            </Text>

            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <Button
              mode="contained"
              icon="lock-reset"
              onPress={() => router.push('/(auth)/reset-password')}
              buttonColor={colors.primary}
              textColor={colors.textOnPrimary}
              style={styles.actionButton}
              contentStyle={styles.buttonContent}
            >
              {t('authChangePassword')}
            </Button>

            <Button
              mode="outlined"
              icon="view-dashboard-outline"
              onPress={handleDashboard}
              loading={isSubmitting}
              disabled={isSubmitting}
              textColor={colors.primary}
              style={[styles.actionButton, { borderColor: colors.primary }]}
              contentStyle={styles.buttonContent}
            >
              {t('authGoDashboard')}
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
  backButton: { padding: 8 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  wrapper: { width: '100%', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  headerLogo: { width: 110, height: 110, marginBottom: 8 },
  card: { width: '100%', maxWidth: 430, padding: 24, borderRadius: 10, elevation: 2, borderWidth: 1, alignItems: 'center' },
  iconWrap: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  cardSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  actionButton: { width: '100%', borderRadius: AppRadius.button, marginBottom: 12 },
  buttonContent: { height: 48 },
  errorBox: { width: '100%', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1 },
  errorText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
