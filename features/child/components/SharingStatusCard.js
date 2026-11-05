import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AppSpacing, AppTypography } from '../../../theme/tokens';

export default function SharingStatusCard({ status, queueSize, sentCount, activeTripId }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = theme.colors;
  const sharing = status === 'sharing';
  const waiting = status === 'waiting';

  return (
    <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={2}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons
          name={sharing ? 'map-marker-check' : waiting ? 'map-marker-radius' : 'map-marker-off-outline'}
          size={24}
          color={sharing ? colors.success : waiting ? colors.primary : colors.textSecondary}
          accessibilityLabel={sharing ? t('studentTrackingStarted') : waiting ? t('studentTrackingWaiting') : t('studentTrackingPaused')}
        />
        <Text style={[styles.cardTitle, { color: colors.text }]}>Rastreo del trayecto</Text>
      </View>

      <View style={[
        styles.badge,
        {
          backgroundColor: sharing ? colors.accentLight : waiting ? colors.surface : colors.surfaceSecondary,
          borderColor: sharing ? colors.accent : waiting ? colors.primary : colors.border,
        },
      ]}>
        <Text style={[styles.badgeText, { color: sharing ? colors.accentDark : waiting ? colors.primary : colors.textSecondary }]}>
          {sharing ? t('studentTrackingStarted') : waiting ? t('studentTrackingWaiting') : t('studentTrackingPaused')}
        </Text>
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {waiting ? t('studentTrackingWaitingDescription') : t('studentTrackingSharingDescription')}
      </Text>

      <View style={[styles.debugBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Text style={[styles.debugText, { color: colors.textSecondary }]}>Cola offline: {queueSize}</Text>
        <Text style={[styles.debugText, { color: colors.textSecondary }]}>Coordenadas enviadas: {sentCount}</Text>
        {!!activeTripId && <Text style={[styles.debugText, { color: colors.textSecondary }]} numberOfLines={1}>Trayecto: {activeTripId}</Text>}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: AppSpacing.md,
    padding: 20,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: AppSpacing.md,
  },
  cardTitle: {
    ...AppTypography.md,
    fontWeight: '700',
    marginLeft: AppSpacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: 6,
  },
  badgeText: {
    ...AppTypography.xs,
    fontWeight: '800',
  },
  description: {
    ...AppTypography.xs,
  },
  debugBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginTop: AppSpacing.sm,
    padding: AppSpacing.sm,
  },
  debugText: {
    ...AppTypography.xs,
  },
});
