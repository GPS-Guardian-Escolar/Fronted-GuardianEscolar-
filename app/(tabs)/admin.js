import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminService } from '../../services/admin.service';

const EMPTY_DASHBOARD = {
  usuariosRegistrados: 0,
  estudiantesRegistrados: 0,
  trayectosActivos: 0,
  alertasRegistradas: 0,
  erroresRegistrados: 0,
};

function hasAdminRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return user?.role === 'ADMIN' || user?.rol === 'ADMINISTRADOR' || roles.includes('ADMIN');
}

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = theme.colors;
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [alerts, setAlerts] = useState([]);
  const [audit, setAudit] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAdminData = useCallback(async () => {
    setErrorMessage('');
    setRefreshing(true);
    try {
      const [dashboardData, alertsData, auditData, errorsData] = await Promise.all([
        adminService.dashboard(),
        adminService.recentAlerts(),
        adminService.recentAudit(),
        adminService.recentErrors(),
      ]);
      setDashboard(dashboardData || EMPTY_DASHBOARD);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setAudit(Array.isArray(auditData) ? auditData : []);
      setErrors(Array.isArray(errorsData) ? errorsData : []);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar la información administrativa.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (hasAdminRole(user)) {
        loadAdminData();
      } else {
        setLoading(false);
      }
    }, [loadAdminData, user])
  );

  if (!hasAdminRole(user)) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="shield-lock-outline" size={42} color={colors.textMuted} />
        <Text style={[styles.lockTitle, { color: colors.text }]}>{t('adminAccess')}</Text>
        <Text style={[styles.lockText, { color: colors.textSecondary }]}>{t('adminRoleRequired')}</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.replace('/(tabs)')}>
          <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>{t('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAdminData} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{t('adminPanel')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{user?.email || user?.correo}</Text>
          </View>
          <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} onPress={loadAdminData}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <Surface style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]} elevation={0}>
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
          </Surface>
        ) : null}

        <View style={styles.statsGrid}>
          <StatCard label="Usuarios" value={dashboard.usuariosRegistrados} icon="account-group" color={colors.primary} colors={colors} />
          <StatCard label="Estudiantes" value={dashboard.estudiantesRegistrados} icon="account-school" color={colors.accent} colors={colors} />
          <StatCard label="Trayectos activos" value={dashboard.trayectosActivos} icon="bus-clock" color={colors.warning} colors={colors} />
          <StatCard label="Alertas" value={dashboard.alertasRegistradas} icon="bell-alert" color={colors.error} colors={colors} />
          <StatCard label="Errores" value={dashboard.erroresRegistrados} icon="alert-circle" color={colors.error} colors={colors} />
        </View>

        <AdminList title={t('adminRecentAlerts')} emptyLabel={t('adminNoRecords')} icon="bell-ring-outline" items={alerts} colors={colors} renderItem={(item) => ({
          title: item.tipoEvento || 'Alerta',
          body: item.mensaje || 'Sin mensaje',
          meta: item.fechaHoraEvento || '',
        })} />

        <AdminList title={t('adminRecentAudit')} emptyLabel={t('adminNoRecords')} icon="clipboard-text-clock-outline" items={audit} colors={colors} renderItem={(item) => ({
          title: item.accion || 'Actividad',
          body: item.descripcion || item.usuarioCorreo || 'Sin descripcion',
          meta: item.creadoEn || item.ipOrigen || '',
        })} />

        <AdminList title={t('adminRecentErrors')} emptyLabel={t('adminNoRecords')} icon="bug-outline" items={errors} colors={colors} renderItem={(item) => ({
          title: item.tipoError || 'Error',
          body: item.descripcion || item.usuarioCorreo || 'Sin descripcion',
          meta: item.creadoEn || item.ipOrigen || '',
        })} />
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, color, colors }) {
  return (
    <Surface style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: color }]} elevation={1}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.textOnPrimary} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{String(value ?? 0)}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Surface>
  );
}

function AdminList({ title, emptyLabel, icon, items, colors, renderItem }) {
  return (
    <Surface style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
      <View style={styles.listHeader}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
        <Text style={[styles.listTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyLabel}</Text>
      ) : (
        items.map((item, index) => {
          const normalized = renderItem(item);
          return (
            <View key={item.id || `${title}-${index}`} style={[styles.listItem, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{normalized.title}</Text>
              <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={2}>{normalized.body}</Text>
              {normalized.meta ? <Text style={[styles.itemMeta, { color: colors.textMuted }]}>{normalized.meta}</Text> : null}
            </View>
          );
        })
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scrollContent: { padding: 16, paddingBottom: 36, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  refreshButton: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: 150, borderRadius: 8, borderWidth: 1, borderLeftWidth: 4, padding: 14 },
  statIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  listCard: { borderRadius: 8, borderWidth: 1, padding: 14, marginBottom: 14 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '800' },
  listItem: { paddingVertical: 10 },
  itemTitle: { fontSize: 13, fontWeight: '800' },
  itemBody: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  itemMeta: { fontSize: 10, marginTop: 4 },
  emptyText: { fontSize: 13, paddingVertical: 12, textAlign: 'center' },
  errorBox: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '600' },
  lockTitle: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  lockText: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  primaryButton: { marginTop: 16, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  primaryButtonText: { fontWeight: '800', fontSize: 13 },
});
