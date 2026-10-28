import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { AppSpacing, AppTypography } from '../../../theme/tokens';

export default function QrSection({ value, code, title, hint, size = 200, colors, style }) {
  const qrSize = Math.min(Math.max(size, 200), 240);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, style]}
      accessibilityLabel="Mostrar código QR para vincular"
    >
      <QRCode value={value} size={qrSize} />
      <View style={styles.textCol}>
        <Text style={[styles.title, styles.centerText, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.code, styles.centerText, { color: colors.primary }]} numberOfLines={2}>{code}</Text>
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
    flexDirection: 'column',
    justifyContent: 'center',
    gap: AppSpacing.md,
    marginBottom: 14,
    padding: AppSpacing.md,
  },
  textCol: {
    minWidth: 0,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  centerText: {
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
    textAlign: 'center',
  },
});
