import Button from '../../../components/ui/PaperButton';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { AppTouch } from '../../../theme/tokens';

export default function TripControls({ status, loading, onStart }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // The student can start sharing, but only the guardian can finish a trip.
  if (status === 'sharing') return null;

  return (
    <Button
      mode="contained"
      buttonColor={colors.primary}
      textColor={colors.textOnPrimary}
      style={styles.button}
      loading={loading}
      disabled={loading}
      onPress={onStart}
      accessibilityLabel="Iniciar compartir ubicación"
      accessibilityHint="Solicita permisos e inicia el rastreo del trayecto escolar"
    >
      Iniciar trayecto
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: AppTouch.min,
  },
});
