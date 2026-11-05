import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { monitorConnection } from './connectivity';

let listeners;
let navigatorRef;
let windowRef;
let onStatus;
beforeEach(() => {
  jest.useFakeTimers();
  listeners = {};
  navigatorRef = { onLine: true };
  windowRef = {
    addEventListener: (name, handler) => { listeners[name] = handler; },
    removeEventListener: (name, handler) => { if (listeners[name] === handler) delete listeners[name]; },
  };
  onStatus = jest.fn();
});
afterEach(() => jest.useRealTimers());

test('detects connection and then immediately reports the guardian device offline', async () => {
  const fetchFn = jest.fn().mockResolvedValue({ type: 'opaque', ok: false });
  const stop = monitorConnection({ fetchFn, onStatus, isWeb: true, windowRef, navigatorRef });
  await Promise.resolve();
  expect(onStatus).toHaveBeenLastCalledWith(true);
  navigatorRef.onLine = false;
  listeners.offline();
  expect(onStatus).toHaveBeenLastCalledWith(false);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  stop();
  expect(listeners).toEqual({});
});

test('ignores an earlier success after the guardian device loses connection', async () => {
  let resolveFetch;
  const fetchFn = jest.fn(() => new Promise(resolve => { resolveFetch = resolve; }));
  const stop = monitorConnection({ fetchFn, onStatus, isWeb: true, windowRef, navigatorRef });
  navigatorRef.onLine = false;
  listeners.offline();
  resolveFetch({ ok: true });
  await Promise.resolve();
  expect(onStatus).toHaveBeenLastCalledWith(false);
  stop();
});

test('checks again when the guardian device reconnects', async () => {
  navigatorRef.onLine = false;
  const fetchFn = jest.fn().mockResolvedValue({ ok: true });
  const stop = monitorConnection({ fetchFn, onStatus, isWeb: true, windowRef, navigatorRef });
  expect(onStatus).toHaveBeenLastCalledWith(false);
  navigatorRef.onLine = true;
  listeners.online();
  expect(onStatus).toHaveBeenLastCalledWith(null);
  await Promise.resolve();
  expect(onStatus).toHaveBeenLastCalledWith(true);
  stop();
});
test('reports an unreachable connection check after the timeout', async () => {
  const fetchFn = jest.fn((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('timeout')));
  }));
  const stop = monitorConnection({ fetchFn, onStatus, isWeb: true, windowRef, navigatorRef });
  jest.advanceTimersByTime(5000);
  await Promise.resolve();
  expect(onStatus).toHaveBeenLastCalledWith(false);
  stop();
});
