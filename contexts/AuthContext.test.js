import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/auth.service';
import { notificationService } from '../services/notification.service';

jest.mock('../services/auth.service', () => ({ authService: { login: jest.fn() } }));
jest.mock('../services/notification.service', () => ({ notificationService: { registerPushDevice: jest.fn() } }));
jest.mock('../utils/authEvents', () => ({ subscribeAuthExpired: jest.fn(() => () => {}) }));
jest.mock('../utils/storage', () => ({
  storage: { getToken: jest.fn(), getUser: jest.fn(), clearAll: jest.fn() },
}));

describe('AuthProvider login', () => {
  let auth;
  function Observer() { auth = useAuth(); return null; }

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService.registerPushDevice.mockResolvedValue(undefined);
  });

  it('keeps the user signed out while a new device awaits email confirmation', async () => {
    authService.login.mockResolvedValue({ requiresDeviceConfirmation: true });
    let tree;
    await act(async () => { tree = create(<AuthProvider><Observer /></AuthProvider>); });
    let result;
    await act(async () => { result = await auth.login('parent@example.com', 'password'); });
    expect(result.requiresDeviceConfirmation).toBe(true);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.token).toBeNull();
    expect(auth.user).toBeNull();
    expect(notificationService.registerPushDevice).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
  });

  it('authenticates and registers push only after a successful login', async () => {
    authService.login.mockResolvedValue({ token: 'test-token', user: { id: 'user-1' } });
    let tree;
    await act(async () => { tree = create(<AuthProvider><Observer /></AuthProvider>); });
    await act(async () => { await auth.login('parent@example.com', 'password'); });
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.token).toBe('test-token');
    expect(auth.user.id).toBe('user-1');
    expect(notificationService.registerPushDevice).toHaveBeenCalledTimes(1);
    await act(async () => tree.unmount());
  });
});
