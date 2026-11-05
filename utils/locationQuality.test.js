import { describe, it, expect } from '@jest/globals';
import { filterLocation, journeyPoints } from './locationQuality';

const fix = (meters, seconds, accuracy = 5) => ({ latitude: meters / 111195,
  longitude: 0, accuracy, recordedAt: new Date(1700000000000 + seconds * 1000).toISOString() });

describe('GPS quality and displacement', () => {
  it('refreshes stationary availability without drawing jitter', () => {
    let last = filterLocation(fix(0, 0)).last;
    const points = [last];
    for (const [meters, seconds] of [[4, 30], [-3, 60], [6, 90]]) {
      const result = filterLocation(fix(meters, seconds), last);
      points.push(result.coordinate);
      last = result.last;
    }
    expect(last.latitude).toBe(0);
    expect(last.recordedAt).toBe(fix(6, 90).recordedAt);
    expect(last.stoppedSeconds).toBe(90);
    expect(journeyPoints(points)).toHaveLength(1);
  });

  it('detects gradual walking against the anchor, including less than 100 metres', () => {
    let last = filterLocation(fix(0, 0)).last;
    const accepted = [];
    for (let seconds = 5; seconds <= 40; seconds += 5) {
      const result = filterLocation(fix(seconds, seconds), last);
      last = result.last;
      if (result.coordinate) accepted.push(result.coordinate);
    }
    expect(accepted.length).toBeGreaterThan(0);
    expect(accepted.at(-1).latitude * 111195).toBeGreaterThanOrEqual(30);
    expect(accepted.at(-1).stoppedSeconds).toBe(0);
  });

  it('rejects a one-off jump that returns to the stationary anchor', () => {
    let last = filterLocation(fix(0, 0)).last;
    const jump = filterLocation(fix(250, 5), last);
    expect(jump.coordinate).toBeUndefined();
    const returned = filterLocation(fix(2, 30), jump.last);
    expect(returned.coordinate.latitude).toBe(last.latitude);
  });

  it('does not refresh availability with invalid, inaccurate or old fixes', () => {
    const last = filterLocation(fix(0, 30)).last;
    for (const input of [fix(0, 10), fix(0, 30), fix(0, 60, 200), fix(0, 60, null)]) {
      expect(filterLocation(input, last)).toEqual({ last });
    }
  });
});
