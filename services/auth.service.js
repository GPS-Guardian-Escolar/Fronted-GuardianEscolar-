import api from './api';
import { storage } from '../utils/storage';
import { getAuthDeviceInfo } from '../utils/deviceIdentity';
import { isValidEmail } from '../utils/validators';

const RECOVERY_GENERIC_MESSAGE = 'If an account exists, we sent password recovery instructions.';

const getResponseUser = (data) => data?.user || data?.usuario || null;

const normalizeBackendUser = (userData) => {
  if (!userData) {
    throw new Error('The server response did not include user data.');
  }

  const roles = Array.isArray(userData.roles) ? userData.roles : [];
  const role = roles[0] || 'PARENT';
  const frontendRole = role === 'ADMIN' ? 'ADMINISTRADOR' : role;
  const fullName = userData.fullName || userData.nombreCompleto || '';

  return {
    id: userData.id,
    email: userData.email || userData.correo,
    phone: userData.phone || userData.telefono || '',
    name: fullName,
    nombre: fullName,
    role,
    rol: frontendRole,
    roles,
    emailVerified: userData.emailVerified ?? userData.correoVerificado,
    twoFAEnabled: (userData.twoFactorEnabled ?? userData.dosFactoresActivo) === true,
    twoFAMethod: userData.twoFactorMethod || userData.dosFactoresMetodo || 'EMAIL',
    termsAccepted: userData.termsAccepted ?? userData.aceptaTerminos,
    termsVersion: userData.termsVersion || userData.versionTerminos,
  };
};

const persistBackendSession = async (data) => {
  const user = normalizeBackendUser(getResponseUser(data));
  if (data.token) {
    await storage.setToken(data.token);
  }
  await storage.setUser(user);
  return { token: data.token, user, expiresInMinutes: data.expiresInMinutes ?? data.expiraEnMinutos };
};

const normalizeAuthResponse = async (data) => {
  if (data?.requiresTwoFactor || data?.requiereDosFactores) {
    return {
      requires2FA: true,
      twoFAToken: data.twoFactorToken || data.tokenDosFactores,
      twoFAMethod: data.twoFactorMethod || data.metodoDosFactores || 'EMAIL',
      user: normalizeBackendUser(getResponseUser(data)),
    };
  }
  return persistBackendSession(data);
};

const getApiErrorMessage = (error, fallback) => {
  const data = error.response?.data;
  return data?.message || data?.mensaje || data?.error || error.message || fallback;
};

const getAuthReturnUrl = (path = '/login') => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return undefined;
  }
  return `${window.location.origin}${path}`;
};

const getFriendlyAuthError = (error, fallback) => {
  const status = error.response?.status;
  const data = error.response?.data;
  const backendMessage = data?.message || data?.mensaje || data?.error;

  if (status === 401) {
    return 'El correo o la contraseña no son correctos. Verifica tus datos o restablece la contraseña.';
  }
  if (status === 403) {
    return 'Tu cuenta no tiene permiso para iniciar sesión. Verifica el correo o contacta al administrador.';
  }
  if (status >= 500) {
    return 'El servidor no está disponible en este momento. Intenta nuevamente más tarde.';
  }
  if (!error.response) {
    return 'No fue posible conectarse con el servidor. Revisa tu conexión e intenta nuevamente.';
  }

  return backendMessage || fallback;
};

export const authService = {
  login: async (email, password) => {
    try {
      const deviceInfo = await getAuthDeviceInfo();
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        ...deviceInfo,
      }, { skipAuth: true });
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw new Error(getFriendlyAuthError(error, 'No se pudo iniciar sesión.'));
    }
  },

  register: async ({ name, email, password, phone, acceptedTerms, termsVersion }) => {
    try {
      const response = await api.post('/auth/register', {
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        password,
        termsAccepted: acceptedTerms === true,
        termsVersion,
        returnUrl: getAuthReturnUrl('/login'),
      });
      return normalizeAuthResponse(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo crear la cuenta.'));
    }
  },

  requestPasswordRecovery: async (contact) => {
    const email = contact.trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new Error('Enter a valid email address.');
    }

    try {
      const response = await api.post('/auth/password/forgot', { email });
      return { success: true, message: response.data?.message || response.data?.mensaje || RECOVERY_GENERIC_MESSAGE };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, RECOVERY_GENERIC_MESSAGE));
    }
  },

  resetPasswordWithToken: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/password/reset', {
        token,
        newPassword,
      });
      return { success: true, message: response.data?.message || response.data?.mensaje || 'Password updated successfully.' };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    }
  },

  verifyEmailWithToken: async (token) => {
    try {
      const response = await api.get('/auth/verify-email', {
        params: { token },
        skipAuth: true,
      });
      return { success: true, message: response.data?.message || response.data?.mensaje || 'Email verified successfully.' };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo verificar el correo.'));
    }
  },

  confirmLoginWithToken: async (token) => {
    try {
      const response = await api.get('/auth/confirm-login', {
        params: { token },
        skipAuth: true,
      });
      return { success: true, message: response.data?.message || response.data?.mensaje || 'Device confirmed successfully.' };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo confirmar el dispositivo.'));
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      const user = normalizeBackendUser(response.data);
      await storage.setUser(user);
      return user;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo consultar la sesión.'));
    }
  },

  updatePassword: async (_email, currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    }
  },

  validatePassword: async (_email, currentPassword) => {
    if (!currentPassword) {
      throw new Error('Enter your current password.');
    }
    return true;
  },

  updateEmail: async (_email, currentPassword, newEmail) => {
    try {
      const response = await api.put('/auth/email', {
        currentPassword,
        newEmail: newEmail.trim().toLowerCase(),
      });
      const user = normalizeBackendUser(response.data);
      await storage.setUser(user);
      return user;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo actualizar el correo.'));
    }
  },

  updateProfile: async (_email, newName, newPhone) => {
    try {
      const response = await api.put('/auth/profile', {
        fullName: newName.trim(),
        phone: newPhone?.trim() || '',
      });
      const user = normalizeBackendUser(response.data);
      await storage.setUser(user);
      return user;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo actualizar el perfil.'));
    }
  },

  update2FA: async () => {
    throw new Error('Use request2FACode and verify2FA to manage 2FA.');
  },

  request2FACode: async (method) => {
    try {
      const response = await api.post('/auth/2fa/request', { method });
      return {
        success: true,
        message: response.data?.message || response.data?.mensaje || 'Code sent.',
        twoFAToken: response.data?.twoFactorToken || response.data?.tokenDosFactores,
        twoFAMethod: response.data?.twoFactorMethod || response.data?.metodoDosFactores || method,
      };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo enviar el código 2FA.'));
    }
  },

  verify2FA: async (token, code, method) => {
    try {
      const response = await api.post('/auth/2fa/verify', {
        token,
        code,
        method,
      });
      return persistBackendSession(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo verificar el código 2FA.'));
    }
  },

  resend2FA: async (token) => {
    try {
      const response = await api.post('/auth/2fa/resend', { token });
      return {
        success: true,
        message: response.data?.message || response.data?.mensaje || 'Código reenviado.',
        twoFAToken: response.data?.twoFactorToken || response.data?.tokenDosFactores,
        twoFAMethod: response.data?.twoFactorMethod || response.data?.metodoDosFactores || 'EMAIL',
      };
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo reenviar el código 2FA.'));
    }
  },

  disable2FA: async (currentPassword) => {
    try {
      const response = await api.post('/auth/2fa/disable', {
        currentPassword,
      });
      return normalizeBackendUser(response.data);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo desactivar el 2FA.'));
    }
  },

  complete2FALogin: async (token, code, method) => {
    return authService.verify2FA(token, code, method);
  },

  verifyRecoveryCode: async () => {
    throw new Error('Use the link sent to your email to reset your password.');
  },

  completeRecoveryLogin: async () => {
    throw new Error('Use your email and new password to sign in.');
  },

  resetRecoveredPassword: async () => {
    throw new Error('The recovery link must include a valid token.');
  },

  getRecoverySession: async () => null,

  logout: async () => {
    await storage.clearAll();
  },

  refreshToken: async () => {
    return null;
  },
};

