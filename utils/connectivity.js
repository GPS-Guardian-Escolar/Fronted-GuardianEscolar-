export function monitorConnection({ fetchFn, onStatus, isWeb, windowRef, navigatorRef, intervalMs = 15000, timeoutMs = 5000 }) {
  let stopped = false;
  let sequence = 0;
  let controller;

  const check = async () => {
    const requestSequence = ++sequence;
    controller?.abort();
    if (navigatorRef?.onLine === false) {
      onStatus(false);
      return;
    }
    const requestController = new AbortController();
    controller = requestController;
    const timeout = setTimeout(() => requestController.abort(), timeoutMs);
    try {
      const response = await fetchFn(
        isWeb ? 'https://captive.apple.com/generate_204' : 'https://connectivitycheck.gstatic.com/generate_204',
        { method: 'GET', signal: requestController.signal, ...(isWeb ? { mode: 'no-cors' } : {}) },
      );
      if (!stopped && sequence === requestSequence) onStatus(response.type === 'opaque' || response.ok);
    } catch {
      if (!stopped && sequence === requestSequence) onStatus(false);
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleNetworkChange = () => {
    if (navigatorRef?.onLine !== false) onStatus(null);
    check();
  };
  check();
  const interval = setInterval(check, intervalMs);
  windowRef?.addEventListener('online', handleNetworkChange);
  windowRef?.addEventListener('offline', handleNetworkChange);
  return () => {
    stopped = true;
    sequence += 1;
    controller?.abort();
    clearInterval(interval);
    windowRef?.removeEventListener('online', handleNetworkChange);
    windowRef?.removeEventListener('offline', handleNetworkChange);
  };
}
