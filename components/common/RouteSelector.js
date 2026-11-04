import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import Button from '../ui/PaperButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function RouteSelector({ routes = [], selectedRouteId, savingRouteId, onSelect, disabled = false }) {
  const { theme: { colors } } = useTheme();
  const { t } = useLanguage();
  if (routes.length < 2) return null;

  return (
    <Surface style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={0}>
      <Text style={{ color: colors.text }}>{t('trackSelectRouteToView')}</Text>
      <View style={styles.buttons}>
        {routes.map(route => {
          const selected = String(route.id) === String(selectedRouteId);
          return (
            <Button key={route.id} mode={selected ? 'contained' : 'outlined'}
              buttonColor={selected ? colors.primary : undefined}
              textColor={selected ? colors.textOnPrimary : colors.primary}
              disabled={disabled || savingRouteId != null}
              loading={savingRouteId != null && String(savingRouteId) === String(route.id)}
              onPress={() => { if (!selected && !disabled && savingRouteId == null) onSelect(route); }}
              accessibilityState={{ selected, disabled: disabled || savingRouteId != null }}
              accessibilityLabel={t('trackSelectRouteToView') + ': ' + route.name}
              style={styles.button} labelStyle={styles.label}>
              {route.name || t('trackAssignedRoute')}
            </Button>
          );
        })}
      </View>
      <Text style={{ color: colors.textSecondary }}>{t('trackRouteViewOnly')}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { maxWidth: '100%' },
  label: { flexShrink: 1 },
});
