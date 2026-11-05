import { AppRadius } from '../../theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import IconButton from '../ui/PaperIconButton';
import Button from '../ui/PaperButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const LOCALES = { es: 'es-CO', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };
const WEEK_DAYS = {
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  pt: ['Se', 'Te', 'Qu', 'Qu', 'Se', 'Sa', 'Do'],
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let i = 0; i < mondayOffset; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

export default function CalendarDatePicker({ value, onChange, label, placeholder }) {
  const { theme } = useTheme();
  const { lang, t } = useLanguage();
  const colors = theme.colors;
  const { width } = useWindowDimensions();
  const selectedDate = fromDateKey(value);
  const [visible, setVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(Platform.OS === 'web' && width >= 700);
  const [monthDate, setMonthDate] = useState(selectedDate || new Date());
  const [yearDraft, setYearDraft] = useState(String((selectedDate || new Date()).getFullYear()));
  const [yearPage, setYearPage] = useState(Math.floor(((selectedDate || new Date()).getFullYear() - 1900) / 12));
  const days = useMemo(() => getCalendarDays(monthDate), [monthDate]);

  const locale = LOCALES[lang] || LOCALES.es;
  const weekDays = WEEK_DAYS[lang] || WEEK_DAYS.es;
  const monthLabel = monthDate.toLocaleDateString(locale, { month: 'long' });
  const yearLabel = String(monthDate.getFullYear());
  const monthOptions = Array.from({ length: 12 }, (_, index) => new Date(2020, index, 1).toLocaleDateString(locale, { month: 'long' }));
  const yearStart = 1900 + yearPage * 12;
  const yearOptions = Array.from({ length: 12 }, (_, index) => yearStart + index);

  const openPicker = () => {
    setSelectionMode(Platform.OS === 'web' && width >= 700);
    setYearDraft(String(monthDate.getFullYear()));
    setYearPage(Math.floor((monthDate.getFullYear() - 1900) / 12));
    setVisible(true);
  };

  const changeMonth = (offset) => {
    setMonthDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const selectMonthYear = (month, year) => {
    setMonthDate(new Date(year, month, 1));
    setYearDraft(String(year));
    setYearPage(Math.floor((year - 1900) / 12));
    setSelectionMode(false);
  };

  const changeYearDraft = (text) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    setYearDraft(digits);
    if (digits.length === 4) {
      const year = Number(digits);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        setMonthDate(current => new Date(year, current.getMonth(), 1));
        setYearPage(Math.floor((year - 1900) / 12));
      }
    }
  };

  const selectDate = (date) => {
    onChange(toDateKey(date));
    setVisible(false);
  };

  const clearDate = () => {
    onChange('');
    setVisible(false);
  };

  return (
    <>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
        <Text style={[styles.triggerText, { color: value ? colors.text : colors.textSecondary }]}>
          {value || placeholder || t('calendarSelectDate')}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <IconButton icon="chevron-left" iconColor={colors.text} onPress={() => changeMonth(-1)} />
              <View style={styles.headerSelectors}>
                <TouchableOpacity style={styles.selectorButton} onPress={() => setSelectionMode(true)}>
                  <Text style={[styles.monthTitle, { color: colors.text }]}>{monthLabel}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectorButton} onPress={() => setSelectionMode(true)}>
                  <Text style={[styles.monthTitle, { color: colors.text }]}>{yearLabel}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <IconButton icon="chevron-right" iconColor={colors.text} onPress={() => changeMonth(1)} />
            </View>

            {selectionMode ? (
              <View style={styles.selectorPanel}>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>{t('calendarMonth')}</Text>
                <View style={styles.monthGrid}>
                  {monthOptions.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[styles.optionButton, { borderColor: colors.border }, index === monthDate.getMonth() && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => selectMonthYear(index, monthDate.getFullYear())}
                    >
                      <Text style={[styles.optionText, { color: index === monthDate.getMonth() ? colors.textOnPrimary : colors.text }]}>{month.slice(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.selectorLabel, { color: colors.textSecondary }]}>{t('calendarYear')}</Text>
                <View style={styles.yearControls}>
                  <IconButton icon="chevron-left" size={20} iconColor={colors.text} onPress={() => setYearPage(page => Math.max(0, page - 1))} />
                  <TextInput
                    mode="outlined"
                    value={yearDraft}
                    onChangeText={changeYearDraft}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.yearInput}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    dense
                  />
                  <IconButton icon="chevron-right" size={20} iconColor={colors.text} onPress={() => setYearPage(page => page + 1)} />
                </View>
                <View style={styles.yearGrid}>
                  {yearOptions.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.yearButton, { borderColor: colors.border }, year === monthDate.getFullYear() && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => selectMonthYear(monthDate.getMonth(), year)}
                    >
                      <Text style={[styles.optionText, { color: year === monthDate.getFullYear() ? colors.textOnPrimary : colors.text }]}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.weekRow}>
                  {weekDays.map(day => (
                    <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>{day}</Text>
                  ))}
                </View>
                <ScrollView contentContainerStyle={styles.daysGrid}>
                  {days.map((date, index) => {
                    const dateKey = toDateKey(date);
                    const isSelected = value && dateKey === value;
                    return (
                      <TouchableOpacity
                        key={`${dateKey || 'empty'}-${index}`}
                        disabled={!date}
                        style={[styles.dayCell, date && { borderColor: colors.border }, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => selectDate(date)}
                      >
                        <Text style={[styles.dayText, { color: date ? colors.text : 'transparent' }, isSelected && { color: colors.textOnPrimary, fontWeight: '700' }]}>
                          {date ? date.getDate() : 0}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
            <View style={styles.actions}>
              <Button mode="text" textColor={colors.textSecondary} onPress={clearDate}>{t('calendarClear')}</Button>
              <Button mode="contained" buttonColor={colors.primary} textColor={colors.textOnPrimary} onPress={() => setVisible(false)}>{t('calendarClose')}</Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  trigger: {
    minHeight: 45,
    borderWidth: 1,
    borderRadius: AppRadius.button,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  headerSelectors: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  monthTitle: {
    textTransform: 'capitalize',
    fontSize: 16,
    fontWeight: '700',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: AppRadius.button,
  },
  selectorPanel: {
    paddingBottom: 4,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  optionButton: {
    width: '31.8%',
    minHeight: 36,
    borderWidth: 1,
    borderRadius: AppRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  yearInput: {
    width: 100,
    height: 40,
    textAlign: 'center',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 4,
  },
  yearButton: {
    width: '31.8%',
    minHeight: 36,
    borderWidth: 1,
    borderRadius: AppRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 42,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.button,
  },
  dayText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
