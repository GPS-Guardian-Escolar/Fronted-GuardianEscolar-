export function distanceMeters(a, b) {
  const rad = value => value * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude))
    * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

// Keep a fixed anchor during GPS jitter. Compare against that anchor rather
// than each noisy fix, so slow walking eventually counts as displacement.
export function filterLocation(fix, last) {
  const time = Date.parse(fix.recordedAt);
  if (!Number.isFinite(fix.latitude) || Math.abs(fix.latitude) > 90
    || !Number.isFinite(fix.longitude) || Math.abs(fix.longitude) > 180
    || !Number.isFinite(time) || !Number.isFinite(fix.accuracy)
    || fix.accuracy <= 0 || fix.accuracy > 80) return { last };
  if (!last) {
    const coordinate = { ...fix, stoppedSeconds: 0 };
    return { last: coordinate, coordinate };
  }
  const elapsed = time - Date.parse(last.recordedAt);
  if (elapsed <= 0) return { last };
  const radius = Math.max(8, (last.accuracy || 10) + fix.accuracy);
  const distance = distanceMeters(last, fix);
  if (distance > radius) {
    const pending = last.pending;
    const confirmed = pending && time > Date.parse(pending.recordedAt)
      && time - Date.parse(pending.recordedAt) <= 30000
      && distanceMeters(pending, fix) <= Math.max(radius, distance)
      && distance / (elapsed / 1000) <= 45;
    if (!confirmed) return { last: { ...last, pending: fix } };
    const coordinate = { ...fix, stoppedSeconds: 0 };
    return { last: coordinate, coordinate };
  }
  const anchor = { ...last, pending: undefined };
  if (elapsed < 30000) return { last: anchor };
  // A fresh fix inside the uncertainty radius refreshes availability without
  // inventing movement. Never refresh the timestamp without a real GPS fix.
  const coordinate = { ...anchor, recordedAt: fix.recordedAt,
    stoppedSeconds: Math.min(86400, (last.stoppedSeconds || 0) + Math.round(elapsed / 1000)) };
  return { last: coordinate, coordinate };
}

export function journeyPoints(points) {
  return points.filter((point, index) => index === 0 || (
    !Number(point.stoppedSeconds || 0)
    && distanceMeters(points[index - 1], point) >= 1
  ));
}

export function shouldDrawJourneyPath(isLive, location) {
  return Boolean(isLive && location && Number(location.stoppedSeconds || 0) === 0);
}
