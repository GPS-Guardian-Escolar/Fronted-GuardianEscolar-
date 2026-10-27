import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  Dimensions,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useFocusEffect } from 'expo-router';
import { getNotifications, deleteNotification, deleteHistory } from '../../utils/studentStorage';
import { notificationService } from '../../services/notification.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const isWeb = Dimensions.get('window').width > 768;

export default function NotificationsScreen() {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const themed = {
    screen: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface, borderColor: colors.border },
    surfaceSecondary: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
  };

  const FILTERS_KEYS = [
    { key: 'all',  label: () => t('notifAll'),      type: null },
    { key: 'Exitosas',    label: () => t('notifSuccess'),   type: 'Exitosas' },
    { key: 'Advertencias', label: () => t('notifWarnings'), type: 'Advertencias' },
    { key: 'Informativas', label: () => t('notifInfo'),     type: 'Informativas' },
  ];

  const CHIP_COLORS = {
    all:          { active: colors.primary, inactive: colors.surfaceSecondary },
    Exitosas:     { active: colors.success, inactive: colors.surfaceSecondary },
    Advertencias: { active: colors.error,   inactive: colors.surfaceSecondary },
    Informativas: { active: colors.primary, inactive: colors.surfaceSecondary },
  };

  const normalizeNotification = useCallback((item) => {
    const rawMessage = item.mensaje || item.message || item.titulo || '';
    const message = rawMessage
      .replace(/ entered safe zone /gi, ' ingresó a la zona segura ')
      .replace(/ left safe zone /gi, ' salió de la zona segura ')
      .replace(/Trip started for /gi, 'Se inició el trayecto de ')
      .replace(/Long inactivity detected during (.+)'s trip/gi, 'Se detectó inactividad prolongada durante el trayecto de $1')
      .replace(/Possible route deviation detected for /gi, 'Se detectó un posible desvío de ruta para ');
    const tipo = String(item.tipo || item.type || '').toUpperCase();
    const eventType = String(item.eventType || item.event_type || '').toUpperCase();
    const searchableText = `${eventType} ${tipo} ${message}`.toUpperCase();
    const isWarning = tipo.includes('ALERTA')
      || tipo.includes('ADVERT')
      || eventType === 'SAFE_ZONE_EXIT'
      || eventType === 'ROUTE_DEVIATION'
      || eventType === 'INACTIVITY'
      || searchableText.includes('SALIÓ DE LA ZONA')
      || searchableText.includes('SALIO DE LA ZONA')
      || searchableText.includes('DESVÍO DE RUTA')
      || searchableText.includes('DESVIO DE RUTA');
    const mappedType = isWarning ? 'Advertencias'
      : tipo.includes('EXITO') || tipo.includes('SUCCESS') ? 'Exitosas'
        : 'Informativas';
    const receiptId = item.receiptId || item.id;
    return {
      id: receiptId,
      receiptId,
      notificationId: item.notificationId,
      type: mappedType,
      name: item.estudianteNombre || item.name || t('notifDetail'),
      message,
      time: item.receivedAt || item.eventDateTime || item.recibidoEn || item.creadoEn || item.time || '',
      color: mappedType === 'Advertencias' ? colors.error : mappedType === 'Exitosas' ? colors.success : colors.primary,
      read: Boolean(item.wasRead ?? item.leida ?? item.read),
    };
  }, [colors, t]);

  const loadNotifications = useCallback(async () => {
    setRefreshing(true);
    try {
      const [backendNotifs, storedNotifs] = await Promise.all([
        notificationService.listNotifications().catch(() => []),
        getNotifications(),
      ]);
      setNotifications([...backendNotifs.map(normalizeNotification), ...storedNotifs.map(normalizeNotification)]);
    } catch (error) {
      Alert.alert(t('error'), error.message || 'No se pudieron cargar las notificaciones.');
    } finally {
      setRefreshing(false);
    }
  }, [normalizeNotification, t]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  function confirmDeleteNotif(item) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('delete') + '?');
      if (confirmed) {
        (async () => {
          await deleteNotification(item.id);
          await deleteHistory(item.id);
          setNotifications(prev => prev.filter(n => n.id !== item.id));
        })();
      }
      return;
    }

    Alert.alert(
      t('delete'),
      t('delete') + '?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(item.id);
            await deleteHistory(item.id);
            setNotifications(prev => prev.filter(n => n.id !== item.id));
          }
        }
      ]
    );
  }

  const filterCounts = {
    all: notifications.length,
    Exitosas:     notifications.filter(n => n.type === 'Exitosas').length,
    Advertencias: notifications.filter(n => n.type === 'Advertencias').length,
    Informativas: notifications.filter(n => n.type === 'Informativas').length,
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(previous => previous.map(item => ({ ...item, read: true })));
    } catch (error) {
      Alert.alert(t('error'), error.message || 'No se pudieron marcar las notificaciones.');
    }
  };

  return (
    <View style={[styles.container, themed.screen]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWeb && styles.scrollContentWeb]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} colors={[COLORS.PRIMARIO]} tintColor={COLORS.PRIMARIO} />
        }
      >
        {/* Título */}
        <View style={styles.titleRow}>
          <View>
            <RNText style={[styles.pageTitle, themed.text]}>{t('notifTitle')}</RNText>
            <RNText style={[styles.pageSubtitle, themed.textSecondary]}>{notifications.length} {t('notifSubtitle')}</RNText>
          </View>
          <TouchableOpacity 
            style={[styles.markAllBtn, themed.surfaceSecondary]}
            onPress={markAllAsRead}
          >
            <RNText style={[styles.markAllText, themed.textSecondary]}>{t('notifMarkAll')}</RNText>
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <View style={[styles.filterCard, themed.surface]}>
          <RNText style={[styles.filterLabel, themed.textSecondary]}>{t('notifFilter')}</RNText>
          <View style={styles.chipsRow}>
            {FILTERS_KEYS.map((f) => {
              const isActive = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: isActive ? CHIP_COLORS[f.key].active : CHIP_COLORS[f.key].inactive, borderColor: isActive ? CHIP_COLORS[f.key].active : colors.border }
                  ]}
                  activeOpacity={0.8}
                >
                  <RNText style={[styles.chipText, themed.text, isActive && styles.chipTextActive]}>
                    {f.label()} ({filterCounts[f.key]})
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notificaciones */}
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.notifCard, themed.surface]}
              onPress={async () => {
                const isRemoteReceipt = item.receiptId && !String(item.receiptId).startsWith('notif-');
                if (!item.read && isRemoteReceipt) {
                  try {
                    await notificationService.markAsRead(item.receiptId);
                    setNotifications(previous => previous.map(notification => notification.id === item.id
                      ? { ...notification, read: true }
                      : notification));
                  } catch (error) {
                    Alert.alert(t('error'), error.message || 'No se pudo marcar la notificación.');
                    return;
                  }
                }
                Alert.alert(t('notifDetail'), item.message);
              }}
            >
              <View style={styles.notifRow}>
                <View style={[styles.colorCircle, { backgroundColor: item.color }]} />
                <View style={styles.notifInfo}>
                  <RNText style={[styles.notifName, themed.text]}>{item.name}</RNText>
                  <RNText style={[styles.notifMessage, themed.text]}>
                    {item.message}
                  </RNText>
                  <RNText style={[styles.notifTime, themed.textSecondary]}>
                    {item.time || t('live')}
                  </RNText>
                </View>
                <TouchableOpacity 
                  style={{ padding: 8, justifyContent: 'center' }} 
                  onPress={() => confirmDeleteNotif(item)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <RNText style={[styles.emptyText, themed.textSecondary]}>{t('notifEmpty')}</RNText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.FONDO_PRINCIPAL,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  scrollContentWeb: {
    paddingHorizontal: 40,
    paddingTop: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: isWeb ? 20 : 16,
    fontWeight: 'bold',
    color: COLORS.TEXTO_GENERAL,
  },
  pageSubtitle: {
    fontSize: 12,
    color: COLORS.TEXTO_SECUNDARIO,
    marginTop: 2,
  },
  markAllBtn: {
    borderWidth: 1,
    borderColor: COLORS.GRIS_BORDE,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 11,
    color: COLORS.TEXTO_SECUNDARIO,
  },
  filterCard: {
    backgroundColor: COLORS.FONDO_TARJETA,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.GRIS_BORDE,
  },
  filterLabel: {
    fontSize: 12,
    color: COLORS.TEXTO_SECUNDARIO,
    marginBottom: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chip: {
    width: '48%',
    borderRadius: 20,
    paddingVertical: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 11,
    color: COLORS.TEXTO_GENERAL,
    fontWeight: '500',
    textAlign: 'center',
  },
  chipTextActive: {
    color: COLORS.BLANCO,
    fontWeight: 'bold',
  },
  notifCard: {
    backgroundColor: COLORS.FONDO_TARJETA,
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.GRIS_BORDE,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 14,
  },
  notifInfo: {
    flex: 1,
  },
  notifName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.TEXTO_GENERAL,
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 13,
    color: COLORS.TEXTO_GENERAL,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: COLORS.TEXTO_SECUNDARIO,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.TEXTO_SECUNDARIO,
  },
});
