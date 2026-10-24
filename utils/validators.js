export const SUPPORTED_EMAIL_TLDS = new Set(['com', 'co', 'edu', 'org', 'net', 'gov', 'mil', 'info', 'io', 'app', 'dev', 'es']);

export const isValidEmail = (email) => {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(value)) {
    return false;
  }
  const tld = value.split('.').pop();
  return SUPPORTED_EMAIL_TLDS.has(tld);
};

export const normalizePhoneDigits = (phone, maxLength = 15) => String(phone || '').replace(/\D/g, '').slice(0, maxLength);

export const normalizeColombianPhoneInput = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
  return digits.slice(0, 10);
};

export const sanitizePersonNameInput = (name, maxLength = 60) => String(name || '')
  .replace(/[^\p{L}\p{M} '\u2019-]/gu, '')
  .slice(0, maxLength);

export const isValidPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  const nationalNumber = digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits;
  return /^3\d{9}$/.test(nationalNumber) && !/(\d)\1{4}/.test(nationalNumber);
};

export const isValidPersonName = (name, { min = 2, max = 60 } = {}) => {
  const value = String(name || '').trim();
  return value.length >= min && value.length <= max
    && !/(\p{L})\1{2}/iu.test(value)
    && /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(value);
};

export const passwordChecks = (password, confirmation = password) => ({
  minLen: String(password || '').length >= 8,
  upper: /[A-Z]/.test(password || ''),
  lower: /[a-z]/.test(password || ''),
  number: /[0-9]/.test(password || ''),
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password || ''),
  match: String(password || '').length > 0 && password === confirmation,
});

export const validators = {
  email: (email) => {
    if (!email) return 'El correo es requerido';
    if (!isValidEmail(email)) return 'El correo no es válido';
    return null;
  },

  password: (password) => {
    if (!password) return 'La contraseña es requerida';
    const checks = passwordChecks(password);
    if (!checks.minLen) return 'Mínimo 8 caracteres';
    if (!checks.upper) return 'Debe incluir una mayúscula';
    if (!checks.lower) return 'Debe incluir una minúscula';
    if (!checks.number) return 'Debe incluir un número';
    if (!checks.special) return 'Debe incluir un carácter especial';
    return null;
  },

  nombre: (nombre) => {
    if (!nombre) return 'El nombre es requerido';
    if (nombre.trim().length < 2) return 'El nombre es muy corto';
    return null;
  },

  phone: (phone) => {
    const digits = normalizePhoneDigits(phone);
    if (!digits) return 'El teléfono es requerido';
    if (!isValidPhone(phone)) return 'El teléfono no es válido';
    return null;
  },

  age: (age) => {
    const value = Number(age);
    if (!String(age || '').trim()) return 'La edad es requerida';
    if (!Number.isInteger(value) || value < 1 || value > 100) return 'La edad debe estar entre 1 y 100';
    return null;
  },

  confirmPassword: (password, confirm) => {
    if (!confirm) return 'Confirma tu contraseña';
    if (password !== confirm) return 'Las contraseñas no coinciden';
    return null;
  },
};
