import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { AppSpacing, AppTypography } from '../../../theme/tokens';

export default function QrSection({ value, code, title, hint, size = 160, colors, style }) {
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }, style]}
      accessibilityLabel="Mostrar código QR para vincular"
    >
      <QRCode value={value} size={size} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.code, { color: colors.primary }]}>{code}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: AppSpacing.md,
    marginBottom: 14,
    padding: AppSpacing.md,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
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
