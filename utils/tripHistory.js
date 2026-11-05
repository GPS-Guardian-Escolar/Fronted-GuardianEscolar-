export function toLocalDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getHistoryStatusKind(item) {
  if (item?.alerta || item?.estado === 'Con Incidente') return 'incident';
  if (item?.estado === 'Completado') return 'completed';
  if (item?.estado === 'En Proceso') return 'inProgress';
  return 'other';
}

const TRACKING_INCIDENT_TYPES = new Set([
  'ROUTE_DEVIATION',
  'SAFE_ZONE_EXIT',
  'LOCATION_UNAVAILABLE',
  'LOCATION_STOPPED',
]);

export function hasTrackingIncident(trip, notifications = []) {
  return Boolean(trip?.hadDeviation)
    || notifications.some(notification => TRACKING_INCIDENT_TYPES.has(
      String(notification.eventType || notification.event_type || '').toUpperCase(),
    ));
}

export function getHistoryObservationKey(item) {
  if (item?.incidentEventType === 'LOCATION_UNAVAILABLE') return 'histObsLocationUnavailable';
  if (item?.incidentEventType === 'LOCATION_STOPPED') return 'histObsTrackingStopped';
  if (item?.incidentEventType === 'SAFE_ZONE_EXIT') return 'histObsZoneExit';
  if (item?.alerta) return 'histObsAlert';
  return item?.advertencia ? 'histObsInactivity' : 'histObsNormal';
}

export function matchesHistoryStatus(item, filter) {
  if (filter === 'all') return true;
  // Completion and incidents overlap: a completed trip may have an alert.
  if (filter === 'Completado' || filter === 'En Proceso') return item?.estado === filter;
  const expected = filter === 'Con Incidente'
    ? 'incident'
    : filter === 'Completado' ? 'completed' : filter === 'En Proceso' ? 'inProgress' : 'other';
  return getHistoryStatusKind(item) === expected;
}
