/* global describe, test, expect, jest */
import { collectPages } from './pagination';
describe('complete paginated data', () => {
  test('loads later GPS pages including the latest coordinate', async () => {
    const fetchPage = jest.fn(async page => ({items: [page * 100 + 1], totalPages: 3, last: page === 2}));
    expect(await collectPages(fetchPage)).toEqual([1, 101, 201]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
  test('supports legacy arrays and empty results', async () => {
    expect(await collectPages(async () => [1])).toEqual([1]);
    expect(await collectPages(async () => ({items: [], totalPages: 0}))).toEqual([]);
  });
  test('reports failure instead of showing an incomplete route as current', async () => {
    await expect(collectPages(async page => {
      if (page === 1) throw new Error('Network');
      return {items: [1], totalPages: 2};
    })).rejects.toThrow('Network');
  });
});
