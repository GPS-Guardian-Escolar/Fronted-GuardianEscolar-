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
  if (item?.rowType === 'event') {
    const eventType = String(item.eventType || item.event?.eventType || item.event?.event_type || '').toUpperCase();
    if (eventType === 'DEVICE_LINKED') return 'informational';
    if (['DELAY', 'INACTIVITY', 'ROUTE_DEVIATION', 'SAFE_ZONE_EXIT', 'LOCATION_UNAVAILABLE', 'LOCATION_STOPPED'].includes(eventType)) return 'incident';
    if (eventType === 'TRIP_COMPLETED') return 'completed';
    return 'inProgress';
  }
  if (item?.estado === 'Completado') return 'completed';
  if (item?.estado === 'En Proceso') return 'inProgress';
  if (item?.alerta || item?.estado === 'Con Incidente') return 'incident';
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
  if (item?.rowType === 'trip' && item?.events?.length) return 'histObsNormal';
  if (item?.rowType === 'event') {
    if (item.eventType === 'LOCATION_UNAVAILABLE') return 'histObsLocationUnavailable';
    if (item.eventType === 'LOCATION_STOPPED') return 'histObsTrackingStopped';
    if (item.eventType === 'SAFE_ZONE_EXIT') return 'histObsZoneExit';
    if (item.eventType === 'ROUTE_DEVIATION') return 'histObsAlert';
    if (item.eventType === 'INACTIVITY') return 'histObsInactivity';
    return 'histObsNormal';
  }
  if (item?.incidentEventType === 'LOCATION_UNAVAILABLE') return 'histObsLocationUnavailable';
  if (item?.incidentEventType === 'LOCATION_STOPPED') return 'histObsTrackingStopped';
  if (item?.incidentEventType === 'SAFE_ZONE_EXIT') return 'histObsZoneExit';
  if (item?.alerta) return 'histObsAlert';
  return item?.advertencia ? 'histObsInactivity' : 'histObsNormal';
}

export function matchesHistoryStatus(item, filter) {
  if (filter === 'all') return true;
  const expected = filter === 'Con Incidente'
    ? 'incident'
    : filter === 'Informativo' ? 'informational'
    : filter === 'Completado' ? 'completed' : filter === 'En Proceso' ? 'inProgress' : 'other';
  return getHistoryStatusKind(item) === expected;
}
