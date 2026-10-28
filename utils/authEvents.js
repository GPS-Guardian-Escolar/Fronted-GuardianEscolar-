const listeners = new Set();
const AUTH_EXPIRED_KEY = 'gps_guardian_auth_expired_event';

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_EXPIRED_KEY && event.newValue) {
      listeners.forEach((listener) => listener());
    }
  });
}

export const subscribeAuthExpired = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitAuthExpired = () => {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(AUTH_EXPIRED_KEY, `${Date.now()}-${Math.random()}`);
    } catch {}
  }
};
