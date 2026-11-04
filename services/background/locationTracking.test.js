import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackingService } from '../tracking.service';
import { getChildSession, replaceChildSession, saveChildSession, startBackgroundUpdates, stopBackgroundUpdates, isTrackingActive, getTrackingError } from './locationTracking';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-location', () => ({}));
jest.mock('expo-notifications', () => ({}));
jest.mock('expo-secure-store', () => ({}));
jest.mock('expo-task-manager', () => ({}));
jest.mock('../tracking.service', () => ({ trackingService: { addCoordinate: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map();
  return {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); },
    clear: async () => values.clear(),
  };
});

describe('web tracking recovery and delivery', () => {
  let success;
  let failure;
  const position = () => ({ coords: { latitude: 4.6, longitude: -74.1, accuracy: 10 }, timestamp: Date.now() });

  beforeEach(async () => {
    // Fake timers inspect globals; avoid loading Expo's native fetch getter in
    // this browser-only test. HTTP is mocked through trackingService below.
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: jest.fn() });
    jest.useFakeTimers();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    trackingService.addCoordinate.mockResolvedValue({});
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
      geolocation: {
        getCurrentPosition: jest.fn(callback => callback(position())),
        watchPosition: jest.fn((onSuccess, onError) => { success = onSuccess; failure = onError; return 1; }),
        clearWatch: jest.fn(),
      },
    } });
    await saveChildSession({ studentId: 'student', childToken: 'child-token' });
  });

  afterEach(async () => {
    await stopBackgroundUpdates();
    jest.useRealTimers();
  });

  it('sends a real initial coordinate before waiting for a watch update', async () => {
    await startBackgroundUpdates('server-trip');
    expect(trackingService.addCoordinate).toHaveBeenCalledWith('server-trip',
      expect.objectContaining({ latitude: 4.6, longitude: -74.1 }), { childToken: 'child-token' });
    expect(await isTrackingActive()).toBe(true);
  });

  it('sends a fresh GPS heartbeat while stationary', async () => {
    await startBackgroundUpdates('server-trip');
    await jest.advanceTimersByTimeAsync(30000);
    expect(trackingService.addCoordinate).toHaveBeenCalledTimes(2);
    const calls = trackingService.addCoordinate.mock.calls;
    expect(Date.parse(calls[1][1].recordedAt) - Date.parse(calls[0][1].recordedAt)).toBe(30000);
  });

  it('reports a GPS permission failure and recovers on a valid position', async () => {
    await startBackgroundUpdates('server-trip');
    failure({ code: 1 });
    expect(await isTrackingActive()).toBe(false);
    expect(getTrackingError()).toContain('permission');
    await success(position());
    expect(await isTrackingActive()).toBe(true);
    expect(getTrackingError()).toBe('');
  });

  it('ignores late callbacks after finishing the trip', async () => {
    await startBackgroundUpdates('server-trip');
    await stopBackgroundUpdates();
    await success(position());
    await jest.advanceTimersByTimeAsync(30000);
    expect(await isTrackingActive()).toBe(false);
    expect(trackingService.addCoordinate).toHaveBeenCalledTimes(1);
    expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(1);
  });

  it('clears an old trip and queued tracking state when a new QR link replaces the child session', async () => {
    await startBackgroundUpdates('old-trip');
    await replaceChildSession({ studentId: 'next-student', childToken: 'next-token', code: 'next-code' });

    await expect(isTrackingActive()).resolves.toBe(false);
    await expect(getChildSession()).resolves.toEqual(expect.objectContaining({
      studentId: 'next-student', childToken: 'next-token', studentCode: 'next-code', activeTripId: null,
    }));
  });
});
