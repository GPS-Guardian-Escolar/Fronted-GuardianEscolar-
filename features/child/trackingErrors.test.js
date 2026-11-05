import { describe, expect, it } from '@jest/globals';
import { trackingErrorMessage } from './trackingErrors';
import es from '../../translations/es.json';

describe('tracking errors in Spanish', () => {
  const t = key => es[key];
  it.each([
    ['The student already has an active trip', 'studentTrackingActiveConflict'],
    ['The guardian must select a route before starting the next trip', 'studentTrackingRouteMissing'],
    ['The student does not have the requested route assigned', 'studentTrackingRouteUnassigned'],
    ['An unexpected internal server error occurred', 'studentTrackingFailed'],
  ])('localizes %s without displaying raw API text', (message, key) => {
    expect(trackingErrorMessage({ response: { status: 400, data: { message } } }, t)).toBe(es[key]);
  });
  it('keeps accented characters intact', () => {
    expect(es.studentTrackingPermissionDenied).toContain('ubicación');
    for (const [key, value] of Object.entries(es)) {
      if (key.startsWith('studentTracking')) expect(value).not.toMatch(/[a-z]\?[a-z]|\uFFFD/i);
    }
  });
});
