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
export const ACTIVE_TRIP_ID_KEY = 'guardian_active_trip_id';

const QUEUE_KEY = '@guardian_location_queue';
const LAST_COORD_KEY = '@guardian_last_location_coord';
const MAX_FLUSH_ATTEMPTS = 3;
const MIN_DISTANCE_METERS = 25;

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
    speed: coords.speed,
    recordedAt: new Date(location.timestamp || Date.now()).toISOString(),
  };
}

function isValidCoordinate(coord) {
  return Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude);
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

export async function saveChildSession({ childToken, studentId }) {
  const entries = [];
  if (childToken) entries.push(setStoredValue(CHILD_TOKEN_KEY, childToken));
  if (studentId) entries.push(setStoredValue(CHILD_STUDENT_ID_KEY, studentId));
  await Promise.all(entries);
}

export async function getChildSession() {
  const [childToken, studentId, activeTripId] = await Promise.all([
    getStoredValue(CHILD_TOKEN_KEY),
    getStoredValue(CHILD_STUDENT_ID_KEY),
    getStoredValue(ACTIVE_TRIP_ID_KEY),
  ]);
  return { childToken, studentId, activeTripId };
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
    return { granted: false, reason: 'El rastreo en segundo plano solo está disponible en Android o iOS.' };
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return { granted: false, reason: 'Permite la ubicación mientras usas la app para iniciar el trayecto escolar.' };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) {
    return { granted: false, reason: 'Activa "Permitir siempre" para compartir ubicación durante el trayecto con la app minimizada.' };
  }

  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const notification = await Notifications.requestPermissionsAsync();
    if (notification.status !== 'granted') {
      return { granted: false, reason: 'Permite las notificaciones para mostrar el servicio activo de ubicación.' };
    }
  }

  return { granted: true, reason: '' };
}

export async function isTrackingActive() {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function startBackgroundUpdates(tripId) {
  if (Platform.OS === 'web') {
    throw new Error('El rastreo en segundo plano no está disponible en web.');
  }

  await setStoredValue(ACTIVE_TRIP_ID_KEY, tripId);
  const active = await isTrackingActive();
  if (active) return;

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
}

export async function stopBackgroundUpdates() {
  if (Platform.OS !== 'web') {
    const active = await isTrackingActive();
    if (active) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }
  await removeStoredValue(ACTIVE_TRIP_ID_KEY);
}

export async function enqueueCoordinate(coord) {
  if (!isValidCoordinate(coord)) return;
  const last = await getLastCoordinate();
  if (distanceMeters(last, coord) < MIN_DISTANCE_METERS) return;

  const queue = await readQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, coord });
  await AsyncStorage.setItem(LAST_COORD_KEY, JSON.stringify(coord));
  await writeQueue(queue.slice(-500));
}

export async function flushQueue() {
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
