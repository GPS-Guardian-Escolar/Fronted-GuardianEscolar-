import { describe, expect, it, jest } from '@jest/globals';
import { calculateRouteGeometry, decodePolyline } from './routeGeometry';
import { mapsService } from '../services/maps.service';

jest.mock('../services/maps.service', () => ({
  mapsService: { directions: jest.fn() },
}));

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
});
