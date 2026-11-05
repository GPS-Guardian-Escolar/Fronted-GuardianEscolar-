import { getInitials } from './studentStorage';

const coordinate = (lat, lng) => {
  if (lat == null || lng == null || String(lat).trim() === '' || String(lng).trim() === '') return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
};
const zonePoint = zone => coordinate(zone.center?.latitude ?? zone.latitude, zone.center?.longitude ?? zone.longitude);
const nearby = (a, b) => a && b && Math.abs(a.latitude - b.latitude) < 0.00015 && Math.abs(a.longitude - b.longitude) < 0.00015;
const zoneName = zone => zone?.name || zone?.zoneName || zone?.nombre;

export function buildRouteMarkers(route, zones = [], colors, t) {
  if (!route) return [];
  return [
    { point: coordinate(route.originLatitude, route.originLongitude), address: route.originAddress || route.start, color: colors.success, fallback: t('zonesRouteStart') },
    ...(route.stops || []).slice().sort((a, b) => Number(a.stopOrder || 0) - Number(b.stopOrder || 0)).map((stop, index) => ({ point: coordinate(stop.latitude, stop.longitude), address: stop.name || stop.stopName || stop.address, color: colors.primary, fallback: `${t('zonesRouteStop')} ${index + 1}` })),
    { point: coordinate(route.destinationLatitude, route.destinationLongitude), address: route.destinationAddress || route.end, color: colors.primary, fallback: t('zonesRouteEnd') },
  ].filter(endpoint => endpoint.point).map((endpoint, index) => {
    const zone = zones.find(item => nearby(endpoint.point, zonePoint(item)));
    const address = String(endpoint.address || '').trim();
    const name = zoneName(zone) || (/[\p{L}]/u.test(address) ? address : '') || endpoint.fallback;
    return { ...endpoint.point, id: `route-endpoint-${index}`, label: getInitials(name), title: `${endpoint.fallback}: ${name}`, color: endpoint.color };
  });
}

export function buildTrackingMarkers(zones = [], route, colors, t) {
  const endpoints = buildRouteMarkers(route, zones, colors, t);
  const markers = zones.map(zone => {
    const center = zonePoint(zone);
    if (!center || endpoints.some(endpoint => nearby(center, endpoint))) return null;
    const name = zoneName(zone) || zone.type || zone.zoneType || 'Zona';
    const type = zone.type || zone.zoneType;
    return { ...center, id: `zone-${zone.id}`, label: getInitials(name), title: name,
      color: zone.color || (type === 'Escuela' ? colors.primary : type === 'Casa' ? colors.accent : colors.error) };
  }).filter(Boolean);
  return [...markers, ...endpoints];
}
