import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Checkbox, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { authService } from '../../services/auth.service';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isValidEmail, normalizePhoneDigits, passwordChecks } from '../../utils/validators';

const isWeb = Dimensions.get('window').width > 768;

const TERMS_VERSION = '2026-08-20';
const TERMS_SECTIONS = [
  {
    title: '1. Objeto del servicio',
    body: 'Guardian Escolar es una herramienta académica para apoyar el seguimiento de estudiantes, la administración de acudientes, rutas, zonas seguras, alertas y datos de contacto de emergencia. El servicio no reemplaza la supervisión responsable de padres, acudientes o instituciones educativas.',
  },
  {
    title: '2. Uso de ubicación',
    body: 'Al usar funciones de rastreo, el acudiente autoriza el tratamiento de datos de ubicación del dispositivo vinculado al estudiante. Estos datos se usan para mostrar recorridos, detectar salidas de zonas seguras, posibles desvíos de ruta e inactividad durante trayectos.',
  },
  {
    title: '3. Responsabilidad del acudiente',
    body: 'El usuario debe registrar información real, mantener segura su cuenta, verificar que el dispositivo del estudiante tenga permisos de ubicación activos y compartir acceso solo con personas autorizadas para consultar o acompañar al estudiante.',
  },
  {
    title: '4. Privacidad y datos personales',
    body: 'Se tratan datos como nombre, correo, teléfono, información del estudiante, contactos de emergencia, configuración de notificaciones, rutas, zonas seguras y ubicaciones reportadas. La información se usa para operar el sistema y no debe compartirse con terceros no autorizados.',
  },
  {
    title: '5. Notificaciones',
    body: 'El sistema puede enviar correos, alertas push o SMS cuando estas opciones estén habilitadas. La entrega puede depender de servicios externos, conexión a internet, permisos del dispositivo y disponibilidad del proveedor.',
  },
  {
    title: '6. Seguridad de la cuenta',
    body: 'El usuario es responsable de proteger su contraseña y cerrar sesión en dispositivos compartidos. Guardian Escolar puede bloquear acciones o solicitar verificación de correo para reducir accesos no autorizados.',
  },
  {
    title: '7. Limitaciones',
    body: 'La precisión de la ubicación puede variar por GPS, red móvil, Wi-Fi, batería, permisos del sistema operativo o condiciones del entorno. Las alertas son apoyo preventivo y pueden tener retrasos.',
  },
  {
    title: '8. Aceptación',
    body: `Al crear la cuenta, el usuario declara que leyó y acepta estos Términos y Condiciones y la Política de Privacidad de Guardian Escolar. Versión ${TERMS_VERSION}.`,
  },
];

// CheckItem sin gap, sin whitespace entre nodos
const CheckItem = ({ ok, label, colors }) => (
  <View style={styles.checkRow}>
    <MaterialCommunityIcons name={ok ? 'check-circle' : 'circle-outline'} size={14} color={ok ? colors.success : colors.textMuted} style={{ marginRight: 6 }} />
    <Text style={[styles.checkLabel, { color: ok ? colors.success : colors.textSecondary }]}>{label}</Text>
  </View>
);

const FieldSvgIcon = ({ type, color, size = 22 }) => {
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {type === 'name' ? (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4.5 20c1.5-4 4-6 7.5-6s6 2 7.5 6" {...common} />
        </>
      ) : null}
      {type === 'phone' ? (
        <Path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h4M9 6h6" {...common} />
      ) : null}
      {type === 'email' ? (
        <>
          <Rect x="3" y="5" width="18" height="14" rx="2" {...common} />
          <Path d="m4 7 8 6 8-6" {...common} />
        </>
      ) : null}
      {type === 'lock' ? (
        <>
          <Rect x="5" y="10" width="14" height="10" rx="2" {...common} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" {...common} />
        </>
      ) : null}
      {type === 'lockCheck' ? (
        <>
          <Rect x="4" y="10" width="16" height="10" rx="2" {...common} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3M9 15l2 2 4-5" {...common} />
        </>
      ) : null}
    </Svg>
  );
};

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+57 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [showPassReqs, setShowPassReqs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reqs = passwordChecks(password, confirmPassword);
  const allReqsMet = Object.values(reqs).every(Boolean);
  const phoneDigits = normalizePhoneDigits(phone);
  const isValidPhone = phoneDigits.length >= 10 && phoneDigits.length <= 15;

  // Booleans explícitos para evitar string vacío en render
  const showEmailError = email.length > 0 && !isValidEmail(email);
  const showPassBox = showPassReqs || password.length > 0;
  const showMatchStatus = confirmPassword.length > 0;

  const handleRegister = async () => {
    setErrorMsg('');

    if (name.trim().length < 2 || name.trim().length > 100) { setErrorMsg('El nombre debe tener entre 2 y 100 caracteres.'); return; }
    if (!isValidPhone) { setErrorMsg('Ingresa un teléfono válido, solo números.'); return; }
    if (!isValidEmail(email)) { setErrorMsg('Ingresa un correo real con dominio válido (ej: usuario@gmail.com).'); return; }
    if (!allReqsMet) { setErrorMsg(t('authPasswordRulesFailed')); return; }
    if (!acceptTerms) { setTermsModalVisible(true); return; }

    setIsSubmitting(true);
    try {
      await authService.register({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), acceptedTerms: true, termsVersion: TERMS_VERSION });
      Alert.alert(t('success'), 'Cuenta creada. Ya puedes iniciar sesión.');
      router.replace('/(auth)/login');
    } catch (error) {
      setErrorMsg(error.message || 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.cardWrapper}>
            <Image source={require('../../assets/images/logo.png')} style={styles.headerLogo} contentFit="contain" />
            <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('appName')}</Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('authRegister')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{t('authEnterEmail')}</Text>

              {/* Nombre */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('authGuardianName')}</Text>
                <TextInput
                  mode="outlined" value={name} onChangeText={setName}
                  outlineColor={colors.border} activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]} textColor={colors.text} theme={{ roundness: 6 }}
                  placeholderTextColor={colors.textMuted}
                  left={<TextInput.Icon icon={({ size, color }) => <FieldSvgIcon type="name" size={size} color={color} />} color={colors.textSecondary} />}
                />
              </View>

              {/* Teléfono */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('profilePhone')}</Text>
                <TextInput
                  mode="outlined" value={phone}
                  onChangeText={(v) => {
                    const digits = normalizePhoneDigits(v, 13);
                    const withoutCountry = digits.startsWith('57') ? digits.slice(2) : digits;
                    setPhone(`+57 ${withoutCountry}`);
                  }}
                  keyboardType="phone-pad"
                  outlineColor={phone.length > 4 && !isValidPhone ? colors.error : colors.border} activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]} textColor={colors.text} theme={{ roundness: 6 }}
                  left={<TextInput.Icon icon={({ size, color }) => <FieldSvgIcon type="phone" size={size} color={color} />} color={colors.textSecondary} />}
                  placeholder="+57 300 123 4567"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Correo */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('authEmail')}</Text>
                <TextInput
                  mode="outlined" value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  outlineColor={showEmailError ? colors.error : colors.border}
                  activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]} textColor={colors.text} theme={{ roundness: 6 }}
                  placeholderTextColor={colors.textMuted}
                  left={<TextInput.Icon icon={({ size, color }) => <FieldSvgIcon type="email" size={size} color={color} />} color={colors.textSecondary} />}
                  right={
                    email.length > 0
                      ? <TextInput.Icon icon={isValidEmail(email) ? 'check-circle' : 'alert-circle'} color={isValidEmail(email) ? colors.success : colors.error} />
                      : null
                  }
                />
                {showEmailError ? (
                  <Text style={[styles.errorHint, { color: colors.error }]}>Correo inválido o dominio no permitido. Ej: usuario@gmail.com</Text>
                ) : null}
              </View>

              {/* Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('authPassword')}</Text>
                <TextInput
                  mode="outlined" value={password} onChangeText={setPassword}
                  onFocus={() => setShowPassReqs(true)}
                  secureTextEntry={secureText}
                  outlineColor={password.length > 0 && !allReqsMet ? colors.error : colors.border}
                  activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]} textColor={colors.text} theme={{ roundness: 6 }}
                  placeholderTextColor={colors.textMuted}
                  left={<TextInput.Icon icon={({ size, color }) => <FieldSvgIcon type="lock" size={size} color={color} />} color={colors.textSecondary} />}
                  right={<TextInput.Icon icon={secureText ? 'eye' : 'eye-off'} onPress={() => setSecureText(!secureText)} color={colors.primary} />}
                />
                {showPassBox ? (
                  <View style={[styles.reqsBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.reqsTitle, { color: colors.primary }]}>{t('securityRequirements')}</Text>
                    <CheckItem ok={reqs.minLen} label={t('securityMinLength')} colors={colors} />
                    <CheckItem ok={reqs.upper} label={t('securityUpper')} colors={colors} />
                    <CheckItem ok={reqs.lower} label={t('securityLower')} colors={colors} />
                    <CheckItem ok={reqs.number} label={t('securityNumber')} colors={colors} />
                    <CheckItem ok={reqs.special} label={t('securitySpecial')} colors={colors} />
                  </View>
                ) : null}
              </View>

              {/* Confirmar contraseña */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.text }]}>{t('authConfirmPass')}</Text>
                <TextInput
                  mode="outlined" value={confirmPassword} onChangeText={setConfirmPassword}
                  secureTextEntry={secureConfirm}
                  outlineColor={confirmPassword.length > 0 && !reqs.match ? colors.error : colors.border}
                  activeOutlineColor={colors.primary}
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary }]} textColor={colors.text} theme={{ roundness: 6 }}
                  placeholderTextColor={colors.textMuted}
                  left={<TextInput.Icon icon={({ size, color }) => <FieldSvgIcon type="lockCheck" size={size} color={color} />} color={colors.textSecondary} />}
                  right={<TextInput.Icon icon={secureConfirm ? 'eye' : 'eye-off'} onPress={() => setSecureConfirm(!secureConfirm)} color={colors.primary} />}
                />
                {showMatchStatus ? (
                  <View style={styles.checkRow}>
                    <MaterialCommunityIcons name={reqs.match ? 'check-circle' : 'close-circle'} size={14} color={reqs.match ? colors.success : colors.error} style={{ marginRight: 6 }} />
                    <Text style={[styles.checkLabel, { color: reqs.match ? colors.success : colors.error }]}>{reqs.match ? t('securityMatch') : t('securityNoMatch')}</Text>
                  </View>
                ) : null}
              </View>

              {/* Términos */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => {
                  if (acceptTerms) {
                    setAcceptTerms(false);
                  } else {
                    setTermsModalVisible(true);
                  }
                  setErrorMsg('');
                }}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptTerms }}
                accessibilityLabel="Aceptar Términos y Condiciones y Política de Privacidad"
              >
                <View style={styles.checkboxWrapper}>
                  <Checkbox
                    status={acceptTerms ? 'checked' : 'unchecked'}
                    color={colors.primary}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptTerms }}
                  />
                </View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  Acepto los Términos y Condiciones y la Política de Privacidad de Guardian Escolar
                </Text>
              </TouchableOpacity>

              {/* Mensaje de Error Visible */}
              {errorMsg.length > 0 ? (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                  <Text style={[styles.errorBoxText, { color: colors.error }]}>{errorMsg}</Text>
                </View>
              ) : null}

              <Button mode="contained" onPress={handleRegister} loading={isSubmitting} disabled={isSubmitting} style={styles.registerButton} contentStyle={styles.buttonContent} buttonColor={colors.primary} textColor={colors.textOnPrimary}>
                {t('authRegisterBtn')}
              </Button>

              <View style={styles.footerLinks}>
                <Text style={[styles.hasAccountText, { color: colors.text }]}>{t('authHaveAccount')} </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={[styles.loginLink, { color: colors.primary }]}>{t('authLoginBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={termsModalVisible} transparent animationType="fade" onRequestClose={() => { setTermsModalVisible(false); setAcceptTerms(false); }}>
        <View style={[styles.termsOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.termsModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.termsHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.termsTitle, { color: colors.text }]}>Términos y Condiciones</Text>
              <TouchableOpacity
                style={styles.termsClose}
                onPress={() => {
                  setTermsModalVisible(false);
                  setAcceptTerms(false);
                }}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[styles.termsContent, { borderColor: colors.border }]}
              onScroll={({ nativeEvent }) => {
                const reachedEnd = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 12;
                if (reachedEnd) setTermsRead(true);
              }}
              scrollEventThrottle={16}
            >
              <Text style={[styles.termsIntro, { color: colors.textSecondary }]}>
                Lee el documento completo antes de aceptar. Esta aceptación quedará asociada a tu cuenta.
              </Text>
              {TERMS_SECTIONS.map(section => (
                <View key={section.title} style={styles.termsSection}>
                  <Text style={[styles.termsSectionTitle, { color: colors.text }]}>{section.title}</Text>
                  <Text style={[styles.termsBody, { color: colors.textSecondary }]}>{section.body}</Text>
                </View>
              ))}
            </ScrollView>
            <Button
              mode="contained"
              disabled={!termsRead}
              buttonColor={termsRead ? colors.primary : colors.border}
              textColor={termsRead ? colors.textOnPrimary : colors.textSecondary}
              onPress={() => {
                setAcceptTerms(true);
                setTermsModalVisible(false);
              }}
              style={styles.termsAccept}
            >
              Aceptar términos
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  cardWrapper: { width: '100%', alignItems: 'center', padding: 20, alignSelf: 'center' },
  headerLogo: { width: 120, height: 120, marginBottom: 6 },
  headerTitle: { fontSize: isWeb ? 32 : 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  card: {
    width: '100%', maxWidth: 430,
    padding: 18, borderRadius: 12, elevation: 3,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    borderWidth: 1,
  },
  cardTitle: { fontSize: isWeb ? 24 : 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  input: { height: 44 },
  errorHint: { fontSize: 11, marginTop: 4, marginLeft: 4 },
  reqsBox: { borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1 },
  reqsTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  checkLabel: { fontSize: 12 },
  checkLabelOk: { fontSize: 12 },
  checkLabelErr: { fontSize: 12 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginLeft: -8, paddingRight: 10 },
  checkboxWrapper: { marginRight: 2 },
  termsText: { flex: 1, fontSize: 12, lineHeight: 16 },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1 },
  errorBoxText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  registerButton: { borderRadius: 8, marginBottom: 12 },
  buttonContent: { height: 44 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  hasAccountText: { fontSize: 12 },
  loginLink: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  termsOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  termsModal: { width: '100%', maxWidth: 520, maxHeight: '86%', borderRadius: 12, borderWidth: 1, padding: 16 },
  termsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 10, marginBottom: 12 },
  termsTitle: { fontSize: 18, fontWeight: '700' },
  termsClose: { padding: 6 },
  termsContent: { borderWidth: 1, borderRadius: 8, padding: 12, maxHeight: 360 },
  termsIntro: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  termsSection: { marginBottom: 12 },
  termsSectionTitle: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 4 },
  termsBody: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  termsAccept: { borderRadius: 8, marginTop: 14 },
});
