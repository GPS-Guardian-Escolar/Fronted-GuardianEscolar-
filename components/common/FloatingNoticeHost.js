import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Portal, Snackbar, Text } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeNotice } from '../../utils/noticeBus';

const TONE_COLORS = {
  info: 'primary',
  success: 'success',
  error: 'error',
  warning: 'warning',
};

export default function FloatingNoticeHost() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [notice, setNotice] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => subscribeNotice((nextNotice) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotice(nextNotice);
    timerRef.current = setTimeout(() => setNotice(null), nextNotice.duration);
  }), []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!notice) return null;

  const toneColor = colors[TONE_COLORS[notice.tone]] || colors.primary;

  if (notice.title === '__confirm__' && notice.message?.confirm) {
    const { title, message, cancel, confirm } = notice.message;
    return (
      <Portal>
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>{message}</Text>
            <View style={styles.confirmActions}>
              <Button mode="outlined" onPress={() => { setNotice(null); cancel?.onPress?.(); }}>
                {cancel?.text || 'Cancelar'}
              </Button>
              <Button mode="contained" onPress={() => { setNotice(null); confirm?.onPress?.(); }}>
                {confirm?.text || 'Confirmar'}
              </Button>
            </View>
          </View>
        </View>
      </Portal>
    );
  }

  return (
    <Portal>
      <View pointerEvents="box-none" style={styles.portalLayer}>
        <Snackbar
          visible
          onDismiss={() => setNotice(null)}
          duration={notice.duration}
          action={{ label: 'Aceptar', onPress: () => setNotice(null) }}
          style={[styles.card, { backgroundColor: colors.surfaceElevated || colors.surface, borderColor: toneColor }]}
          theme={{ colors: { inverseSurface: colors.surfaceElevated || colors.surface, inverseOnSurface: colors.text } }}
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: toneColor }]}>{notice.title}</Text>
            <Text style={[styles.message, { color: colors.text }]}>{notice.message}</Text>
          </View>
        </Snackbar>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  portalLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  confirmCard: {
    width: '92%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  card: {
    width: '92%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 16,
    elevation: 8,
    marginHorizontal: 16,
  },
  content: {
    gap: 4,
    paddingVertical: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
});
