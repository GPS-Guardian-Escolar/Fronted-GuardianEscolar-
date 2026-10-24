import { mapsService } from '../services/maps.service';

export function decodePolyline(encoded = '') {
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}

function routePoints(route) {
  const origin = { latitude: Number(route?.originLatitude), longitude: Number(route?.originLongitude) };
  const destination = { latitude: Number(route?.destinationLatitude), longitude: Number(route?.destinationLongitude) };
  const isValidPoint = point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
  if (!isValidPoint(origin) || !isValidPoint(destination)) return [];
  const stops = (route?.stops || [])
    .slice()
    .sort((a, b) => Number(a.stopOrder || 0) - Number(b.stopOrder || 0))
    .map(stop => ({ latitude: Number(stop.latitude), longitude: Number(stop.longitude) }))
    .filter(isValidPoint);
  return [origin, ...stops, destination];
}

function distanceMeters(a, b) {
  const radians = value => value * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export async function calculateRouteGeometry(route) {
  const points = routePoints(route);
  if (points.length < 2) return [];
  const segments = await Promise.all(points.slice(0, -1).map((origin, index) =>
    mapsService.directions(origin, points[index + 1])
  ));
  const geometry = [];
  const append = point => {
    const previous = geometry[geometry.length - 1];
    if (!previous || distanceMeters(previous, point) > 3) geometry.push(point);
  };

  segments.forEach((directions, index) => {
    const segment = decodePolyline(directions?.overviewPolyline || '');
    if (segment.length < 2) throw new Error('El proveedor de mapas devolvió una ruta incompleta.');
    // Keep each saved waypoint in the line. Google snaps route endpoints to nearby roads,
    // so omitting these points can leave visible gaps between legs or before the destination.
    append(points[index]);
    segment.forEach(append);
    append(points[index + 1]);
  });
  return geometry;
}
