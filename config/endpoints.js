import Constants from 'expo-constants';
import { Platform } from 'react-native';

const apiPort = process.env.EXPO_PUBLIC_API_PORT || '8080';
const frontendPort = process.env.EXPO_PUBLIC_FRONTEND_PORT || '8081';

function isLocalHost(host) {
  return !host || host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function hostFromUri(value) {
  if (!value) return '';
  return value.match(/^(?:(?:https?|exp):\/\/)?([^/:]+)(?::\d+)?/i)?.[1] || '';
}

function isLanHost(host) {
  return /^(10|172\.(1[6-9]|2\d|3[0-1])|192\.168)\.\d{1,3}\.\d{1,3}$/.test(host);
}

function browserHost() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return window.location.hostname || '';
}

function browserOrigin() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return window.location.origin || '';
}

function browserPort() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
  return window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
}

function expoHost() {
  if (Platform.OS === 'web') return '';
  return hostFromUri(
    Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest?.hostUri ||
      ''
  );
}

function runtimeHost() {
  const host = browserHost() || expoHost();
  if (isLocalHost(host)) return '';
  return isLanHost(host) ? host : '';
}

function isRemoteConfiguredUrl(value) {
  if (value?.startsWith('/')) return true;
  const host = hostFromUri(value);
  return host && !isLocalHost(host);
}

function normalizeApiUrl(value) {
  if (!value || value.startsWith('/')) return value
  const normalized = value.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}
function isTunnelHost(host) {
  return /\.devtunnels\.ms$/i.test(host) || /\.trycloudflare\.com$/i.test(host);
}

function resolveApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  const currentBrowserHost = browserHost();
  if (configuredUrl?.startsWith('/')) {
    // A public Docker frontend tunnel keeps the same-origin API proxy.
    if (Platform.OS === 'web' && isTunnelHost(currentBrowserHost)) {
      return configuredUrl;
    }
    // Docker/Nginx exposes the API through the same origin on port 8081.
    // Expo web (8082) and native development builds must reach Spring Boot directly.
    if (Platform.OS === 'web' && browserPort() === frontendPort) {
      return configuredUrl;
    }
    const host = runtimeHost() || currentBrowserHost || 'localhost';
    if (host) {
      return `http://${host}:${apiPort}/api`;
    }
    return configuredUrl;
  }
  if (isRemoteConfiguredUrl(configuredUrl) && !configuredUrl.startsWith('/')) {
    return normalizeApiUrl(configuredUrl);
  }
  if (isTunnelHost(currentBrowserHost)) {
    return '/api';
  }
  const host = runtimeHost();
  if (host) {
    return `http://${host}:${apiPort}/api`;
  }
  if (isRemoteConfiguredUrl(configuredUrl)) {
    return normalizeApiUrl(configuredUrl);
  }
  return normalizeApiUrl(configuredUrl || `http://localhost:${apiPort}`);
}

function resolveWsUrl(apiUrl) {
  const configuredUrl = process.env.EXPO_PUBLIC_WS_URL;
  const origin = browserOrigin();
  const currentBrowserHost = browserHost();
  if (configuredUrl?.startsWith('/')) {
    if (Platform.OS === 'web' && browserPort() === frontendPort) {
      return configuredUrl;
    }
    if (apiUrl.startsWith('http')) {
      return apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '/ws');
    }
    const host = runtimeHost() || currentBrowserHost || 'localhost';
    if (host) {
      return `ws://${host}:${apiPort}/ws`;
    }
    return configuredUrl;
  }
  if (apiUrl.startsWith('/') && origin) {
    return `${origin.replace(/^http/, 'ws')}/ws`;
  }
  if (isTunnelHost(currentBrowserHost) && origin) {
    return `${origin.replace(/^http/, 'ws')}/ws`;
  }
  if (isRemoteConfiguredUrl(configuredUrl)) {
    return configuredUrl;
  }
  const host = runtimeHost();
  if (host) {
    return `ws://${host}:${apiPort}/ws`;
  }
  return configuredUrl || apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '/ws');
}

function resolveStudentLinkBaseUrl(apiUrl) {
  const configuredUrl = process.env.EXPO_PUBLIC_STUDENT_LINK_BASE_URL;
  const origin = browserOrigin();
  const currentBrowserHost = browserHost();
  // QR links must point to the public frontend origin, never to the API
  // tunnel with a manually appended local frontend port.
  if (Platform.OS === 'web' && origin && currentBrowserHost && !isLocalHost(currentBrowserHost)) {
    return origin;
  }
  if (configuredUrl?.startsWith('/')) {
    return configuredUrl;
  }
  if (isTunnelHost(currentBrowserHost) && origin) {
    return origin;
  }
  // Expo Go must use the currently running public project host. A QR code
  // built from localhost or an old tunnel opens a gateway error on mobile.
  if (Platform.OS !== 'web') {
    const nativeProjectHost = expoHost();
    if (nativeProjectHost && (/\.on\.expo\.app$|\.exp\.direct$|\.devtunnels\.ms$/i.test(nativeProjectHost))) {
      return `https://${nativeProjectHost}`;
    }
  }
  if (isRemoteConfiguredUrl(configuredUrl)) {
    return configuredUrl;
  }
  const host = runtimeHost() || hostFromUri(apiUrl);
  if (host && !isLocalHost(host)) {
    return `http://${host}:${frontendPort}`;
  }
  return configuredUrl || `http://localhost:${frontendPort}`;
}

const rawApiUrl = resolveApiUrl();
const rawWsUrl = resolveWsUrl(rawApiUrl);
const rawStudentLinkBaseUrl = resolveStudentLinkBaseUrl(rawApiUrl);

export const BASE_URL = rawApiUrl.replace(/\/$/, '');
export const WS_URL = rawWsUrl.replace(/\/$/, '');
export const STUDENT_LINK_BASE_URL = rawStudentLinkBaseUrl.replace(/\/$/, '');

export const ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  VERIFY_EMAIL: '/auth/verify-email',
  FORGOT_PASSWORD: '/auth/password/forgot',
  RESET_PASSWORD: '/auth/password/reset',
  ME: '/auth/me',
  PROFILE: '/auth/profile',
  EMAIL: '/auth/email',
  PASSWORD: '/auth/password',

  STUDENTS: '/students',
  STUDENT_BY_ID: (id) => `/students/${id}`,
  STUDENT_ROUTES: (studentId, routeId) => `/students/${studentId}/routes/${routeId}`,
  EMERGENCY_CONTACTS: (studentId) => `/students/${studentId}/emergency-contacts`,
  EMERGENCY_CONTACT_BY_ID: (studentId, contactId) => `/students/${studentId}/emergency-contacts/${contactId}`,

  ROUTES: '/routes',
  ROUTE_BY_ID: (id) => `/routes/${id}`,
  ROUTE_STOPS: (routeId) => `/routes/${routeId}/stops`,

  SAFE_ZONES: '/safe-zones',
  SAFE_ZONE_BY_ID: (id) => `/safe-zones/${id}`,

  TRIPS: '/trips',
  TRIP_BY_ID: (id) => `/trips/${id}`,
  TRIP_STATUS: (id) => `/trips/${id}/status`,
  TRIP_COORDINATES: (id) => `/trips/${id}/coordinates`,

  NOTIFICATIONS: '/notifications',
  MARK_READ: (id) => `/notifications/${id}/read`,

  DEVICES: '/devices',
  DEVICE_BY_ID: (id) => `/devices/${id}`,

  SOCKET_URL: WS_URL,
  SOCKET_TOPIC: (tripId) => `/topic/trips/${tripId}/coordinates`,
};




