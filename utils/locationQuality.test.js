import { describe, it, expect } from '@jest/globals';
import { filterLocation, journeyPoints, shouldDrawJourneyPath } from './locationQuality';

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
    expect(journeyPoints(points)).toHaveLength(0);
  });

  it('does not draw a legacy path made of stationary GPS drift', () => {
    const points = [fix(0, 0), fix(12, 5), fix(-8, 10), fix(18, 15), fix(4, 20)];
    const path = journeyPoints(points);
    expect(path).toHaveLength(0);
    expect(shouldDrawJourneyPath(true, path)).toBe(false);
  });

  it('draws the path only after consecutive fixes confirm real displacement', () => {
    const points = [fix(0, 0), fix(20, 5), fix(35, 10), fix(43, 15), fix(65, 20)];
    const path = journeyPoints(points);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual(points[2]);
    expect(shouldDrawJourneyPath(true, path)).toBe(true);
  });

  it('does not draw a line when the GPS jumps away and then returns', () => {
    const points = [fix(0, 0), fix(20, 5), fix(35, 10), fix(43, 15), fix(12, 20)];
    expect(journeyPoints(points)).toHaveLength(0);
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
    for (const input of [fix(0, 10), fix(0, 30), fix(0, 60, 51), fix(0, 60, 200), fix(0, 60, null)]) {
      expect(filterLocation(input, last)).toEqual({ last });
    }
  });

  it('keeps the confirmed path available while the phone is stationary', () => {
    const points = [fix(0, 0), fix(35, 5), fix(43, 10), fix(43, 40, 30)];
    const path = journeyPoints(points);
    expect(shouldDrawJourneyPath(true, path)).toBe(true);
    expect(shouldDrawJourneyPath(false, path)).toBe(false);
  });
});
