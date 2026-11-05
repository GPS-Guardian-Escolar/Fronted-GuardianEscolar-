import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from './api';
import { storage } from '../utils/storage';
import { authService } from './auth.service';

jest.mock('./api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../utils/storage', () => ({
  storage: {
    setToken: jest.fn(),
    setUser: jest.fn(),
  },
}));

jest.mock('../utils/deviceIdentity', () => ({
  getAuthDeviceInfo: jest.fn().mockResolvedValue({ deviceIdentifier: 'test-device' }),
}));

describe('authService registration session handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not store the API token before the user verifies their email and signs in', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'pending-registration-token',
        user: { id: 'user-1', email: 'parent@example.com', emailVerified: false },
        message: 'Verification email sent.',
      },
    });

    await expect(authService.register({
      name: 'Parent Name',
      email: 'parent@example.com',
      password: 'StrongPassword1!',
      phone: '3001234567',
      acceptedTerms: true,
      termsVersion: 'test-v1',
    })).resolves.toEqual({ success: true, message: 'Verification email sent.' });

    expect(storage.setToken).not.toHaveBeenCalled();
    expect(storage.setUser).not.toHaveBeenCalled();
  });
});
