import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../utils/storage', () => ({ storage: { clearAll: jest.fn(), getToken: jest.fn() } }));
jest.mock('../utils/authEvents', () => ({ emitAuthExpired: jest.fn(), emitPermissionDenied: jest.fn() }));

import { storage } from '../utils/storage';
import * as authEvents from '../utils/authEvents';
import { handleResponseError } from './api';

const mockClearAll = storage.clearAll;
const mockExpired = authEvents.emitAuthExpired;
const mockDenied = authEvents.emitPermissionDenied;

describe('api response authorization', () => {
  beforeEach(() => {
    mockClearAll.mockClear();
    mockExpired.mockClear();
    mockDenied.mockClear();
  });

  it('clears the session on 401', async () => {
    const error = { response: { status: 401 }, config: { url: '/students' } };
    await expect(handleResponseError(error)).rejects.toBe(error);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(mockExpired).toHaveBeenCalledTimes(1);
    expect(mockDenied).not.toHaveBeenCalled();
  });

  it('keeps the session and emits permission denied on 403', async () => {
    const error = { response: { status: 403, data: { message: 'Forbidden' } }, config: { url: '/students' } };
    await expect(handleResponseError(error)).rejects.toBe(error);
    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockExpired).not.toHaveBeenCalled();
    expect(mockDenied).toHaveBeenCalledWith({ message: 'Forbidden', url: '/students' });
  });
});
