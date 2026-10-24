import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const LANGUAGE_LABELS = { es: 'langEs', en: 'langEn', fr: 'langFr', pt: 'langPt' };

export default function LanguageSelector({ style }) {
  const { lang, setLanguage, t } = useLanguage();
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.root, style, { flexDirection: 'row', gap: 8 }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(isDark ? 'themeLight' : 'themeDark')} onPress={toggleTheme} style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MaterialCommunityIcons name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'} size={20} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('welcomeChangeLanguage') + ` ${t(LANGUAGE_LABELS[lang])}`}
        onPress={() => setVisible(true)}
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <MaterialCommunityIcons name="web" size={20} color={colors.primary} />
        <Text style={[styles.code, { color: colors.primary }]}>{lang.toUpperCase()}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} accessibilityRole="button" accessibilityLabel={t('close')} />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primary }]}>{t('langTitle')}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => setVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {Object.entries(LANGUAGE_LABELS).map(([code, key]) => {
              const selected = code === lang;
              return (
                <TouchableOpacity
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={async () => {
                    await setLanguage(code);
                    setVisible(false);
                  }}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.optionCode, { color: selected ? colors.primary : colors.text }]}>{code.toUpperCase()}</Text>
                  <Text style={[styles.optionLabel, { color: selected ? colors.primary : colors.text }]}>{t(key)}</Text>
                  {selected ? <MaterialCommunityIcons name="check" size={20} color={colors.accent} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 20 },
  trigger: { minHeight: 48, minWidth: 58, paddingHorizontal: 12, borderWidth: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  code: { fontSize: 14, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'center', padding: 22 },
  sheet: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 18, borderWidth: 1, borderRadius: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#CBD5E1' },
  title: { fontSize: 18, fontWeight: '700' },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  optionCode: { width: 42, fontSize: 15, fontWeight: '700' },
  optionLabel: { flex: 1, fontSize: 16 },
});
