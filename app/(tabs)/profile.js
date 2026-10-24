import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Avatar, Button, Divider, IconButton, Surface, Switch, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/auth.service';
import { notificationService } from '../../services/notification.service';
import { SUPPORTED_LANGUAGES } from '../../translations';
import { isValidEmail, isValidPersonName, isValidPhone, normalizeColombianPhoneInput, normalizePhoneDigits, passwordChecks, sanitizePersonNameInput } from '../../utils/validators';

function showProfileAlert(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert([title, message].filter(Boolean).join('\n\n'));
  } else {
    Alert.alert(title, message);
  }
}

function localizedProfileError(error, t, fallbackKey) {
  const message = String(error?.message || '').toLowerCase();
  if (/401|unauthorized|jwt|token/.test(message)) return t('profileSessionExpired');
  if (/servicio de correo|email delivery|mail provider|no se pudo enviar el correo/.test(message)) return t('authRecoveryUnavailable');
  if (/current password|contrase.*a actual/.test(message)) return t('profilePasswordIncorrect');
  if (/already registered|already exists|ya existe una cuenta/.test(message)) return t('profileEmailAlreadyUsed');
  if (/code.*(invalid|expired)|c.digo.*(incorrecto|expirado)/.test(message)) return t('twoFAInvalidCode');
  return t(fallbackKey);
}
function ProfileField({ colors, label, value, onChangeText, editable = true, keyboardType = 'default', secureTextEntry = false }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hidden = secureTextEntry && !passwordVisible;

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const styleId = 'guardian-profile-autofill-theme';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus {
        -webkit-text-fill-color: ${colors.text};
        -webkit-box-shadow: 0 0 0 1000px ${colors.surfaceSecondary} inset;
        caret-color: ${colors.text};
        transition: background-color 9999s ease-in-out 0s;
      }
    `;
  }, [colors]);

  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={keyboardType === "phone-pad" ? 10 : undefined}
        left={keyboardType === "phone-pad" ? <TextInput.Affix text="+57" /> : undefined}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={secureTextEntry ? 'off' : undefined}
        textContentType="none"
        dense
        style={[styles.input, { backgroundColor: editable ? colors.surfaceSecondary : colors.background }]}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={editable ? colors.text : colors.textSecondary}
        right={secureTextEntry ? (
          <TextInput.Icon
            icon={passwordVisible ? 'eye-off' : 'eye'}
            onPress={() => setPasswordVisible(current => !current)}
            forceTextInputFocus={false}
          />
        ) : undefined}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUserInSession } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, lang, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const colors = theme.colors;
  const isWide = width >= 769;
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const currentLanguage = SUPPORTED_LANGUAGES.find(item => item.code === lang) || SUPPORTED_LANGUAGES[0];
  const accountRole = (user?.roles || [user?.role || 'PARENT']).map(role => String(role).toUpperCase());
  const accountRoleLabel = accountRole.some(role => ['ADMIN', 'ADMINISTRADOR'].includes(role))
    ? t('profileAdmin')
    : accountRole.some(role => ['STUDENT', 'ESTUDIANTE'].includes(role))
      ? t('profileStudent')
      : t('profileParentGuardian');

  const [notifBateria, setNotifBateria] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [smsDisponible, setSmsDisponible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [twoFAModalVisible, setTwoFAModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFAEnabled === true);
  const [twoFAMethod, setTwoFAMethod] = useState(user?.twoFAMethod || 'EMAIL');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAPassword, setTwoFAPassword] = useState('');
  const [twoFASubmitting, setTwoFASubmitting] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: (() => { const digits = normalizePhoneDigits(user?.phone, 12); return digits.startsWith('57') && digits.length === 12 ? digits.slice(2) : digits; })(),
  });
  const [emailForm, setEmailForm] = useState({ currentPassword: '', nextEmail: form.email });
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });

  const passReqs = passwordChecks(passForm.next, passForm.confirm);
  const allPassReqsMet = Object.values(passReqs).every(Boolean);

  const applyNotificationPreferences = useCallback((config) => {
    setNotifBateria(config.alertaInactividad ?? true);
    setNotifEmail(config.canalEmail ?? true);
    setNotifSMS(config.canalSms ?? false);
    setSmsDisponible(config.smsDisponible ?? false);
  }, []);

  useEffect(() => {
    notificationService.getPreferences()
      .then(applyNotificationPreferences)
      .catch(() => {});
  }, [applyNotificationPreferences]);

  useEffect(() => {
    setTwoFAEnabled(user?.twoFAEnabled === true);
    setTwoFAMethod(user?.twoFAMethod || 'EMAIL');
  }, [user?.twoFAEnabled, user?.twoFAMethod]);

  const updateNotificationPreferences = async (changes) => {
    const previous = {
      alertaInactividad: notifBateria,
      canalEmail: notifEmail,
      canalSms: notifSMS,
    };
    const next = { ...previous, ...changes };
    setNotifBateria(next.alertaInactividad);
    setNotifEmail(next.canalEmail);
    setNotifSMS(next.canalSms);
    try {
      const saved = await notificationService.updatePreferences(next);
      applyNotificationPreferences(saved);
      if (changes.canalSms && !saved.smsDisponible) {
        showProfileAlert(t('profileNotifications'), t('profileSmsSavedNoProvider'));
      }
    } catch (error) {
      setNotifBateria(previous.alertaInactividad);
      setNotifEmail(previous.canalEmail);
      setNotifSMS(previous.canalSms);
      showProfileAlert(t('error'), localizedProfileError(error, t, 'someError'));
    }
  };

  const handleSaveProfile = async () => {
    if (!isValidPersonName(form.name, { min: 2, max: 60 }) || !isValidPhone(form.phone)) {
      showProfileAlert(t('error'), t('invalidInput'));
      return;
    }
    try {
      const phone = normalizePhoneDigits(form.phone, 10);
      await authService.updateProfile(user.email, form.name.trim(), phone);
      await updateUserInSession({ name: form.name.trim(), phone });
      setIsEditing(false);
      showProfileAlert(t('profileTitle'), t('profileUpdated'));
    } catch (error) {
      showProfileAlert(t('error'), localizedProfileError(error, t, 'profileUpdateFailed'));
    }
  };

  const handleChangeEmail = async () => {
    setEmailError('');
    if (!isValidEmail(emailForm.nextEmail)) {
      showProfileAlert(t('error'), t('authInvalidEmail'));
      return;
    }
    if (!emailForm.currentPassword) {
      showProfileAlert(t('error'), t('profilePasswordCurrentRequired'));
      return;
    }
    try {
      const updated = await authService.updateEmail(user.email, emailForm.currentPassword, emailForm.nextEmail);
      const nextEmail = updated.email;
      setForm(current => ({ ...current, email: nextEmail }));
      await updateUserInSession({ email: nextEmail });
      setEmailModalVisible(false);
      setEmailForm({ currentPassword: '', nextEmail });
      showProfileAlert(t('success'), t('profileEmailVerificationSent'));
    } catch (error) {
      setEmailError(localizedProfileError(error, t, 'profileUpdateFailed'));
    }
  };

  const handleChangePassword = async () => {
    if (!passForm.current) {
      showProfileAlert(t('error'), t('profilePasswordCurrentRequired'));
      return;
    }
    if (!allPassReqsMet) {
      showProfileAlert(t('profileSecurity'), t('profilePasswordRulesFailed'));
      return;
    }
    if (passForm.next === passForm.current) {
      showProfileAlert(t('error'), t('profilePasswordMustDiffer'));
      return;
    }
    try {
      await authService.updatePassword(form.email, passForm.current, passForm.next);
      setPassModalVisible(false);
      setPassForm({ current: '', next: '', confirm: '' });
      showProfileAlert(t('success'), t('profilePasswordUpdated'));
    } catch (error) {
      showProfileAlert(t('error'), localizedProfileError(error, t, 'profilePasswordUpdateFailed'));
    }
  };

  const handleRequest2FA = async (method) => {
    try {
      setTwoFASubmitting(true);
      setTwoFACode('');
      const challenge = await authService.request2FACode(method);
      setTwoFAMethod(method);
      showProfileAlert(t('twoFACodeSent'), `${t('twoFACodeSentTo')} ${method === 'SMS' ? t('twoFASMS') : t('twoFAEmail')}.`);
      setTwoFAToken(challenge.twoFAToken || '');
    } catch (error) {
      const message = method === 'EMAIL' && /email delivery|mail|email/i.test(error.message || '')
        ? t('twoFAEmailUnavailable')
        : localizedProfileError(error, t, 'twoFAActivateFailed');
      showProfileAlert(t('error'), message);
    } finally {
      setTwoFASubmitting(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!/^\d{6}$/.test(twoFACode)) {
      showProfileAlert(t('error'), t('twoFAInvalidCode'));
      return;
    }
    try {
      setTwoFASubmitting(true);
      if (!twoFAToken) {
        throw new Error('Primero solicita un código de verificación.');
      }
      const session = await authService.verify2FA(twoFAToken, twoFACode, twoFAMethod);
      await updateUserInSession({
        twoFAEnabled: true,
        twoFAMethod,
        ...session.user,
      });
      setTwoFAEnabled(true);
      setTwoFACode('');
      setTwoFAPassword('');
      setTwoFAToken('');
      setTwoFAModalVisible(false);
      showProfileAlert(t('twoFAActivationTitle'), t('twoFAActivated'));
    } catch (error) {
      showProfileAlert(t('error'), localizedProfileError(error, t, 'twoFAActivateFailed'));
    } finally {
      setTwoFASubmitting(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFAPassword) {
      showProfileAlert(t('error'), t('profilePasswordCurrentRequired'));
      return;
    }
    try {
      setTwoFASubmitting(true);
      const updated = await authService.disable2FA(twoFAPassword);
      await updateUserInSession(updated);
      setTwoFAEnabled(false);
      setTwoFAMethod('EMAIL');
      setTwoFAPassword('');
      setTwoFAModalVisible(false);
    } catch (error) {
      showProfileAlert(t('error'), localizedProfileError(error, t, 'twoFADeactivateFailed'));
    } finally {
      setTwoFASubmitting(false);
    }
  };

  const SettingItem = ({ label, subtitle, value, onValueChange, disabled }) => (
    <View style={[styles.settingItem, disabled && { opacity: 0.7 }]}>
      <View style={styles.settingTextCol}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {!!subtitle && <Text style={[styles.settingSub, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <Switch value={!!value} onValueChange={disabled ? undefined : onValueChange} color={disabled ? colors.textSecondary : colors.accent} disabled={!!disabled} />
    </View>
  );



  const Requirement = ({ ok, label }) => (
    <View style={styles.checkRow}>
      <MaterialCommunityIcons name={ok ? 'check-circle' : 'circle-outline'} size={13} color={ok ? colors.accent : colors.textSecondary} />
      <Text style={[styles.checkLabel, { color: ok ? colors.accent : colors.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWeb, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('tabProfile')}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('profileTitle')}</Text>
          </View>
        </View>

        <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('profileTitle')}</Text>
            <Button mode={isEditing ? 'contained' : 'outlined'} compact onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)} buttonColor={isEditing ? colors.primary : undefined} textColor={isEditing ? colors.textOnPrimary : colors.primary}>
              {isEditing ? t('profileSave') : t('profileEdit')}
            </Button>
          </View>
          <View style={[styles.profileRow, !isWide && styles.profileRowMobile]}>
            <Avatar.Text size={60} label={form.name.substring(0, 2).toUpperCase()} style={{ backgroundColor: colors.primary }} color={colors.textOnPrimary} />
            <View style={styles.profileInputs}>
              <ProfileField colors={colors} label={t('profileName')} value={form.name} editable={isEditing} onChangeText={name => setForm(current => ({ ...current, name: sanitizePersonNameInput(name) }))} />
              <ProfileField colors={colors} label={t('profilePhone')} value={form.phone} editable={isEditing} keyboardType="phone-pad" onChangeText={phone => setForm(current => ({ ...current, phone: normalizeColombianPhoneInput(phone) }))} />
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('profileEmail')}</Text>
                <View style={styles.emailRow}>
                  <TextInput mode="outlined" value={form.email} editable={false} dense style={[styles.input, styles.emailInput, { backgroundColor: colors.background }]} outlineColor={colors.border} textColor={colors.textSecondary} />
                  <IconButton icon="pencil-lock-outline" iconColor={colors.primary} onPress={() => { setEmailForm({ currentPassword: '', nextEmail: form.email }); setEmailError(''); setEmailModalVisible(true); }} />
                </View>
              </View>
              {isEditing && (
                <Button mode="text" textColor={colors.textSecondary} onPress={() => { const digits = normalizePhoneDigits(user?.phone, 12); setIsEditing(false); setForm({ name: user?.name || form.name, email: user?.email || form.email, phone: digits.startsWith('57') && digits.length === 12 ? digits.slice(2) : digits }); }}>
                  {t('profileCancel')}
                </Button>
              )}
            </View>
          </View>
        </Surface>

        <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('profileNotifications')}</Text>
          <Text style={[styles.cardSubtitleInfo, { color: colors.textSecondary }]}>{t('profileNotificationsHelp')}</Text>
          <SettingItem label={t('profileArrival')} subtitle={t('profileRequired')} value disabled />
          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem label={t('profileDeparture')} subtitle={t('profileRequired')} value disabled />
          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem label={t('profileDeviation')} subtitle={t('profileRequired')} value disabled />
          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingItem label={t('profileInactivity')} value={notifBateria} onValueChange={value => updateNotificationPreferences({ alertaInactividad: value })} />
          <Text style={[styles.cardTitle, { marginTop: 20, color: colors.text }]}>{t('profileNotificationChannels')}</Text>
          <SettingItem label={t('profileEmailNotif')} value={notifEmail} onValueChange={value => updateNotificationPreferences({ canalEmail: value })} />
          <SettingItem
            label={t('profileSMSNotif')}
            subtitle={smsDisponible ? undefined : t('profileSmsProviderRequired')}
            value={notifSMS}
            onValueChange={value => updateNotificationPreferences({ canalSms: value })}
            disabled={!smsDisponible && !notifSMS}
          />
        </Surface>

        <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('profileSecurity')}</Text>
          <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setPassModalVisible(true)}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profileChangePass')}</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setTwoFAModalVisible(true)}>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profile2FA')}</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                {twoFAEnabled ? `${t('twoFAActive')} · ${twoFAMethod}` : t('twoFAInactive')}
              </Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </Surface>

        <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('profileLanguages')}</Text>
          <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.surfaceSecondary }]} onPress={() => setLanguageModalVisible(true)}>
            <View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profileLanguage')}</Text>
              <Text style={[styles.settingSub, { color: colors.textSecondary }]}>{currentLanguage.flag} {currentLanguage.label}</Text>
            </View>
            <MaterialCommunityIcons name="web" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </Surface>

        <Surface style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={1}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('profileInfo')}</Text>
          <View style={[styles.infoRow, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profileAppVersion')}</Text>
            <Text style={[styles.infoValueText, { color: colors.textSecondary }]}>{appVersion}</Text>
          </View>
          <View style={[styles.infoRow, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profileAccountType')}</Text>
            <View style={[styles.badgeGreen, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.badgeGreenText, { color: colors.accent }]}>{accountRoleLabel}</Text>
            </View>
          </View>
        </Surface>

        <Button mode="contained" style={styles.logoutBtnRed} buttonColor={colors.error} textColor={colors.textOnPrimary} icon="logout" onPress={logout}>
          {t('profileLogout')}
        </Button>
      </ScrollView>

      <Modal visible={emailModalVisible} transparent animationType="fade" onRequestClose={() => setEmailModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Surface style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={5}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('profileEmail')}</Text>
              <IconButton icon="close" size={20} iconColor={colors.textSecondary} onPress={() => setEmailModalVisible(false)} />
            </View>
            <ProfileField colors={colors} label={t('profileEmail')} value={emailForm.nextEmail} keyboardType="email-address" onChangeText={nextEmail => setEmailForm(current => ({ ...current, nextEmail }))} />
            <ProfileField colors={colors} label={t('profileCurrentPass')} value={emailForm.currentPassword} secureTextEntry onChangeText={currentPassword => setEmailForm(current => ({ ...current, currentPassword }))} />
            {!!emailError && <Text style={[styles.modalError, { color: colors.error }]}>{emailError}</Text>}
            {emailError === t('profileSessionExpired') && (
              <Button onPress={async () => { await logout(); router.replace('/(auth)/login'); }} textColor={colors.primary}>
                {t('profileLoginAgain')}
              </Button>
            )}
            <Button mode="contained" buttonColor={colors.primary} textColor={colors.textOnPrimary} style={styles.modalButton} onPress={handleChangeEmail}>
              {t('profileSave')}
            </Button>
          </Surface>
        </View>
      </Modal>

      <Modal visible={passModalVisible} transparent animationType="fade" onRequestClose={() => setPassModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Surface style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={5}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('profileChangePass')}</Text>
              <IconButton icon="close" size={20} iconColor={colors.textSecondary} onPress={() => setPassModalVisible(false)} />
            </View>
            <ProfileField colors={colors} label={t('profileCurrentPass')} value={passForm.current} secureTextEntry onChangeText={current => setPassForm(prev => ({ ...prev, current }))} />
            <ProfileField colors={colors} label={t('profileNewPass')} value={passForm.next} secureTextEntry onChangeText={next => setPassForm(prev => ({ ...prev, next }))} />
            {passForm.next.length > 0 && (
              <View style={[styles.reqsBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Requirement ok={passReqs.minLen} label={t('securityMinLength')} />
                <Requirement ok={passReqs.upper} label={t('securityUpper')} />
                <Requirement ok={passReqs.lower} label={t('securityLower')} />
                <Requirement ok={passReqs.number} label={t('securityNumber')} />
                <Requirement ok={passReqs.special} label={t('securitySpecial')} />
              </View>
            )}
            <ProfileField colors={colors} label={t('profileConfirmPass')} value={passForm.confirm} secureTextEntry onChangeText={confirm => setPassForm(prev => ({ ...prev, confirm }))} />
            <Button mode="contained" onPress={handleChangePassword} style={styles.modalButton} buttonColor={allPassReqsMet ? colors.primary : colors.border} textColor={allPassReqsMet ? colors.textOnPrimary : colors.textSecondary}>
              {t('profileUpdatePass')}
            </Button>
          </Surface>
        </View>
      </Modal>

      <Modal visible={twoFAModalVisible} transparent animationType="fade" onRequestClose={() => setTwoFAModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Surface style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={5}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('profile2FA')}</Text>
              <IconButton icon="close" size={20} iconColor={colors.textSecondary} onPress={() => setTwoFAModalVisible(false)} />
            </View>
            <View>
              <View style={[styles.twoFAStatusBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={twoFAEnabled ? 'shield-check-outline' : 'shield-off-outline'} size={32} color={twoFAEnabled ? colors.accent : colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.twoFAStatusTitle, { color: colors.text }]}>{twoFAEnabled ? t('twoFAActive') : t('twoFAInactive')}</Text>
                  <Text style={[styles.twoFAStatusSub, { color: colors.textSecondary }]}>
                    {twoFAEnabled ? t('twoFAProtected') : t('twoFAEnableHelp')}
                  </Text>
                </View>
              </View>
              {!twoFAEnabled ? (
                <>
                  <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 10 }]}>{t('twoFAChooseMethod')}</Text>
                  <TouchableOpacity style={[styles.twoFAMethodBtn, { borderColor: twoFAMethod === 'EMAIL' ? colors.primary : colors.border, backgroundColor: colors.surfaceSecondary }]} onPress={() => handleRequest2FA('EMAIL')}>
                    <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} />
                    <Text style={[styles.twoFAMethodText, { color: colors.text }]}>{t('twoFAEmail')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={!smsDisponible || twoFASubmitting} style={[styles.twoFAMethodBtn, { borderColor: twoFAMethod === 'SMS' ? colors.primary : colors.border, backgroundColor: colors.surfaceSecondary, opacity: smsDisponible ? 1 : 0.5 }]} onPress={() => handleRequest2FA('SMS')}>
                    <MaterialCommunityIcons name="cellphone-message" size={20} color={colors.primary} />
                    <Text style={[styles.twoFAMethodText, { color: colors.text }]}>{t('twoFASMS')}</Text>
                  </TouchableOpacity>
                  {twoFAToken ? (
                    <>
                      <ProfileField colors={colors} label={t('twoFAEnterCode')} value={twoFACode} keyboardType="number-pad" onChangeText={value => setTwoFACode(value.replace(/\D/g, '').slice(0, 6))} />
                      <Button mode="contained" loading={twoFASubmitting} disabled={twoFASubmitting} buttonColor={colors.primary} textColor={colors.textOnPrimary} onPress={handleVerify2FA}>
                        {t('twoFAVerifyActivate')}
                      </Button>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <ProfileField colors={colors} label={t('profileCurrentPass')} value={twoFAPassword} secureTextEntry onChangeText={setTwoFAPassword} />
                  <Button mode="contained" loading={twoFASubmitting} disabled={twoFASubmitting} buttonColor={colors.error} textColor={colors.textOnPrimary} onPress={handleDisable2FA}>
                    {t('twoFADisable')}
                  </Button>
                </>
              )}
            </View>
          </Surface>
        </View>
      </Modal>

      <Modal visible={languageModalVisible} transparent animationType="fade" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <Surface style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} elevation={5}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('profileSelectLang')}</Text>
              <IconButton icon="close" size={20} iconColor={colors.textSecondary} onPress={() => setLanguageModalVisible(false)} />
            </View>
            {SUPPORTED_LANGUAGES.map(item => {
              const selected = item.code === lang;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.languageOption,
                    { backgroundColor: colors.surfaceSecondary, borderColor: selected ? colors.accent : colors.border },
                  ]}
                  onPress={() => {
                    setLanguage(item.code);
                    setLanguageModalVisible(false);
                  }}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={[styles.languageLabel, { color: selected ? colors.primary : colors.text }]}>{item.label}</Text>
                  {selected && <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  scrollContentWeb: { maxWidth: 860, alignSelf: 'center', width: '100%', paddingTop: 40 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 'bold' },
  pageSubtitle: { fontSize: 12, marginTop: 4 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSubtitleInfo: { fontSize: 12, marginBottom: 16 },
  profileRow: { flexDirection: 'row' },
  profileRowMobile: { flexDirection: 'column', gap: 16 },
  profileInputs: { flex: 1, marginLeft: 16 },
  inputWrap: { marginBottom: 12 },
  inputLabel: { fontSize: 11, marginLeft: 4, marginBottom: 4 },
  input: { height: 45, fontSize: 13 },
  emailRow: { flexDirection: 'row', alignItems: 'center' },
  emailInput: { flex: 1 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingTextCol: { flex: 1, paddingRight: 16 },
  settingLabel: { fontSize: 13, fontWeight: '500' },
  settingSub: { fontSize: 11, marginTop: 2 },
  divider: { marginVertical: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginTop: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginTop: 10 },
  infoValueText: { fontSize: 13 },
  badgeGreen: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeGreenText: { fontSize: 10, fontWeight: 'bold' },
  logoutBtnRed: { marginTop: 10, borderRadius: 8, paddingVertical: 4 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: { borderRadius: 12, padding: 20, width: '100%', maxWidth: 460, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalButton: { borderRadius: 8, marginTop: 8 },
  modalError: { marginTop: 8, marginBottom: 4, fontSize: 13 },
  reqsBox: { borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  checkLabel: { fontSize: 12 },
  twoFAStatusBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  twoFAStatusTitle: { fontSize: 14, fontWeight: '700' },
  twoFAStatusSub: { fontSize: 12, marginTop: 2 },
  twoFAMethodBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, gap: 10 },
  twoFAMethodText: { fontSize: 13, fontWeight: '600' },
  languageOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  languageFlag: { fontSize: 20, marginRight: 10 },
  languageLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
});
