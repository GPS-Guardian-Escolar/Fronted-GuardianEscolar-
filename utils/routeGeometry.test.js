import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { calculateRouteGeometry, decodePolyline } from './routeGeometry';
import { mapsService } from '../services/maps.service';

jest.mock('../services/maps.service', () => ({
  mapsService: { directions: jest.fn() },
}));

beforeEach(() => mapsService.directions.mockReset());

describe('routeGeometry', () => {
  it('decodes a known polyline into coordinates', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });

  it('rejects incomplete directions returned by the map provider', async () => {
    mapsService.directions.mockResolvedValue({ overviewPolyline: '' });

    await expect(calculateRouteGeometry({
      originLatitude: 4.7,
      originLongitude: -74.1,
      destinationLatitude: 4.8,
      destinationLongitude: -74.0,
    })).rejects.toThrow('ruta incompleta');
  });

  it('routes an assigned route response by its saved street coordinates', async () => {
    mapsService.directions.mockResolvedValue({ overviewPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' });
    const geometry = await calculateRouteGeometry({
      id: 'assigned-route',
      routeName: 'Home to school',
      originLatitude: 38.5,
      originLongitude: -120.2,
      destinationLatitude: 43.252,
      destinationLongitude: -126.453,
      stops: [],
    });
    expect(geometry).toHaveLength(3);
    expect(mapsService.directions).toHaveBeenCalledWith(
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 43.252, longitude: -126.453 },
    );
  });

  it('does not treat missing route coordinates as zero degrees', async () => {
    await expect(calculateRouteGeometry({ originLatitude: null, originLongitude: null })).resolves.toEqual([]);
    expect(mapsService.directions).not.toHaveBeenCalled();
  });
});
