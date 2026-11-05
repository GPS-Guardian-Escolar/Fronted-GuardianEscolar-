import { describe, expect, it } from '@jest/globals';
import { URL as WebURL } from 'node:url';
import { canManageStudent, getLinkCodeErrorKey, hasActiveStudentQr, mergeStudentLinkCodes, validateIssuedLinkCode } from './studentActions';
import { buildQrPayload, encodeQrValue, parseQrValue } from '../child-link/qrPayload';

const owner = { id: 'owner' };
const student = { id: 'student', usuarioId: 'owner', dispositivos_vinculados: 0 };
const code = { codigo_vinculacion: 'ABCDEFGH23456789', codigo_expira_en: '2099-01-01T00:00:00Z' };

describe('student card permissions and linking', () => {
  it('allows owners and administrators but keeps shared viewers read only', () => {
    expect(canManageStudent(student, owner)).toBe(true);
    expect(canManageStudent(student, { id: 'viewer', roles: ['PARENT'] })).toBe(false);
    expect(canManageStudent(student, { id: 'admin', roles: ['ADMIN'] })).toBe(true);
    expect(canManageStudent({}, {})).toBe(false);
  });

  it('preserves a usable QR when refreshing names or changing language', () => {
    const incoming = { ...student, nombre: 'Updated name' };
    expect(mergeStudentLinkCodes([incoming], [{ ...student, ...code }], owner))
      .toEqual([{ ...incoming, ...code }]);
  });

  it('removes a cached QR after permissions or device count change', () => {
    const linked = { ...student, dispositivos_vinculados: 1 };
    expect(mergeStudentLinkCodes([linked], [{ ...student, ...code }], owner)).toEqual([linked]);
    expect(mergeStudentLinkCodes([student], [{ ...student, ...code }], { id: 'viewer' })).toEqual([student]);
  });

  it('does not display expired or malformed codes', () => {
    expect(hasActiveStudentQr({ ...code, codigo_expira_en: '2000-01-01' })).toBe(false);
    expect(() => validateIssuedLinkCode({ code: 'ABC', expiresAt: 'invalid' })).toThrow();
    expect(() => validateIssuedLinkCode({ expiresAt: code.codigo_expira_en })).toThrow();
    expect(() => validateIssuedLinkCode({ code: code.codigo_vinculacion, expiresAt: code.codigo_expira_en })).not.toThrow();
  });

  it('builds a scannable link carrying the issued student and code', () => {
    const url = encodeQrValue(buildQrPayload({ studentId: student.id, code: code.codigo_vinculacion }));
    expect(url).toContain('/scan-qr?');
    // Jest Expo mocks React Native's URL; exercise the web scanner with WHATWG URL.
    const originalURL = global.URL;
    global.URL = WebURL;
    try {
      expect(parseQrValue(url)).toEqual(expect.objectContaining({
        ok: true, payload: expect.objectContaining({ studentId: student.id, code: code.codigo_vinculacion }),
      }));
    } finally {
      global.URL = originalURL;
    }
  });

  it.each([
    [401, 'studSessionExpired'], [403, 'studReadOnlyDetails'],
    [404, 'studLinkStudentMissing'], [429, 'studLinkTryLater'], [500, 'studLinkCodeIssueFailed'],
  ])('explains HTTP %s with a translation key', (status, key) => {
    expect(getLinkCodeErrorKey({ response: { status } })).toBe(key);
  });

  it('explains timeouts and lost connections', () => {
    expect(getLinkCodeErrorKey({ code: 'ECONNABORTED' })).toBe('studLinkNetworkFailed');
    expect(getLinkCodeErrorKey({ request: {} })).toBe('studLinkNetworkFailed');
  });
});
