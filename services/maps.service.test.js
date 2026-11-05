import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from './api';
import { mapsService } from './maps.service';

jest.mock('./api', () => ({ post: jest.fn() }));

describe('mapsService.geocodeCandidates', () => {
  beforeEach(() => jest.resetAllMocks());

  it('keeps every valid Google result so the user can confirm the exact point', async () => {
    api.post.mockResolvedValue({ data: {
      status: 'OK',
      results: [
        { formattedAddress: 'Calle 8, Neiva', placeId: 'one', latitude: 2.9, longitude: -75.2, locationType: 'ROOFTOP' },
        { formattedAddress: 'Santa Lucía Plaza, Neiva', placeId: 'two', latitude: 2.91, longitude: -75.21, partialMatch: true },
        { formattedAddress: 'Invalid', latitude: null, longitude: null },
      ],
    } });

    await expect(mapsService.geocodeCandidates('C. 8 #48 117, Neiva')).resolves.toEqual([
      expect.objectContaining({ placeId: 'one', latitude: 2.9, longitude: -75.2, locationType: 'ROOFTOP', partialMatch: false }),
      expect.objectContaining({ placeId: 'two', latitude: 2.91, longitude: -75.21, partialMatch: true }),
    ]);
  });

  it('does not accept an empty geocoding response', async () => {
    api.post.mockResolvedValue({ data: { status: 'ZERO_RESULTS', results: [] } });
    await expect(mapsService.geocodeCandidates('unknown')).rejects.toThrow('ZERO_RESULTS');
  });
});
