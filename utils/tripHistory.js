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

export function matchesHistoryStatus(item, filter) {
  if (filter === 'all') return true;
  const expected = filter === 'Con Incidente'
    ? 'incident'
    : filter === 'Completado' ? 'completed' : filter === 'En Proceso' ? 'inProgress' : 'other';
  return getHistoryStatusKind(item) === expected;
}
