import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import api from './api';
import { studentService } from './student.service';

jest.mock('./api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('studentService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests a new link code from the backend instead of deriving it locally', async () => {
    api.post.mockResolvedValue({ data: { code: 'ABCD2345EFGH6789', expiresAt: '2030-01-01T00:15:00Z' } });

    await expect(studentService.issueLinkCode('student-1')).resolves.toEqual({
      code: 'ABCD2345EFGH6789',
      expiresAt: '2030-01-01T00:15:00Z',
    });
    expect(api.post).toHaveBeenCalledWith('/students/student-1/link-code');
  });

  it('sends the student identifier with device linking when available', async () => {
    api.post.mockResolvedValue({ data: { deviceToken: 'token' } });

    await studentService.linkDevice({
      studentId: 'student-1',
      code: 'ABCD2345EFGH6789',
      deviceIdentifier: 'device-1',
    });

    expect(api.post).toHaveBeenCalledWith(
      '/students/link-device',
      expect.objectContaining({ studentId: 'student-1', code: 'ABCD2345EFGH6789' }),
      { skipAuth: true },
    );
  });
});
