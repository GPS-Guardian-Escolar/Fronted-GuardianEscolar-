import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Avatar, IconButton, Surface, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import CalendarDatePicker from '../../components/common/CalendarDatePicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { deleteHistory, deleteNotification, getHistory } from '../../utils/studentStorage';
import { trackingService } from '../../services/tracking.service';
import { notificationService } from '../../services/notification.service';
import { getHistoryStatusKind, matchesHistoryStatus, toLocalDateKey } from '../../utils/tripHistory';
import AppError from '../../components/ui/AppError';
import AppLoading from '../../components/ui/AppLoading';

const DATE_LOCALES = { es: 'es-CO', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR' };

function formatTripDate(value, lang = 'es') {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(DATE_LOCALES[lang] || DATE_LOCALES.es, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTripTime(value, lang = 'es') {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleTimeString(DATE_LOCALES[lang] || DATE_LOCALES.es, { hour: '2-digit', minute: '2-digit' });
}

function normalizeTrip(trip, notifications = [], lang = 'es') {
  const status = String(trip.status || '').toUpperCase();
  const tripEvents = notifications.filter(notification => String(notification.tripId) === String(trip.id));
  const alerta = Boolean(trip.hadDeviation)
    || tripEvents.some(notification => notification.eventType === 'ROUTE_DEVIATION');
  const advertencia = tripEvents.some(notification => notification.eventType === 'INACTIVITY');
  return {
    id: `trip-${trip.id}`,
    backendId: trip.id,
    estudiante: trip.student || 'Estudiante',
    fecha: formatTripDate(trip.tripStartedAt, lang),
    fechaKey: toLocalDateKey(trip.tripStartedAt),
    horaInicio: formatTripTime(trip.tripStartedAt, lang),
    horaFin: formatTripTime(trip.tripEndedAt, lang),
    ruta: trip.route || 'Ruta asignada',
    estado: status === 'IN_PROGRESS' ? 'En Proceso' : status === 'COMPLETED' ? 'Completado' : status === 'CANCELED' ? 'Cancelado' : 'Pendiente',
    alerta,
    advertencia: !alerta && advertencia,
    duracion: trip.tripStartedAt && trip.tripEndedAt ? Math.max(0, Math.round((new Date(trip.tripEndedAt) - new Date(trip.tripStartedAt)) / 60000)) : 0,
  };
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 769;
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setLoadError(null);
    try {
      const [storedHistory, trips, notifications] = await Promise.all([
        getHistory(),
        trackingService.listTrips(),
        notificationService.listNotifications(),
      ]);
      const remoteHistory = (trips || []).map(trip => normalizeTrip(trip, notifications || [], lang));
      const remoteIds = new Set(remoteHistory.map(item => item.backendId));
      const localOnly = storedHistory.filter(item => !item.backendId && !remoteIds.has(item.id));
      setHistory([...remoteHistory, ...localOnly]);
    } catch (error) {
      setLoadError(error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (loading) return <AppLoading message="Cargando historial..." />;
  if (loadError) return <AppError message="No se pudo cargar el historial." onRetry={loadData} />;

  function confirmDeleteHistory(item) {
    const removeItem = async () => {
      await deleteHistory(item.id);
      await deleteNotification(item.id);
      await loadData();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('histDeleteConfirm'))) removeItem();
      return;
    }

    Alert.alert(t('histDelete'), t('histDeleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: removeItem },
    ]);
  }

  const stats = {
    total: history.length,
    completados: history.filter(item => item.estado === 'Completado').length,
    incidentes: history.filter(item => (item.alerta && !item.advertencia) || item.estado === 'Con Incidente').length,
    enProceso: history.filter(item => item.estado === 'En Proceso').length,
    horas: history.reduce((acc, item) => acc + (parseInt(item.duracion, 10) || 0), 0) / 60,
  };

  const filteredHistory = history.filter((item) => {
    const matchesStudent = !filterStudent || item.estudiante.toLowerCase().includes(filterStudent.toLowerCase());
    const matchesDate = !filterDate || item.fechaKey === filterDate;
    const matchesStatus = matchesHistoryStatus(item, statusFilter);
    return matchesStudent && matchesDate && matchesStatus;
  });

  const getDisplayedStatus = (item) => {
    const kind = getHistoryStatusKind(item);
    if (kind === 'incident') return t('histIncident');
    if (kind === 'inProgress') return t('histInProcess');
    if (kind === 'completed') return t('histCompleted');
    return item.estado;
  };

  const getStatusColor = (item) => {
    const kind = getHistoryStatusKind(item);
    if (kind === 'inProgress') return colors.primary;
    if (kind === 'completed') return colors.accent;
    if (kind === 'incident') return colors.error;
    if (item.advertencia) return colors.warning;
    return colors.textSecondary;
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const buildReportHtml = () => {
    const generatedAt = new Date().toLocaleString(DATE_LOCALES[lang] || DATE_LOCALES.es);
    const activeFilters = [
      [t('tabStudent'), filterStudent || t('histFilterAll')],
      [t('histDate'), filterDate || t('histFilterAll')],
      [t('histStatus'), statusFilter === 'all' ? t('histFilterAll') : statusFilter === 'En Proceso' ? t('histInProcess') : statusFilter === 'Completado' ? t('histCompleted') : t('histIncident')],
    ];
    const rows = filteredHistory.map((item) => `
      <tr>
        <td>${escapeHtml(item.estudiante)}</td>
        <td>${escapeHtml(item.fecha)}</td>
        <td>${escapeHtml(item.horaInicio)}${item.horaFin && item.horaFin !== '--' ? ` - ${escapeHtml(item.horaFin)}` : ''}</td>
        <td>${escapeHtml(item.ruta)}</td>
        <td><span class="status">${escapeHtml(getDisplayedStatus(item))}</span></td>
        <td>${escapeHtml(item.alerta ? t('histObsAlert') : item.advertencia ? t('histObsInactivity') : t('histObsNormal'))}</td>
      </tr>
    `).join('');

    return `
      <!doctype html>
      <html lang="${escapeHtml(lang)}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t('histReportTitle'))}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; color: #172033; font-family: Arial, Helvetica, sans-serif; background: #ffffff; }
          .header { border-bottom: 3px solid #1A4F8A; padding-bottom: 18px; margin-bottom: 24px; }
          .brand { color: #1A4F8A; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
          h1 { margin: 8px 0 4px; font-size: 28px; line-height: 1.2; }
          .muted { color: #64748b; font-size: 13px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
          .card { border: 1px solid #dfe7f2; border-radius: 8px; padding: 12px; background: #f8fafc; }
          .metric { color: #1A4F8A; font-size: 22px; font-weight: 800; }
          .label { color: #64748b; font-size: 11px; font-weight: 700; margin-top: 3px; text-transform: uppercase; }
          .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 20px; }
          .filter { border: 1px solid #dfe7f2; border-radius: 999px; padding: 8px 12px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #1A4F8A; color: #ffffff; font-size: 12px; text-align: left; padding: 10px; }
          td { border-bottom: 1px solid #e5e7eb; font-size: 12px; padding: 10px; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .status { color: #1A4F8A; font-weight: 700; }
          .empty { border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; padding: 24px; text-align: center; }
          @media print {
            body { padding: 18mm; }
            .summary { grid-template-columns: repeat(4, 1fr); }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <section class="header">
          <div class="brand">GPS Guardian Escolar</div>
          <h1>${escapeHtml(t('histReportTitle'))}</h1>
          <div class="muted">${escapeHtml(t('histGeneratedAt'))} ${escapeHtml(generatedAt)}</div>
        </section>

        <section class="summary">
          <div class="card"><div class="metric">${stats.total}</div><div class="label">Total</div></div>
          <div class="card"><div class="metric">${stats.completados}</div><div class="label">${escapeHtml(t('histCompleted'))}</div></div>
          <div class="card"><div class="metric">${stats.enProceso}</div><div class="label">${escapeHtml(t('histInProcess'))}</div></div>
          <div class="card"><div class="metric">${stats.incidentes}</div><div class="label">${escapeHtml(t('histIncident'))}</div></div>
        </section>

        <section class="filters">
          ${activeFilters.map(([label, value]) => `<div class="filter"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`).join('')}
        </section>

        ${filteredHistory.length === 0 ? `<div class="empty">${escapeHtml(t('histNoResults'))}</div>` : `
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t('studentLabel'))}</th>
                <th>${escapeHtml(t('histDate'))}</th>
                <th>${escapeHtml(t('histTime'))}</th>
                <th>${escapeHtml(t('histRoute'))}</th>
                <th>${escapeHtml(t('histStatus'))}</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `}
      </body>
      </html>
    `;
  };

  const handleGenerateReport = async () => {
    const html = buildReportHtml();

    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      try {
        const { uri } = await Print.printToFileAsync({
          html,
          width: 612,
          height: 792,
        });
        if (await isAvailableAsync()) {
          await shareAsync(uri, {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: 'Guardar reporte PDF',
          });
          return;
        }
        Alert.alert(t('histPdfTitle'), `${t('histPdfGenerated')}: ${uri}`);
      } catch (error) {
        Alert.alert(t('histPdfTitle'), error.message || t('histPdfFailed'));
      }
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=980,height=720');
    if (!reportWindow) {
      Alert.alert(t('histPdfTitle'), t('histPdfAllowPopups'));
      return;
    }
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.onload = () => {
      reportWindow.print();
    };
  };

  const StatCard = ({ title, value, icon, color, type }) => {
    const isActive = statusFilter === type;
    return (
      <TouchableOpacity
        onPress={() => setStatusFilter(type)}
        activeOpacity={0.75}
        style={[
          styles.statCard,
          { backgroundColor: colors.surface, borderColor: isActive ? color : colors.border, borderLeftColor: color },
          isActive && { backgroundColor: color + '20' },
        ]}
      >
        <View style={[styles.statIconWrap, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.textOnPrimary} />
          <Text style={[styles.statValue, { color: colors.textOnPrimary }]}>{value}</Text>
        </View>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = (item) => {
    const statusColor = getStatusColor(item);
    return (
      <Surface key={item.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: statusColor }]} elevation={1}>
        <View style={styles.cardHeader}>
          <Avatar.Text size={44} label={item.estudiante.substring(0, 2).toUpperCase()} style={{ backgroundColor: COLORS.PRIMARIO }} color={COLORS.TEXTO_CONTRASTE} />
          <View style={styles.headerInfo}>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.estudiante}</Text>
            <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{item.fecha}</Text>
          </View>
          {!item.backendId && <IconButton icon="trash-can-outline" size={18} containerColor={colors.surfaceSecondary} iconColor={colors.error} onPress={() => confirmDeleteHistory(item)} />}
        </View>

        <View style={[styles.detailsGrid, { backgroundColor: colors.surfaceSecondary }]}>
          <Detail label={item.horaFin && item.horaFin !== '--' ? `${t('histStart')} / ${t('histEnd')}` : t('histRegTime')} value={`${item.horaInicio}${item.horaFin && item.horaFin !== '--' ? ` - ${item.horaFin}` : ''}`} />
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('histStatus')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{getDisplayedStatus(item)}</Text>
            </View>
          </View>
          <Detail
            label={t('histObservation')}
            value={item.alerta ? t('histObsAlert') : item.advertencia ? t('histObsInactivity') : t('histObsNormal')}
            danger={item.alerta}
            warning={item.advertencia}
          />
          <Detail label={t('histRoute')} value={item.ruta} />
        </View>
      </Surface>
    );
  };

  const Detail = ({ label, value, danger, warning }) => (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: danger ? colors.error : warning ? colors.warning : colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWeb, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={[styles.headerRow, !isWide && styles.headerRowMobile]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{t('histTitle')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('histSubtitle')}</Text>
          </View>
          <TouchableOpacity style={[styles.reportBtn, { backgroundColor: colors.primary }]} onPress={handleGenerateReport}>
            <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.textOnPrimary} />
            <Text style={[styles.reportBtnText, { color: colors.textOnPrimary }]}>{t('histReport')}</Text>
          </TouchableOpacity>
        </View>

        <Surface style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <View style={[styles.filterGrid, { flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'flex-end' : 'stretch' }]}>
            <View style={styles.filterCol}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>{t('tabStudent')}</Text>
              <TextInput
                mode="outlined"
                value={filterStudent}
                onChangeText={setFilterStudent}
                placeholder={t('histChildPlaceholder')}
                style={[styles.filterInput, { backgroundColor: colors.surfaceSecondary }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                dense
              />
            </View>
            <View style={styles.filterCol}>
              <CalendarDatePicker value={filterDate} onChange={setFilterDate} label={t('histStart')} />
            </View>
            <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { setFilterStudent(''); setFilterDate(''); setStatusFilter('all'); }}>
              <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>{t('histClearFilter')}</Text>
            </TouchableOpacity>
          </View>
        </Surface>

        <View style={styles.statsGrid}>
          <StatCard title={t('histTotal')} value={stats.total} icon="format-list-bulleted" color={colors.textSecondary} type="all" />
          <StatCard title={t('histFilterCompleted')} value={stats.completados} icon="check-circle" color={colors.accent} type="Completado" />
          <StatCard title={t('histInProcess')} value={stats.enProceso} icon="bus-clock" color={colors.primary} type="En Proceso" />
          <StatCard title={t('histFilterIncident')} value={stats.incidentes} icon="alert-circle" color={colors.error} type="Con Incidente" />
        </View>

        <View style={styles.listContainer}>
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="magnify-close" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('histNoResults')}</Text>
            </View>
          ) : filteredHistory.map(renderHistoryItem)}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  scrollContentWeb: { maxWidth: 1100, alignSelf: 'center', width: '100%', paddingTop: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10, gap: 12 },
  headerRowMobile: { alignItems: 'stretch' },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 12 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, gap: 6 },
  reportBtnText: { fontWeight: 'bold', fontSize: 13 },
  filterBar: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
  filterGrid: { gap: 12 },
  filterCol: { flex: 1 },
  filterLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  filterInput: { height: 45 },
  clearBtn: { borderWidth: 1, paddingHorizontal: 20, height: 45, justifyContent: 'center', borderRadius: 8, alignItems: 'center' },
  clearBtnText: { fontSize: 13, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25 },
  statCard: { flex: 1, minWidth: 150, borderRadius: 10, padding: 12, borderWidth: 1, borderLeftWidth: 4 },
  statIconWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, padding: 6, borderRadius: 6, alignSelf: 'flex-start' },
  statValue: { fontWeight: 'bold', fontSize: 16 },
  statTitle: { fontSize: 11, fontWeight: '500' },
  listContainer: { gap: 12 },
  historyCard: { borderRadius: 12, padding: 12, borderWidth: 1, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerInfo: { marginLeft: 12, flex: 1 },
  itemName: { fontSize: 15, fontWeight: 'bold' },
  itemDate: { fontSize: 12 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 10, borderRadius: 8 },
  detailItem: { minWidth: 150, flex: 1 },
  detailLabel: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, marginTop: 2, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '500' },
});
