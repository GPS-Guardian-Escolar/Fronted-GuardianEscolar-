import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@guardian_student_device_id';

function createUuid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getDeviceId() {
  const current = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (current) return current;

  const next = `student-device-${createUuid()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export function getPlatform() {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function getDeviceName() {
  return Device.deviceName || Device.modelName || undefined;
}
