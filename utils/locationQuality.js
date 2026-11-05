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
    // A coarse fix can put the marker far from the child and imitate motion.
    // Wait for a usable GPS reading instead of presenting a guessed position.
    || fix.accuracy <= 0 || fix.accuracy > 50) return { last };
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
  if (!Array.isArray(points) || points.length < 3) return [];

  const validPoints = points.filter(point => Number.isFinite(point?.latitude)
    && Math.abs(point.latitude) <= 90
    && Number.isFinite(point?.longitude)
    && Math.abs(point.longitude) <= 180
    && (point.accuracy == null
      || (Number.isFinite(Number(point.accuracy)) && Number(point.accuracy) <= 50)));
  if (validPoints.length < 4) return [];

  const origin = validPoints[0];
  let movementStart = -1;
  for (let index = 2; index < validPoints.length; index += 1) {
    const previous = validPoints[index - 1];
    const current = validPoints[index];
    const confirmation = validPoints[index + 1];
    if (!previous || !current || !confirmation) continue;
    const previousDistance = distanceMeters(origin, previous);
    const currentDistance = distanceMeters(origin, current);
    const confirmationDistance = distanceMeters(origin, confirmation);
    const stepDistance = distanceMeters(previous, current);
    const confirmationStep = distanceMeters(current, confirmation);
    if (previousDistance >= 30 && currentDistance >= 40
      && currentDistance - previousDistance >= 5 && stepDistance >= 5
      // The next fix must corroborate the location without requiring the
      // student to keep walking after the trip has already started.
      && confirmationDistance >= currentDistance - 10
      && confirmationStep <= 25
      && !Number(previous.stoppedSeconds || 0)
      && !Number(current.stoppedSeconds || 0)) {
      // Draw only the segment whose movement was corroborated by a further
      // advancing GPS fix. This keeps old stationary drift out of the trace.
      movementStart = index - 1;
      break;
    }
  }

  if (movementStart < 0) return [];
  const confirmed = [validPoints[movementStart], validPoints[movementStart + 1]];
  for (let index = movementStart + 2; index < validPoints.length; index += 1) {
    const point = validPoints[index];
    if (Number(point.stoppedSeconds || 0)) continue;
    if (distanceMeters(confirmed[confirmed.length - 1], point) >= 5) confirmed.push(point);
  }
  return confirmed.length >= 2 ? confirmed : [];
}

export function shouldDrawJourneyPath(isLive, points) {
  return Boolean(isLive && Array.isArray(points) && points.length >= 2);
}
