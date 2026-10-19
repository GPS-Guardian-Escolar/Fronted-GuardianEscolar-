import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppTypography } from '../../../theme/tokens';

export default function LinkStatusBadge({ label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]} accessibilityRole="text" accessibilityLabel={`Estado del estudiante: ${label}`}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    ...AppTypography.xs,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});
