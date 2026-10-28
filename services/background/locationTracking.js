import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { trackingService } from '../tracking.service';
import { lightColors } from '../../theme/tokens';

export const LOCATION_TASK_NAME = 'gps-guardian-background-location';
export const CHILD_TOKEN_KEY = 'guardian_child_token';
export const CHILD_STUDENT_ID_KEY = 'guardian_child_student_id';
export const CHILD_CODE_KEY = 'guardian_child_code';
export const ACTIVE_TRIP_ID_KEY = 'guardian_active_trip_id';

const QUEUE_KEY = '@guardian_location_queue';
const LAST_COORD_KEY = '@guardian_last_location_coord';
const MAX_FLUSH_ATTEMPTS = 3;
const MIN_DISTANCE_METERS = 25;
const MAX_ACCURACY_METERS = 80;
const MAX_SINGLE_JUMP_METERS = 1000;

let webWatchId = null;
let webTracking = false;
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

function isReliableCoordinate(coord, previous) {
  if (Number.isFinite(coord.accuracy) && coord.accuracy > MAX_ACCURACY_METERS) return false;
  if (!previous) return true;

  const jump = distanceMeters(previous, coord);
  const elapsedSeconds = Math.max(
    1,
    (Date.parse(coord.recordedAt) - Date.parse(previous.recordedAt)) / 1000,
  );
  return jump <= MAX_SINGLE_JUMP_METERS || jump / elapsedSeconds <= 30;
}

function distanceMeters(from, to) {
  if (!from || !to) return Number.POSITIVE_INFINITY;
  const earthRadius = 6371000;
  const toRadians = value => (value * Math.PI) / 180;
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
        () => resolve({ granted: true, reason: '' }),
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

export async function startBackgroundUpdates(tripId) {
  const previousTripId = await getStoredValue(ACTIVE_TRIP_ID_KEY);
  if (previousTripId && previousTripId !== String(tripId)) {
    await writeQueue([]);
    await AsyncStorage.removeItem(LAST_COORD_KEY);
  }

  if (Platform.OS === 'web') {
    const permission = await requestPermissions();
    if (!permission.granted) throw new Error(permission.reason);

    await setStoredValue(ACTIVE_TRIP_ID_KEY, tripId);
    if (webWatchId !== null) return;

    webTracking = true;
    webWatchId = navigator.geolocation.watchPosition(
      async position => {
        const coord = normalizeCoordinate(position);
        if (!isValidCoordinate(coord)) return;
        await enqueueCoordinate(coord);
        await flushQueue();
      },
      error => {
        console.warn('Error en rastreo web:', error);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
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
      distanceInterval: 25,
      timeInterval: 15000,
      deferredUpdatesInterval: 15000,
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
    if (webWatchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchId);
    }
    webWatchId = null;
    webTracking = false;
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
  if (!isReliableCoordinate(coord, last)) return;
  if (distanceMeters(last, coord) < MIN_DISTANCE_METERS) return;

  const queue = await readQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, coord });
  await AsyncStorage.setItem(LAST_COORD_KEY, JSON.stringify(coord));
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



