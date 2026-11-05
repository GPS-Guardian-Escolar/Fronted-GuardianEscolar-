/* global jest, test, expect */
import { buildRouteMarkers, buildTrackingMarkers } from './trackingMarkers';

jest.mock('./studentStorage', () => ({
  getInitials: name => {
    const words = name.trim().split(/\s+/);
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
  },
}));
const colors = { success: 'green', primary: 'blue', accent: 'green', error: 'red' };
const t = key => ({ zonesRouteStart: 'Inicio', zonesRouteEnd: 'Destino' }[key]);
const zones = [
  { id: 1, name: 'Casa tía Leidy', latitude: 2.94, longitude: -75.28 },
  { id: 2, name: 'Colegio Nacional', latitude: 2.95, longitude: -75.25 },
];
const route = { originLatitude: 2.94, originLongitude: -75.28, destinationLatitude: 2.95, destinationLongitude: -75.25 };

test('uses zone initials and endpoint colors without duplicate markers', () => {
  const markers = buildTrackingMarkers(zones, route, colors, t);
  expect(markers).toHaveLength(2);
  expect(markers[0]).toMatchObject({ label: 'CL', color: 'green', title: 'Inicio: Casa tía Leidy' });
  expect(markers[1]).toMatchObject({ label: 'CN', color: 'blue', title: 'Destino: Colegio Nacional' });
});

test('does not invent coordinates and uses the endpoint name when no zone matches', () => {
  expect(buildRouteMarkers({ ...route, originLatitude: null, destinationAddress: 'Casa Ana' }, [], colors, t))
    .toMatchObject([{ label: 'CA', color: 'blue' }]);
});
