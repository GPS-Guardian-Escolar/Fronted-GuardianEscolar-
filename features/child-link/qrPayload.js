import { STUDENT_LINK_BASE_URL } from '../../config/endpoints';

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function buildStudentLink(payload) {
  const baseUrl = String(STUDENT_LINK_BASE_URL || '').replace(/\/+$/, '');
  return `${baseUrl}/scan-qr?${linkQuery(payload)}`;
}

function linkQuery(payload) {
  return `studentId=${encodeURIComponent(String(payload.studentId || ''))}&code=${encodeURIComponent(String(payload.code || ''))}`;
}

function normalizePayload(payload) {
  return {
    v: 1,
    studentId: String(payload.studentId || payload.student_id || payload.id || ''),
    code: String(payload.code || payload.linkCode || payload.codigo || payload.codigo_vinculacion || payload.link_code || ''),
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
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://gps-guardian-escolar.invalid';
    const url = new URL(value, base);
    const params = url.searchParams;
    const payload = normalizePayload({
      studentId: params.get('s') || params.get('id') || params.get('studentId'),
      code: params.get('c') || params.get('codigo') || params.get('code') || params.get('linkCode') || params.get('codigo_vinculacion'),
      name: params.get('nombre') || params.get('name'),
      contactPhone: params.get('telefono') || params.get('contactPhone'),
    });

    if (!isPresent(payload.code)) {
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
  return buildStudentLink(payload);
}

export function encodeAppQrValue(payload) {
  return `gpsguardianescolar://scan-qr?${linkQuery(payload)}`;
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

    const payload = normalizePayload({
      ...parsed,
      studentId: parsed.studentId || parsed.s,
      code: parsed.code || parsed.c,
    });
    if (!isPresent(payload.code)) {
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
