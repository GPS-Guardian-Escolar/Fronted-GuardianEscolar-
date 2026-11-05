export function trackingErrorMessage(error, t) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
  if (status === 401) return t('studentTrackingSessionExpired');
  if (/not linked|device is not linked/.test(message)) return t('studentTrackingDeviceUnlinked');
  if (/already has an active trip/.test(message)) return t('studentTrackingActiveConflict');
  if (/no active route assigned|guardian must select a route/.test(message)) return t('studentTrackingRouteMissing');
  if (/does not have the requested route assigned/.test(message)) return t('studentTrackingRouteUnassigned');
  if (/permite|permiso|permission/.test(message)) return t('studentTrackingPermissionDenied');
  if (/gps|ubicaci[oó]n|geolocation/.test(message)) return t('studentTrackingLocationUnavailable');
  if (!error?.response && /network|timeout|fetch/.test(message)) return t('studentTrackingConnectionFailed');
  return t('studentTrackingFailed');
}
