import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from './api';
import { trackingService } from './tracking.service';

jest.mock('./api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

describe('trackingService.startOrResumeTrip', () => {
  beforeEach(() => jest.resetAllMocks());

  it('recovers the server trip even when the saved identifier is stale', async () => {
    api.get.mockResolvedValue({ data: { id: 'trip-1' } });
    await expect(trackingService.startOrResumeTrip({
      activeTripId: 'stale-trip',
      studentId: 'student-1',
    })).resolves.toEqual({ trip: { id: 'trip-1' }, created: false });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates a trip when there is no saved active trip', async () => {
    api.get.mockResolvedValue({ status: 204 });
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

  it('recovers an active trip after local data was lost', async () => {
    api.get.mockResolvedValue({ data: { id: 'remote-trip' } });
    await expect(trackingService.startOrResumeTrip({ studentId: 'student-1' }, { childToken: 'device-token' }))
      .resolves.toEqual({ trip: { id: 'remote-trip' }, created: false });
    expect(api.get).toHaveBeenCalledWith('/trips/active', {
      params: { studentId: 'student-1' }, skipAuth: true, headers: { Authorization: 'Bearer device-token' },
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not trust a cached identifier or create a trip if server verification fails', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));
    await expect(trackingService.startOrResumeTrip({ studentId: 'student-1', activeTripId: 'cached' }))
      .rejects.toThrow('Network Error');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('recovers a trip created by a concurrent request', async () => {
    api.get.mockResolvedValueOnce({ status: 204 }).mockResolvedValueOnce({ data: { id: 'concurrent' } });
    api.post.mockRejectedValue({ response: { status: 400 } });
    await expect(trackingService.startOrResumeTrip({ studentId: 'student-1' }))
      .resolves.toEqual({ trip: { id: 'concurrent' }, created: false });
  });

  it('creates a pending monitoring trip without starting a trip before movement', async () => {
    api.get.mockResolvedValue({ status: 204 });
    api.post.mockResolvedValue({ data: { id: 'monitor-1', status: 'PENDING' } });

    await expect(trackingService.startOrResumeMonitoring({
      studentId: 'student-1',
      routeId: 'route-1',
    }, { childToken: 'device-token' })).resolves.toEqual({
      trip: { id: 'monitor-1', status: 'PENDING' },
      created: true,
    });
    expect(api.post).toHaveBeenCalledWith('/trips/monitoring', expect.objectContaining({
      studentId: 'student-1',
      routeId: 'route-1',
    }), { skipAuth: true, headers: { Authorization: 'Bearer device-token' } });
  });

  it('reuses a pending or active monitoring trip', async () => {
    api.get.mockResolvedValue({ data: { id: 'monitor-existing', status: 'PENDING' } });
    await expect(trackingService.startOrResumeMonitoring({ studentId: 'student-1' }))
      .resolves.toEqual({ trip: { id: 'monitor-existing', status: 'PENDING' }, created: false });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('removes a trip from the remote history', async () => {
    api.delete.mockResolvedValue({ status: 204 });
    await expect(trackingService.deleteTrip('trip-7')).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/trips/trip-7');
  });
});
