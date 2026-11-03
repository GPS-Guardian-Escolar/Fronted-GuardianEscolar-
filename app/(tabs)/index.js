import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Avatar, Surface, Text } from 'react-native-paper';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getInitials, getNotifications, getStudents } from '../../utils/studentStorage';
import { notificationService } from '../../services/notification.service';
import { trackingService } from '../../services/tracking.service';
import AppError from '../../components/ui/AppError';
import AppLoading from '../../components/ui/AppLoading';
import { COLORS } from '../../constants/colors';

// ════════════════════════════════════════════════════════════════
// BREAKPOINTS
// ════════════════════════════════════════════════════════════════
const BREAKPOINTS = {
  mobile: 0,
  tablet: 481,
  desktop: 769,
  wide: 1025,
};

const getScreenType = (width) => {
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  if (width < BREAKPOINTS.wide) return 'desktop';
  return 'wide';
};

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const screenType = getScreenType(width);
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const { t } = useLanguage();
  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void retryKey;
      setLoading(true);
      setLoadError(null);

      Promise.all([
        getStudents(),
        notificationService.listNotifications(),
        getNotifications(),
        trackingService.listTrips(),
      ])
        .then(([storedStudents, apiNotifications, storedNotifications, apiTrips]) => {
          if (!isActive) return;
          setStudents(storedStudents);
          setNotifications([...apiNotifications, ...storedNotifications]);
          setTrips(apiTrips);
          setLoading(false);
        })
        .catch((error) => {
          if (!isActive) return;
          setLoadError(error);
          setLoading(false);
          console.warn('No se pudieron cargar los datos del panel:', error?.message || error);
        });

      return () => {
        isActive = false;
      };
    }, [retryKey])
  );

  if (loading) return <AppLoading message="Cargando panel..." />;
  if (loadError) return <AppError message="No se pudo cargar el panel." onRetry={() => setRetryKey((value) => value + 1)} />;

  const unreadNotifications = notifications.filter((notification) => !notification.leida && !notification.read);
  const recentNotifications = notifications.slice(0, 3);

  const notificationColor = (notification) => {
    const type = String(notification.tipo || notification.type || '').toUpperCase();
    if (type.includes('ALERTA') || type.includes('ADVERT')) return theme.colors.error;
    if (type.includes('EXITO') || type.includes('SUCCESS')) return theme.colors.success;
    return theme.colors.primary;
  };

  const notificationMessage = (notification) => (
    notification.mensaje || notification.message || notification.titulo || notification.title || t('notifDetail')
  );

  const notificationTime = (notification) => {
    const value = notification.recibidoEn || notification.creadoEn || notification.time || notification.createdAt;
    if (!value) return t('live');
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  // ─── TARJETA DE ESTADÍSTICA ───
  const StatCard = ({ title, value, subvalue, icon, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.statCardTouch, screenType === 'wide' && styles.statCardWide, screenType === 'desktop' && styles.statCardDesktop]}
    >
      <Surface 
        style={[
          styles.statCard, 
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
        ]} 
        elevation={1}
      >
        <View style={styles.statCardLeft}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.accent + '15' }]}>
            <MaterialCommunityIcons name={icon} size={24} color={theme.colors.accent} />
          </View>
        </View>
        <View style={styles.statCardRight}>
              <Text numberOfLines={2} style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
              <Text numberOfLines={2} style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
              <Text numberOfLines={2} style={[styles.statSubvalue, { color: theme.colors.textMuted }]}>{subvalue}</Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          screenType === 'wide' && styles.scrollContentWide,
          screenType === 'desktop' && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── SECCIÓN 1: ESTADÍSTICAS ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('dashStudents')}
          </Text>
          <View style={[styles.statsGrid, { gap: 12 }]}>
            <StatCard
              title={t('dashStudents')}
              value={String(students.length)}
              subvalue={t('dashActive')}
              icon="account-group"
              onPress={() => router.push('/(tabs)/student')}
            />
            <StatCard
              title={t('dashMap')}
              value={t('dashLive')}
              subvalue={t('dashTracking')}
              icon="map-marker-radius"
              onPress={() => router.push('/(tabs)/tracking')}
            />
            <StatCard
              title={t('dashAlerts')}
              value={String(unreadNotifications.length)}
              subvalue={t('dashNew')}
              icon="bell-alert"
              onPress={() => router.push('/(tabs)/notifications')}
            />
            <StatCard
              title={t('dashHistory')}
              value={String(trips.length)}
              subvalue={t('dashJourney')}
              icon="history"
              onPress={() => router.push('/(tabs)/history')}
            />
          </View>
        </View>

        {/* ─── SECCIÓN 2: MIS HIJOS ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('dashMyStudents')}
            </Text>
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: theme.colors.accent }]}
              onPress={() => router.push('/(tabs)/student')}
            >
              <MaterialCommunityIcons name="plus" size={18} color={theme.colors.textOnAccent} />
              <Text style={[styles.addBtnText, { color: theme.colors.textOnAccent }]}>
                {t('dashAdd')}
              </Text>
            </TouchableOpacity>
          </View>

          {students.length === 0 ? (
            <Surface 
              style={[
                styles.emptyStateCard,
                { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }
              ]}
              elevation={0}
            >
              <MaterialCommunityIcons 
                name="account-group-outline" 
                size={40} 
                color={theme.colors.textMuted}
                style={{ marginBottom: 8 }}
              />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                {t('dashNoStudents')}
              </Text>
            </Surface>
          ) : (
            <Surface 
              style={[
                styles.cardSection,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              elevation={1}
            >
              {students.map((student, index) => (
                <View key={student.id}>
                  <View style={styles.studentItem}>
                    {student.foto ? (
                      <Avatar.Image size={44} source={{ uri: student.foto }} />
                    ) : (
                      <Avatar.Text
                        size={44}
                        label={student.label || getInitials(student.nombre)}
                        backgroundColor={COLORS.PRIMARIO}
                        color={COLORS.TEXTO_CONTRASTE}
                      />
                    )}
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: theme.colors.text }]}>
                        {student.nombre}
                      </Text>
                      <Text style={[styles.studentSub, { color: theme.colors.textSecondary }]}>
                        {student.grado}
                      </Text>
                      <Text style={[styles.studentSub, { color: theme.colors.textMuted }]}>
                        {student.colegio}
                      </Text>
                    </View>
                    <View style={styles.studentActions}>
                      <TouchableOpacity
                        style={[styles.actionIcon, { backgroundColor: theme.colors.accent + '20' }]}
                        onPress={() => router.push({ 
                          pathname: '/(tabs)/tracking', 
                          params: { id: student.id, name: student.nombre } 
                        })}
                      >
                        <MaterialCommunityIcons 
                          name="map-marker" 
                          size={18} 
                          color={theme.colors.accent}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {index < students.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))}
            </Surface>
          )}
        </View>

        {/* ─── SECCIÓN 3: NOTIFICACIONES RECIENTES ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('dashRecentNotifs')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/notifications')}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                {t('dashViewAll')} →
              </Text>
            </TouchableOpacity>
          </View>

          {recentNotifications.length === 0 ? (
            <Surface
              style={[
                styles.emptyStateCard,
                { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }
              ]}
              elevation={0}
            >
              <MaterialCommunityIcons name="bell-outline" size={40} color={theme.colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                {t('dashNoRecentNotifs')}
              </Text>
            </Surface>
          ) : (
            <Surface
              style={[
                styles.cardSection,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
              ]}
              elevation={1}
            >
              {recentNotifications.map((notification, index) => (
                <View key={notification.id || notification.reciboId || `${notificationMessage(notification)}-${index}`}>
                  <View style={styles.notificationItem}>
                    <View style={[styles.notifDot, { backgroundColor: notificationColor(notification) }]} />
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifText, { color: theme.colors.text }]} numberOfLines={2}>
                        {notificationMessage(notification)}
                      </Text>
                      <Text style={[styles.notifTime, { color: theme.colors.textMuted }]}>
                        {notificationTime(notification)}
                      </Text>
                    </View>
                  </View>
                  {index < recentNotifications.length - 1 && (
                    <View style={[styles.notifDivider, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))}
            </Surface>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// ESTILOS RESPONSIVE
// ════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    maxWidth: '100%',
  },
  scrollContentWide: {
    paddingHorizontal: 48,
    paddingVertical: 24,
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },

  // ─── SECCIONES ───
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  // ─── GRID DE ESTADÍSTICAS ───
  statsGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCardTouch: {
    alignSelf: 'stretch',
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 150,
    marginBottom: 6,
  },
  statCardWide: { flexBasis: '23%', minWidth: 220 },
  statCardDesktop: { flexBasis: '48%', minWidth: 280 },
  statCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 92,
  },
  statCardLeft: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardRight: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 1,
  },
  statSubvalue: {
    fontSize: 10,
    fontWeight: '400',
  },

  // ─── BOTÓN AGREGAR ───
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ─── TARJETA DE SECCIÓN ───
  cardSection: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },

  // ─── ESTADO VACÍO ───
  emptyStateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── ESTUDIANTE ───
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
  },
  studentSub: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 1,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },

  // ─── NOTIFICACIONES ───
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    gap: 10,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  notifDivider: {
    height: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
