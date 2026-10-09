import { STUDENT_LINK_BASE_URL } from '../../config/endpoints';

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function buildStudentLink(payload) {
  const base = String(payload.baseUrl || '').replace(/\/$/, '');
  const path = `${base}/scan-qr` || '/scan-qr';
  const params = new URLSearchParams({
    studentId: String(payload.studentId || ''),
    code: String(payload.code || ''),
  });

  return `${path}?${params.toString()}`;
}

function normalizePayload(payload) {
  return {
    v: 1,
    studentId: String(payload.studentId || payload.id || ''),
    code: String(payload.code || payload.codigo || ''),
    name: String(payload.name || payload.nombre || ''),
    contactPhone: String(payload.contactPhone || payload.telefono || ''),
    exp: payload.exp || undefined,
  };
}

function isExpired(exp) {
  if (!exp) return false;
  const expiresAt = typeof exp === 'number' ? new Date(exp) : new Date(String(exp));
  return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();
}

function parseLegacyUrl(value) {
  try {
    const url = new URL(value);
    const params = url.searchParams;
    const payload = normalizePayload({
      studentId: params.get('id') || params.get('studentId'),
      code: params.get('codigo') || params.get('code'),
      name: params.get('nombre') || params.get('name'),
      contactPhone: params.get('telefono') || params.get('contactPhone'),
    });

    if (!isPresent(payload.studentId) || !isPresent(payload.code)) {
      return { ok: false, reason: 'legacy_missing_fields' };
    }

    return { ok: true, payload, legacy: true };
  } catch {
    return { ok: false, reason: 'invalid_format' };
  }
}

export function buildQrPayload({ studentId, code, name, contactPhone, exp }) {
  return normalizePayload({ studentId, code, name, contactPhone, exp });
}

export function encodeQrValue(payload) {
  // The QR must be a frontend URL. Raw JSON is interpreted by phone cameras
  // as a contact card when it contains a telephone number.
  return buildStudentLink({ ...payload, baseUrl: STUDENT_LINK_BASE_URL });
}

export function parseQrValue(value) {
  if (!isPresent(value)) {
    return { ok: false, reason: 'empty' };
  }

  const text = String(value).trim();

  try {
    const parsed = JSON.parse(text);
    if (parsed?.v !== 1) {
      return { ok: false, reason: 'unsupported_version' };
    }

    const payload = normalizePayload(parsed);
    if (!isPresent(payload.studentId) || !isPresent(payload.code)) {
      return { ok: false, reason: 'missing_required_fields' };
    }

    if (isExpired(payload.exp)) {
      return { ok: false, reason: 'expired' };
    }

    return { ok: true, payload };
  } catch {
    return parseLegacyUrl(text);
  }
}
