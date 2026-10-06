import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert, Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform, RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Avatar, Button, FAB, Surface, Text } from 'react-native-paper';
import CalendarDatePicker from '../../components/common/CalendarDatePicker';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { buildQrPayload, encodeQrValue } from '../../features/child-link/qrPayload';
import LinkStatusBadge from '../../features/students/components/LinkStatusBadge';
import QrSection from '../../features/students/components/QrSection';
import StudentList from '../../features/students/components/StudentList';
import { studentService } from '../../services/student.service';
import { AppTouch, AppTypography } from '../../theme/tokens';
import { addStudent, deleteStudent, getStudents, normalizeGrade, updateStudent } from '../../utils/studentStorage';

const { width } = Dimensions.get('window');
const isWeb = width > 768;
const isTablet = width > 600 && width <= 1024;
const MIN_STUDENT_AGE = 3;
const MAX_STUDENT_AGE = 21;
const EMPTY_FORM = {
  nombre: '',
  grado: '',
  fechaNacimiento: '',
  contacto_nombre: '',
  contacto_telefono: '',
  contacto_parentesco: 'Acudiente',
};

function parseValidBirthDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAgeFromDate(date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age -= 1;
  return age;
}

function formatEmergencyPhoneInput(value) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export default function StudentScreen() {
  const [students, setStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null = agregar, obj = editar
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fotoCargada, setFotoCargada] = useState(null); // guardara la URI de la imagen
  const [codigoGenerado, setCodigoGenerado] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingStudent, setSharingStudent] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [guardians, setGuardians] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const filteredStudents = students.filter(student => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return true;
    return [student.nombre, student.grado, student.colegio, student.contacto_nombre]
      .some(value => String(value || '').toLowerCase().includes(query));
  });
  const themed = {
    screen: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface, borderColor: colors.border },
    surfaceSecondary: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    input: { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
    overlay: { backgroundColor: colors.overlay },
  };

  const loadStudents = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      Alert.alert(t('error'), error.message || 'No se pudieron cargar los estudiantes.');
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  // Recarga cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [loadStudents])
  );

  function openAdd() {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setFotoCargada(null);
    setCodigoGenerado(null);
    setFormErrors({});
    setModalVisible(true);
  }

  function openEdit(student) {
    setEditingStudent(student);
    setForm({
      nombre: student.nombre,
      grado: student.grado,
      fechaNacimiento: student.fechaNacimiento || '',
      contacto_nombre: student.contacto_nombre || '',
      contacto_telefono: student.contacto_telefono || '',
      contacto_parentesco: student.contacto_parentesco || 'Acudiente',
    });
    setFotoCargada(student.foto || null);
    setCodigoGenerado(student.codigo_vinculacion || null);
    setFormErrors({});
    setModalVisible(true);
  }

  async function openShare(student) {
    setSharingStudent(student);
    setShareEmail('');
    setGuardians([]);
    setShareModalVisible(true);
    try {
      const data = await studentService.listGuardians(student.id);
      setGuardians(data);
    } catch (error) {
      Alert.alert(t('error'), error.message || t('studShareLoadError'));
    }
  }

  async function handleShareAccess() {
    const email = shareEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      Alert.alert(t('error'), t('studShareInvalidEmail'));
      return;
    }
    setShareLoading(true);
    try {
      await studentService.shareWithGuardian(sharingStudent.id, { email, relationshipRole: 'VIEWER' });
      const [guardianData, updatedStudents] = await Promise.all([
        studentService.listGuardians(sharingStudent.id),
        getStudents(),
      ]);
      setGuardians(guardianData);
      setStudents(updatedStudents);
      setShareEmail('');
      Alert.alert(t('studShareSuccessTitle'), t('studShareSuccessMessage'));
    } catch (error) {
      Alert.alert(t('error'), error.message || t('studShareError'));
    } finally {
      setShareLoading(false);
    }
  }

  function confirmDelete(student) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${t('studDeleteConfirm')} ${student.nombre}? ${t('studDeleteWarning')}`);
      if (confirmed) {
        (async () => {
          const updated = await deleteStudent(student.id);
          setStudents(updated);
        })();
      }
      return;
    }

    Alert.alert(
      t('studDelete'),
      `${t('studDeleteConfirm')} ${student.nombre}? ${t('studDeleteWarning')}`,
      [
        { text: t('cncel'), style: 'cncel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteStudent(student.id);
            setStudents(updated);
          },
        },
      ]
    );
  }

  const pickImage = async () => {
    // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('studPermDenied'), t('studPermMsg'));
        return;
      }

    // Abrir galería
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFotoCargada(result.assets[0].uri);
    }
  };

  function validateForm() {
    const errors = {};
    const name = form.nombre.trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthDate = parseValidBirthDate(form.fechaNacimiento);

    if (name.length < 2) errors.nombre = 'El nombre debe tener al menos 2 caracteres.';
    if (name.length > 100) errors.nombre = 'El nombre no puede superar 100 caracteres.';
    if (!form.grado.trim()) {
      errors.grado = 'Selecciona o escribe el grado escolar.';
    } else if (!normalizeGrade(form.grado)) {
      errors.grado = 'Usa un grado válido, por ejemplo 4, Cuarto o Décimo.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaNacimiento)) {
      errors.fechaNacimiento = 'Selecciona una fecha válida.';
    } else if (!birthDate || birthDate >= today) {
      errors.fechaNacimiento = 'La fecha de nacimiento debe ser anterior a hoy.';
    } else {
      const age = calculateAgeFromDate(birthDate);
      if (age < MIN_STUDENT_AGE || age > MAX_STUDENT_AGE) {
        errors.fechaNacimiento = `La edad debe estar entre ${MIN_STUDENT_AGE} y ${MAX_STUDENT_AGE} años.`;
      }
    }
    const contactName = form.contacto_nombre.trim();
    if (contactName.length < 2) {
      errors.contacto_nombre = 'El contacto de emergencia debe tener al menos 2 caracteres.';
    } else if (contactName.length > 100) {
      errors.contacto_nombre = 'El contacto de emergencia no puede superar 100 caracteres.';
    } else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/.test(contactName)) {
      errors.contacto_nombre = 'El contacto solo debe tener letras y espacios.';
    }
    const phoneDigits = form.contacto_telefono.replace(/\D/g, '');
    if (!/^3\d{9}$/.test(phoneDigits)) {
      errors.contacto_telefono = 'Ingresa un celular colombiano válido de 10 dígitos, inicia por 3.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function getStatusColor(status) {
    if (status === 'WARNING') return colors.error;
    if (status === 'INFO') return colors.primary;
    return colors.accent;
  }

  function getStudentQrValue(student) {
    return encodeQrValue(buildQrPayload({
      studentId: student.id,
      code: student.codigo_vinculacion,
      name: student.nombre,
      contactPhone: student.contacto_telefono,
      exp: student.codigo_expira_en,
    }));
  }

  async function handleSave() {
    if (!validateForm()) {
      Alert.alert(t('studRequiredField'), 'Revisa los campos marcados antes de guardar.');
      return;
    }
    setLoading(true);
    try {
      let updated;
      const dataToSave = { ...form, foto: fotoCargada, codigo_vinculacion: codigoGenerado };
      if (editingStudent) {
        updated = await updateStudent(editingStudent.id, dataToSave);
      } else {
        updated = await addStudent(dataToSave);
      }
      setStudents(updated);
      await loadStudents();
      setModalVisible(false);
    } catch (error) {
      Alert.alert(t('error'), error.message || 'No se pudo guardar el estudiante.');
    } finally {
      setLoading(false);
    }
  }

  function canManageStudent(student) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    return student.usuarioId === user?.id || user?.role === 'ADMIN' || roles.includes('ADMIN');
  }

  const StudentCard = ({ item }) => {
    const canManage = canManageStudent(item);
    return (
    <Surface style={[styles.childCard, themed.surface, { flex: isWeb ? 1 : undefined }]} elevation={2}>
      <View style={styles.childAvatarWrap}>
        {item.foto && item.foto.trim().length > 0 && item.foto !== 'null' && item.foto !== 'undefined' ? (
          <Avatar.Image 
            size={80} 
            source={{ uri: item.foto }} 
            style={{
              backgroundColor: getStatusColor(item.status)
            }}
          />
        ) : (
          <Avatar.Text
            size={80}
            label={item.nombre ? item.nombre.substring(0, 2).toUpperCase() : '??'}
            style={{
              backgroundColor: getStatusColor(item.status)
            }}
            color={colors.textOnPrimary}
          />
        )}
      </View>
      <Text style={[styles.childName, themed.text]}>{item.nombre}</Text>
      <Text style={[styles.childSub, themed.textSecondary]}>
        {item.edad ? `${item.edad} ${t('studYears')}` : ''} {item.grado ? `- ${item.grado}` : ''}
      </Text>
      
      <View style={styles.badgeWrap}>
        <LinkStatusBadge
          color={getStatusColor(item.status)}
          label={item.status === 'WARNING' ? t('studAlert') : item.status === 'INFO' ? t('studOnRoute') : t('studSafeZone')}
        />
      </View>

      <View style={[styles.contactBox, themed.surfaceSecondary]}>
        <Text style={[styles.contactLabel, themed.text]}>{t('studEmergencyContact')}</Text>
        <Text style={[styles.contactName, themed.textSecondary]}>{item.contacto_nombre || t('studNotAssigned')}</Text>
        <Text style={[styles.contactPhone, themed.textSecondary]}>{item.contacto_telefono || t('studNotAssigned')}</Text>
      </View>

      <View style={[styles.linkedDevicesBox, themed.surfaceSecondary]}>
        <MaterialCommunityIcons name="account-eye" size={18} color={colors.primary} />
        <Text style={[styles.linkedDevicesText, themed.text]}>
          {item.acudientes_vinculados || 1} {t('studPeopleWithAccess')}
        </Text>
      </View>

      <View style={[styles.linkedDevicesBox, themed.surfaceSecondary]}>
        <MaterialCommunityIcons name="cellphone-marker" size={18} color={colors.accent} />
        <Text style={[styles.linkedDevicesText, themed.text]}>
          {item.dispositivos_vinculados || 0} {t('studPhonesSendingLocation')}
        </Text>
      </View>

      {canManage && (
        <QrSection
          value={getStudentQrValue(item)}
          code={item.codigo_vinculacion}
          title={t('studLinkDevice')}
          hint={t('studScanQrStudentPhone')}
          colors={colors}
        />
      )}

      <Button 
        mode="contained" 
        buttonColor={
          getStatusColor(item.status)
        }
        style={styles.verMapaBtn}
        onPress={() => router.push({ pathname: '/(tabs)/tracking', params: { id: item.id, name: item.nombre } })}
      >
        {t('studViewMap')}
      </Button>

      {canManage && (
        <Button
          mode="outlined"
          style={styles.shareAccessBtn}
          textColor={colors.primary}
          onPress={() => openShare(item)}
        >
          {t('studShareAccess')}
        </Button>
      )}

      {/* Acciones flotantes */}
      {canManage && (
        <View style={styles.cardActionsFloating}>
          <TouchableOpacity style={[styles.actionBtnIcon, themed.surfaceSecondary]} onPress={() => openEdit(item)} accessibilityRole="button" accessibilityLabel={t('edit')}>
            <MaterialCommunityIcons name="pencil" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnIcon, themed.surfaceSecondary]} onPress={() => openShare(item)} accessibilityRole="button" accessibilityLabel={t('studShareAccess')}>
            <MaterialCommunityIcons name="account-plus" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnIcon, themed.surfaceSecondary]} onPress={() => confirmDelete(item)} accessibilityRole="button" accessibilityLabel={t('delete')}>
            <MaterialCommunityIcons name="trash-can" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </Surface>
    );
  };

  return (
    <View style={[styles.container, themed.screen]}>
      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account-school-outline" size={90} color={colors.border} />
          <Text style={[styles.emptyTitle, themed.text]}>{t('studEmpty')}</Text>
          <Text style={[styles.emptySub, themed.textSecondary]}>{t('studEmptySub')}</Text>
        </View>
      ) : (
        <StudentList
          data={filteredStudents}
          keyExtractor={item => item.id}
          numColumns={isWeb ? 3 : 1}
          key={isWeb ? 'grid' : 'list'}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={isWeb ? styles.columnWrapper : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadStudents} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, themed.text]}>{t('studTitle')}</Text>
              <Text style={[styles.pageSubtitle, themed.textSecondary]}>{t('studSubtitle')}</Text>
              <View style={[styles.searchBox, themed.surfaceSecondary, { borderColor: colors.border }]}>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                <TextInput value={studentQuery} onChangeText={setStudentQuery} placeholder={t('studSearch')} placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} accessibilityLabel={t('studSearch')} />
                {!!studentQuery && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setStudentQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel={t('studClearSearch')}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          renderItem={({ item }) => <StudentCard item={item} />}
        />
      )}

      {/* FAB Agregar */}
      <FAB
        icon="plus"
        style={styles.fabNew}
        color={colors.textOnAccent}
        onPress={openAdd}
      />

      {/* Modal Agregar / Editar */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, themed.overlay]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKAV}
          >
            <Surface style={[styles.modalSheetMockup, themed.surface]} elevation={5}>
              {/* Header */}
              <View style={[styles.modalHeaderMockup, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitleMockup, themed.text]}>
                  {editingStudent ? t('studEditTitle') : t('studAddTitle')}
                </Text>
              </View>

              <ScrollView style={styles.mockupScrollArea} showsVerticalScrollIndicator contentContainerStyle={styles.mockupScroll}>
                <Text style={[styles.mockupLabel, themed.textSecondary]}>Nombre completo del estudiante *</Text>
                <TextInput
                  style={[styles.mockupInput, themed.input, formErrors.nombre && styles.inputError]}
                  value={form.nombre}
                  onChangeText={v => setForm(f => ({ ...f, nombre: v }))}
                  placeholder="Nombre y apellido"
                  maxLength={100}
                  placeholderTextColor={colors.textMuted}
                />
                {!!formErrors.nombre && <Text style={styles.errorText}>{formErrors.nombre}</Text>}

                <View style={styles.mockupRow}>
                  <View style={styles.mockupHalfFieldLeft}>
                    <CalendarDatePicker
                      value={form.fechaNacimiento}
                      onChange={fechaNacimiento => {
                        setForm(f => ({ ...f, fechaNacimiento }));
                        setFormErrors(current => ({ ...current, fechaNacimiento: undefined }));
                      }}
                      label={`${t('calendarBirthDate')} *`}
                      placeholder={t('calendarSelectDate')}
                    />
                    {!!formErrors.fechaNacimiento && <Text style={styles.errorText}>{formErrors.fechaNacimiento}</Text>}
                  </View>
                  <View style={styles.mockupHalfFieldRight}>
                    <Text style={[styles.mockupLabel, themed.textSecondary]}>Grado *</Text>
                    <TextInput
                      style={[styles.mockupInput, themed.input, formErrors.grado && styles.inputError]}
                      value={form.grado}
                      onChangeText={v => setForm(f => ({ ...f, grado: v }))}
                      placeholder="Ej: Tercero"
                      maxLength={40}
                      placeholderTextColor={colors.textMuted}
                    />
                    {!!formErrors.grado && <Text style={styles.errorText}>{formErrors.grado}</Text>}
                  </View>
                </View>

                <Text style={[styles.mockupLabel, themed.textSecondary]}>Contacto de emergencia *</Text>
                <TextInput
                  style={[styles.mockupInput, themed.input, formErrors.contacto_nombre && styles.inputError]}
                  value={form.contacto_nombre}
                  onChangeText={v => setForm(f => ({ ...f, contacto_nombre: v }))}
                  placeholder="Nombre del acudiente o contacto"
                  maxLength={100}
                  placeholderTextColor={colors.textMuted}
                />
                {!!formErrors.contacto_nombre && <Text style={styles.errorText}>{formErrors.contacto_nombre}</Text>}

                <Text style={[styles.mockupLabel, themed.textSecondary]}>Teléfono de emergencia *</Text>
                <TextInput
                  style={[styles.mockupInput, themed.input, formErrors.contacto_telefono && styles.inputError]}
                  value={form.contacto_telefono}
                  onChangeText={v => setForm(f => ({ ...f, contacto_telefono: formatEmergencyPhoneInput(v) }))}
                  placeholder="3001234567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                {!!formErrors.contacto_telefono && <Text style={styles.errorText}>{formErrors.contacto_telefono}</Text>}

                <Text style={[styles.mockupLabel, themed.textSecondary]}>Subir foto del estudiante (Opcional)</Text>
                
                {fotoCargada && (
                  <View style={{ alignItems: 'center', marginBottom: 10, position: 'relative', alignSelf: 'center' }}>
                    <Avatar.Image size={80} source={{ uri: fotoCargada }} />
                    <TouchableOpacity 
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        backgroundColor: colors.error,
                        borderRadius: 24,
                        width: AppTouch.icon,
                        height: AppTouch.icon,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: colors.surface
                      }}
                      onPress={() => setFotoCargada(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto del estudiante"
                    >
                      <MaterialCommunityIcons name="close" size={16} color={colors.textOnPrimary} />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.mockupUploadBtn, { borderColor: colors.border }, fotoCargada && { borderColor: colors.accent, backgroundColor: colors.accentLight }]} 
                  onPress={pickImage}
                  accessibilityRole="button"
                  accessibilityLabel={fotoCargada ? 'Cambiar foto del estudiante' : 'Cargar foto del estudiante'}
                >
                  <Text style={[styles.mockupUploadText, themed.textSecondary, fotoCargada && { color: colors.accent, fontWeight: 'bold' }]}>
                    {fotoCargada ? 'Cambiar Foto' : 'Cargar Foto'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.mockupInfoBox, { borderColor: colors.primary }]}>
                  <Text style={[styles.mockupInfoTitle, { color: colors.primary }]}>Vincular Dispositivo del Estudiante</Text>
                  <Text style={[styles.mockupInfoDesc, themed.textSecondary]}>
                    Guarda el estudiante y usa el QR generado para vincular el celular desde la pantalla de escaneo.
                  </Text>
                  
                  {editingStudent && codigoGenerado ? (
                    <View style={[styles.codigoBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                      <QrSection
                        value={getStudentQrValue(editingStudent)}
                        code={`Código: ${codigoGenerado}`}
                        title="Vincular dispositivo"
                        hint="Escanea este QR desde el celular del estudiante."
                        size={isWeb ? 160 : 140}
                        colors={colors}
                        style={styles.codigoQrSection}
                      />
                    </View>
                  ) : (
                    <View style={[styles.codigoBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                      <Text style={[styles.codigoHint, themed.textSecondary]}>El QR se genera automáticamente después de guardar.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
              <View style={[styles.mockupActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity style={[styles.mockupCancelBtn, { borderColor: colors.border }]} onPress={() => setModalVisible(false)} accessibilityRole="button" accessibilityLabel="Cancelar edición de estudiante">
                  <Text style={[styles.mockupCancelText, themed.text]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mockupSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading} accessibilityRole="button" accessibilityLabel="Guardar estudiante">
                  <Text style={styles.mockupSaveText}>{loading ? t('loading') : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={shareModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={[styles.modalOverlay, themed.overlay]}>
          <Surface style={[styles.shareModal, themed.surface]} elevation={5}>
            <View style={[styles.modalHeaderMockup, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitleMockup, themed.text]}>{t('studShareTracking')}</Text>
            </View>
            <Text style={[styles.shareSubtitle, themed.textSecondary]}>
              {sharingStudent?.nombre}
            </Text>
            <Text style={[styles.mockupLabel, themed.textSecondary]}>{t('studShareEmailLabel')}</Text>
            <TextInput
              style={[styles.mockupInput, themed.input]}
              value={shareEmail}
              onChangeText={setShareEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              mode="contained"
              buttonColor={colors.primary}
              textColor={colors.textOnPrimary}
              loading={shareLoading}
              disabled={shareLoading}
              onPress={handleShareAccess}
              style={styles.shareButton}
            >
              {t('studShareButton')}
            </Button>

            <Text style={[styles.guardianTitle, themed.text]}>{t('studPeopleWhoCanTrack')}</Text>
            <ScrollView style={styles.guardianList}>
              {guardians.map(item => (
                <View key={item.id || item.usuarioId} style={[styles.guardianRow, themed.surfaceSecondary]}>
                  <MaterialCommunityIcons name={item.relationshipRole === 'OWNER' ? 'account-star' : 'account-eye'} size={18} color={colors.primary} />
                  <View style={styles.guardianInfo}>
                    <Text style={[styles.guardianName, themed.text]}>{item.fullName || item.nombreCompleto}</Text>
                    <Text style={[styles.guardianEmail, themed.textSecondary]}>{item.email || item.correo}</Text>
                  </View>
                  <Text style={[styles.guardianRole, { color: colors.primary }]}>{item.relationshipRole}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.mockupCancelBtn, { borderColor: colors.border, marginTop: 14 }]} onPress={() => setShareModalVisible(false)} accessibilityRole="button" accessibilityLabel={t('close')}>
              <Text style={[styles.mockupCancelText, themed.text]}>{t('close')}</Text>
            </TouchableOpacity>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    backgroundColor: COLORS.FONDO_PRINCIPAL,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  listWeb: { 
    maxWidth: 800, 
    alignSelf: 'center', 
    width: '100%', 
    paddingTop: 20 
  },
  listContainer: {
    padding: 24,
    paddingBottom: 100,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  columnWrapper: {
    gap: 20,
    justifyContent: 'flex-start',
  },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginTop: 14, minHeight: AppTouch.min },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, paddingVertical: 8 },
  clearSearchButton: {
    alignItems: 'center',
    height: AppTouch.icon,
    justifyContent: 'center',
    width: AppTouch.icon,
  },
  noResultsText: { textAlign: 'center', marginTop: 18, fontSize: 13 },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  /* ── Nueva Tarjeta Mis Hijos ── */
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    maxWidth: 350,
    shadowColor: COLORS.NEGRO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  childAvatarWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  childSub: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 2,
  },
  badgeWrap: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  badgeActive: {
    backgroundColor: COLORS.ACENTO,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  contactBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  contactLabel: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 12,
    color: '#6B7280',
  },
  contactPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  linkedDevicesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  linkedDevicesText: {
    fontSize: 12,
    fontWeight: '700',
  },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  qrTextCol: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  qrCodeText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  qrHint: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    marginTop: 4,
  },
  verMapaBtn: {
    borderRadius: 8,
    minHeight: AppTouch.min,
    justifyContent: 'center',
  },
  shareAccessBtn: {
    borderRadius: 8,
    minHeight: AppTouch.min,
    justifyContent: 'center',
    marginTop: 10,
  },
  cardActionsFloating: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionBtnIcon: {
    width: AppTouch.icon,
    height: AppTouch.icon,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.GRIS_BORDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── Estado vacío ── */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.NEGRO,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  /* ── FAB ── */
  fabNew: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#84CC16',
    borderRadius: 30,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isWeb ? 24 : 10,
    paddingVertical: 18,
  },
  modalKAV: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalSheet: {
    backgroundColor: COLORS.FONDO_TARJETA,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxWidth: isWeb ? 600 : undefined,
    alignSelf: isWeb ? 'center' : undefined,
    width: isWeb ? '100%' : undefined,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.NEGRO,
  },
  /* ── Campos ── */
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXTO_SECUNDARIO,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.FONDO_PRINCIPAL,
    borderWidth: 1.5,
    borderColor: COLORS.GRIS_BORDE,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.NEGRO,
  },
  /* ── Preview Avatar ── */
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.FONDO_PRINCIPAL,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.GRIS_BORDE,
  },
  previewName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.PRIMARIO,
  },
  /* ── Botón Guardar Viejo ── */
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.PRIMARIO,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveBtnText: {
    color: COLORS.BLANCO,
    fontSize: 15,
    fontWeight: 'bold',
  },
  
  /* ── Estilos del Mockup ── */
  modalSheetMockup: {
    backgroundColor: COLORS.BLANCO,
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 0,
    maxWidth: 760,
    alignSelf: 'center',
    width: isWeb ? (isTablet ? '86%' : '78%') : '94%',
    maxHeight: isWeb ? '78%' : '84%',
    overflow: 'hidden',
  },
  shareModal: {
    backgroundColor: COLORS.BLANCO,
    borderRadius: 10,
    padding: 20,
    width: isWeb ? 520 : '92%',
    maxHeight: '86%',
    borderWidth: 1,
  },
  shareSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 16,
  },
  shareButton: {
    borderRadius: 8,
    marginBottom: 18,
  },
  guardianTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  guardianList: {
    maxHeight: 240,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontSize: 13,
    fontWeight: '700',
  },
  guardianEmail: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    marginTop: 2,
  },
  guardianRole: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    fontWeight: '800',
  },
  modalHeaderMockup: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 0,
  },
  modalTitleMockup: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  mockupScrollArea: {
    flex: 1,
  },
  mockupScroll: {
    paddingHorizontal: isWeb ? 20 : 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  mockupLabel: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
  },
  mockupInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    minHeight: AppTouch.min,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#FFF',
    fontSize: 13,
  },
  inputError: {
    borderColor: COLORS.ALERTA,
  },
  errorText: {
    color: COLORS.ALERTA,
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    marginTop: -7,
    marginBottom: 8,
  },
  mockupRow: {
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'space-between',
  },
  mockupHalfFieldLeft: {
    flex: 1,
    marginRight: isWeb ? 10 : 0,
  },
  mockupHalfFieldRight: {
    flex: 1,
    marginLeft: isWeb ? 10 : 0,
  },
  mockupUploadBtn: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 6,
    minHeight: AppTouch.min,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  mockupUploadText: {
    fontSize: 13,
    color: '#374151',
  },
  mockupInfoBox: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    minHeight: 120,
  },
  mockupInfoTitle: {
    fontSize: 13,
    color: '#2563EB',
    marginBottom: 8,
  },
  mockupInfoDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 18,
  },
  mockupGenerateBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 6,
    minHeight: AppTouch.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupGenerateText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  codigoBox: {
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    width: '100%',
    gap: 6,
  },
  codigoQrSection: {
    marginBottom: 0,
    width: '100%',
  },
  codigoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4338CA',
    letterSpacing: 2,
    textAlign: 'center',
  },
  codigoHint: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    color: '#6366F1',
    marginTop: 2,
    textAlign: 'center',
  },
  qrUrlHint: {
    fontSize: AppTypography.xs.fontSize,
    lineHeight: AppTypography.xs.lineHeight,
    maxWidth: '100%',
  },
  mockupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: isWeb ? 20 : 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  mockupCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 6,
    minHeight: AppTouch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupCancelText: {
    color: '#111827',
    fontSize: 13,
  },
  mockupSaveBtn: {
    flex: 1,
    borderRadius: 6,
    minHeight: AppTouch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupSaveText: {
    color: '#FFF',
    fontSize: 13,
  },
});
