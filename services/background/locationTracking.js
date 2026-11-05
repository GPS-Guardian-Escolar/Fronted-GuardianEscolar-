import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { trackingService } from '../tracking.service';
import { lightColors } from '../../theme/tokens';
import { filterLocation } from '../../utils/locationQuality';

export const LOCATION_TASK_NAME = 'gps-guardian-background-location';
export const CHILD_TOKEN_KEY = 'guardian_child_token';
export const CHILD_STUDENT_ID_KEY = 'guardian_child_student_id';
export const CHILD_CODE_KEY = 'guardian_child_code';
export const ACTIVE_TRIP_ID_KEY = 'guardian_active_trip_id';

const QUEUE_KEY = '@guardian_location_queue';
const LAST_COORD_KEY = '@guardian_last_location_coord';
const MAX_FLUSH_ATTEMPTS = 3;
let webWatchId = null;
let webTracking = false;
let webPollTimer = null;
let webPollBusy = false;
let webTrackingError = '';
let webGeneration = 0;
let nativeStartPromise = null;
let queueOperation = Promise.resolve();

function withQueueLock(operation) {
  const result = queueOperation.then(operation);
  queueOperation = result.catch(() => undefined);
  return result;
}

function canUseSecureStore() {
  return Platform.OS !== 'web';
}

async function setStoredValue(key, value) {
  const normalized = String(value || '');
  if (canUseSecureStore()) {
    await SecureStore.setItemAsync(key, normalized);
    return;
  }
  await AsyncStorage.setItem(key, normalized);
}

async function getStoredValue(key) {
  if (canUseSecureStore()) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function removeStoredValue(key) {
  if (canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

function normalizeCoordinate(location) {
  const coords = location.coords || {};
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    heading: coords.heading,
    recordedAt: new Date(location.timestamp || Date.now()).toISOString(),
  };
}

function isValidCoordinate(coord) {
  return Number.isFinite(coord.latitude) && Math.abs(coord.latitude) <= 90
    && Number.isFinite(coord.longitude) && Math.abs(coord.longitude) <= 180;
}

async function getLastCoordinate() {
  const value = await AsyncStorage.getItem(LAST_COORD_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readQueue() {
  const value = await AsyncStorage.getItem(QUEUE_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function saveChildSession({ childToken, studentId, code }) {
  const entries = [];
  if (childToken) entries.push(setStoredValue(CHILD_TOKEN_KEY, childToken));
  if (studentId) entries.push(setStoredValue(CHILD_STUDENT_ID_KEY, studentId));
  if (code) entries.push(setStoredValue(CHILD_CODE_KEY, code));
  await Promise.all(entries);
}

// A QR link can belong to a different student than the previous browser
// session. Clear the old trip and queued coordinates before storing it.
export async function replaceChildSession({ childToken, studentId, code }) {
  await stopBackgroundUpdates();
  await Promise.all([
    removeStoredValue(ACTIVE_TRIP_ID_KEY),
    AsyncStorage.removeItem(QUEUE_KEY),
    AsyncStorage.removeItem(LAST_COORD_KEY),
  ]);
  await saveChildSession({ childToken, studentId, code });
}

export async function getChildSession() {
  const [childToken, studentId, studentCode, activeTripId] = await Promise.all([
    getStoredValue(CHILD_TOKEN_KEY),
    getStoredValue(CHILD_STUDENT_ID_KEY),
    getStoredValue(CHILD_CODE_KEY),
    getStoredValue(ACTIVE_TRIP_ID_KEY),
  ]);
  return { childToken, studentId, studentCode, activeTripId };
}

export async function clearChildSession() {
  await stopBackgroundUpdates();
  await Promise.all([
    removeStoredValue(CHILD_TOKEN_KEY),
    removeStoredValue(CHILD_STUDENT_ID_KEY),
    removeStoredValue(CHILD_CODE_KEY),
    AsyncStorage.removeItem(QUEUE_KEY),
    AsyncStorage.removeItem(LAST_COORD_KEY),
  ]);
}
export async function handleLocationTask({ data, error }) {
  if (error) {
    console.warn('Error en rastreo en segundo plano:', error);
    return;
  }

  const locations = data?.locations || [];
  for (const location of locations) {
    const coord = normalizeCoordinate(location);
    if (isValidCoordinate(coord)) {
      await enqueueCoordinate(coord);
    }
  }

  await flushQueue();
}

export async function requestPermissions() {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { granted: false, reason: 'Este navegador no permite acceder a la ubicación.' };
    }

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        position => resolve({ granted: true, reason: '', position }),
        error => resolve({
          granted: false,
          reason: error?.code === 1
            ? 'Permite la ubicación para este sitio desde los ajustes de Chrome.'
            : 'No se pudo obtener la ubicación. Activa el GPS y vuelve a intentarlo.',
        }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return { granted: false, reason: 'Activa la ubicación/GPS del teléfono y vuelve a pulsar Reintentar.' };
    }

    let foreground = await Location.getForegroundPermissionsAsync();
    if (!foreground.granted) foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) {
      return { granted: false, reason: 'Permite la ubicación mientras usas la app. En Ajustes > Permisos > Ubicación selecciona "Permitir siempre".' };
    }

    let background = await Location.getBackgroundPermissionsAsync();
    if (!background.granted) background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) {
      return { granted: false, reason: 'La ubicación en segundo plano no está habilitada. En Ajustes > Aplicaciones > GPS Guardian Escolar > Permisos > Ubicación, selecciona "Permitir siempre".' };
    }

    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      let notification = await Notifications.getPermissionsAsync();
      if (notification.status !== 'granted') notification = await Notifications.requestPermissionsAsync();
      if (notification.status !== 'granted') {
        return { granted: false, reason: 'Permite las notificaciones para mantener activo el servicio de ubicación en segundo plano.' };
      }
    }

    return { granted: true, reason: '' };
  } catch (error) {
    return { granted: false, reason: `No se pudieron comprobar los permisos de ubicación: ${error?.message || 'abre Ajustes del sistema y vuelve a intentarlo.'}` };
  }
}
export async function isTrackingActive() {
  if (Platform.OS === 'web') return webTracking;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export function getTrackingError() {
  return webTrackingError;
}

export async function startBackgroundUpdates(tripId) {
  const previousTripId = await getStoredValue(ACTIVE_TRIP_ID_KEY);
  if (previousTripId !== String(tripId)) {
    await writeQueue([]);
    await AsyncStorage.removeItem(LAST_COORD_KEY);
  }

  if (Platform.OS === 'web') {
    const permission = await requestPermissions();
    if (!permission.granted) throw new Error(permission.reason);

    await setStoredValue(ACTIVE_TRIP_ID_KEY, tripId);
    webTrackingError = '';
    if (permission.position) {
      await enqueueCoordinate(normalizeCoordinate(permission.position));
      await flushQueue();
    }
    webTracking = true;
    if (webWatchId !== null) return;

    const generation = ++webGeneration;
    const acceptPosition = async position => {
      if (generation !== webGeneration) return;
      try {
        const coord = normalizeCoordinate(position);
        if (!isValidCoordinate(coord)) return;
        webTracking = true;
        webTrackingError = '';
        await enqueueCoordinate(coord);
        await flushQueue();
      } catch (error) {
        console.warn('Location delivery failed:', error);
      }
    };
    const rejectPosition = error => {
      if (generation !== webGeneration) return;
      webTracking = false;
      webTrackingError = error?.code === 1 ? 'Location permission denied' : 'GPS unavailable';
    };
    webWatchId = navigator.geolocation.watchPosition(
      acceptPosition,
      rejectPosition,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    // Browsers may omit watch callbacks while stationary. Refresh a real GPS
    // fix periodically so the guardian can distinguish stationary from offline.
    webPollTimer = setInterval(() => {
      if (webPollBusy) return;
      webPollBusy = true;
      navigator.geolocation.getCurrentPosition(
        position => { webPollBusy = false; void acceptPosition(position); },
        error => { webPollBusy = false; rejectPosition(error); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
      );
    }, 15000);
    return;
  }

  if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
    throw new Error('La tarea de ubicación no está registrada. Cierra y vuelve a abrir el APK actualizado.');
  }

  const permission = await requestPermissions();
  if (!permission.granted) throw new Error(permission.reason);

  await setStoredValue(ACTIVE_TRIP_ID_KEY, tripId);
  const active = await isTrackingActive();
  if (active) return;

  if (nativeStartPromise) return nativeStartPromise;
  nativeStartPromise = (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('guardian-location', {
        name: 'Seguimiento de ubicación',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250],
        lightColor: lightColors.primary,
      });
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 0,
      timeInterval: 5000,
      deferredUpdatesInterval: 5000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Compartiendo ubicación',
        notificationBody: 'Tu acudiente está viendo tu trayecto',
        notificationColor: lightColors.primary,
        killServiceOnDestroy: false,
      },
    });
  })();

  try {
    await nativeStartPromise;
  } finally {
    nativeStartPromise = null;
  }
}

export async function stopBackgroundUpdates({ preserveTrip = false } = {}) {
  if (Platform.OS === 'web') {
    webGeneration += 1;
    if (webWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchId);
    }
    webWatchId = null;
    webTracking = false;
    webTrackingError = '';
    if (webPollTimer !== null) clearInterval(webPollTimer);
    webPollTimer = null;
    webPollBusy = false;
  } else {
    const active = await isTrackingActive();
    if (active) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }
  if (!preserveTrip) await removeStoredValue(ACTIVE_TRIP_ID_KEY);
}

export function enqueueCoordinate(coord) {
  return withQueueLock(() => enqueueCoordinateUnlocked(coord));
}

async function enqueueCoordinateUnlocked(coord) {
  if (!isValidCoordinate(coord)) return;
  const last = await getLastCoordinate();
  const result = filterLocation(coord, last);
  if (result.last) await AsyncStorage.setItem(LAST_COORD_KEY, JSON.stringify(result.last));
  if (!result.coordinate) return;
  coord = result.coordinate;

  const queue = await readQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, coord });
  await writeQueue(queue.slice(-500));
}

export function flushQueue() {
  return withQueueLock(flushQueueUnlocked);
}

async function flushQueueUnlocked() {
  let queue = await readQueue();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  const { activeTripId, childToken } = await getChildSession();
  if (!activeTripId) return { sent: 0, remaining: queue.length };

  let sent = 0;
  let attempts = 0;

  while (queue.length > 0 && attempts < MAX_FLUSH_ATTEMPTS) {
    const item = queue[0];
    try {
      await trackingService.addCoordinate(activeTripId, item.coord, { childToken });
      queue = queue.slice(1);
      sent += 1;
      attempts = 0;
      await writeQueue(queue);
    } catch {
      attempts += 1;
      if (attempts < MAX_FLUSH_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 500 * (2 ** (attempts - 1))));
      }
    }
  }

  await writeQueue(queue);
  return { sent, remaining: queue.length };
}

export async function getQueueSize() {
  const queue = await readQueue();
  return queue.length;
}

export async function getActiveTripId() {
  return getStoredValue(ACTIVE_TRIP_ID_KEY);
}

export function isLocationTaskDefined() {
  return TaskManager.isTaskDefined(LOCATION_TASK_NAME);
}



