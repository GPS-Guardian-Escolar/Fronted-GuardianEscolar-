import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { AppSpacing, AppTypography } from '../../../theme/tokens';

export default function QrSection({ value, code, title, hint, size = 160, colors, style }) {
  const { width } = useWindowDimensions();
  const compact = width <= 420;
  const qrSize = compact ? Math.min(Math.max(size, 160), 190) : size;

  return (
    <View
      style={[styles.card, compact && styles.cardCompact, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, style]}
      accessibilityLabel="Mostrar código QR para vincular"
    >
      <QRCode value={value} size={qrSize} />
      <View style={styles.textCol}>
        <Text style={[styles.title, compact && styles.compactText, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.code, compact && styles.compactText, { color: colors.primary }]} numberOfLines={2}>{code}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: AppSpacing.md,
    marginBottom: 14,
    padding: AppSpacing.md,
  },
  cardCompact: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  compactText: {
    textAlign: 'center',
  },
  title: {
    ...AppTypography.sm,
    fontWeight: '700',
    flexShrink: 1,
    lineHeight: 20,
  },
  code: {
    ...AppTypography.sm,
    fontWeight: '800',
    flexShrink: 1,
    marginTop: 3,
  },
  hint: {
    ...AppTypography.xs,
    flexShrink: 1,
    marginTop: 4,
  },
});
