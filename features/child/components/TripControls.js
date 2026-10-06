import { Button } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { AppTouch } from '../../../theme/tokens';

export default function TripControls({ status, loading, onStart, onFinish }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const sharing = status === 'sharing';

  return (
    <Button
      mode="contained"
      buttonColor={sharing ? colors.error : colors.primary}
      textColor={sharing ? (colors.onError || colors.textOnPrimary) : colors.textOnPrimary}
      style={styles.button}
      loading={loading}
      disabled={loading}
      onPress={sharing ? onFinish : onStart}
      accessibilityLabel={sharing ? 'Finalizar compartir ubicación' : 'Iniciar compartir ubicación'}
      accessibilityHint={sharing ? 'Detiene el envío de ubicación del trayecto escolar' : 'Solicita permisos e inicia el rastreo del trayecto escolar'}
    >
      {sharing ? 'Finalizar trayecto' : 'Iniciar trayecto'}
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
