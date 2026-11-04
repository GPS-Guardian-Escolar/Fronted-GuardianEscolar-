import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from './api';
import { trackingService } from './tracking.service';

jest.mock('./api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
}));

describe('trackingService.startOrResumeTrip', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reuses the saved active trip without creating a duplicate', async () => {
    await expect(trackingService.startOrResumeTrip({
      activeTripId: 'trip-1',
      studentId: 'student-1',
    })).resolves.toEqual({ trip: { id: 'trip-1' }, created: false });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a trip when there is no saved active trip', async () => {
    api.post.mockResolvedValue({ data: { id: 'trip-2' } });

    await expect(trackingService.startOrResumeTrip({
      studentId: 'student-1',
      routeId: 'route-1',
      tripStartedAt: '2026-11-04T12:00:00Z',
    }, { childToken: 'device-token' })).resolves.toEqual({
      trip: { id: 'trip-2' },
      created: true,
    });
    expect(api.post).toHaveBeenCalledWith('/trips', {
      studentId: 'student-1',
      routeId: 'route-1',
      tripStartedAt: '2026-11-04T12:00:00Z',
    }, { skipAuth: true, headers: { Authorization: 'Bearer device-token' } });
  });
});
