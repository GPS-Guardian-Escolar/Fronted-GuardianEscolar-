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
  const stops = (route?.stops || [])
    .slice()
    .sort((a, b) => Number(a.stopOrder || 0) - Number(b.stopOrder || 0))
    .map(stop => ({ latitude: Number(stop.latitude), longitude: Number(stop.longitude) }))
    .filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  return [origin, ...stops, destination].filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
}

export async function calculateRouteGeometry(route) {
  const points = routePoints(route);
  if (points.length < 2) return [];
  const segments = await Promise.all(points.slice(0, -1).map((origin, index) =>
    mapsService.directions(origin, points[index + 1])
  ));
  return segments.reduce((geometry, directions) => {
    const segment = decodePolyline(directions.overviewPolyline);
    return geometry.concat(geometry.length && segment.length ? segment.slice(1) : segment);
  }, []);
}