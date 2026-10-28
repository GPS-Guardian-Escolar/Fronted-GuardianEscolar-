import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import AppButton from '../components/ui/AppButton';
import { useTheme } from '../contexts/ThemeContext';

export default function ForbiddenScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Permisos insuficientes</Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>No tienes permisos para realizar esta acción.</Text>
      <AppButton title="Volver" onPress={() => router.replace('/(tabs)')} accessibilityLabel="Volver" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center' },
});
