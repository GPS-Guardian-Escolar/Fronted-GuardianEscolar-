import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';

export default function ConfirmLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const colors = theme.colors;
  const token = params.token ? String(params.token) : '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Confirmando este dispositivo...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace no incluye token de confirmación.');
      return;
    }

    authService.confirmLoginWithToken(token)
      .then(result => {
        setStatus('success');
        setMessage(result.message);
      })
      .catch(error => {
        setStatus('error');
        setMessage(error.message || 'No se pudo confirmar el dispositivo.');
      });
  }, [token]);

  const isSuccess = status === 'success';
  const goToLogin = () => {
    router.replace({ pathname: '/(auth)/login', params: { notice: isSuccess ? 'device-confirmed' : undefined } });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={goToLogin}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colors.primary} />
      </TouchableOpacity>
      <View style={styles.wrapper}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons
            name={isSuccess ? 'cellphone-check' : status === 'loading' ? 'timer-sand' : 'cellphone-remove'}
            size={46}
            color={isSuccess ? colors.success : status === 'loading' ? colors.primary : colors.error}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {isSuccess ? 'Dispositivo confirmado' : status === 'loading' ? 'Confirmando' : 'No se pudo confirmar'}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <Button mode="contained" onPress={goToLogin} buttonColor={colors.primary} textColor={colors.textOnPrimary} style={styles.button}>
            {isSuccess ? 'Iniciar sesión' : 'Volver al login'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: { padding: 24, alignSelf: 'flex-start' },
  wrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo: { width: 110, height: 110, marginBottom: 14 },
  card: { width: '100%', maxWidth: 460, alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  button: { marginTop: 20, borderRadius: 8, alignSelf: 'stretch' },
});
